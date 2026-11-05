"use client";

import { useSyncExternalStore } from "react";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseServices, hasFirebaseConfig } from "@/lib/firebase";

// Guardado del juego en Firebase. Al entrar se inicia una sesion anonima (o
// la cuenta con la que ya se habia ingresado) y el avance de la
// investigacion se escribe en games/{uid}:
//
// - Expedientes (EXPEDIENTES): los momentos del juego ya completados alguna
//   vez, como booleanos (evidenceOrdered, phoneTaken, phoneUnlocked,
//   contactTalked) y en la lista steps. NO desbloquean el recorrido al
//   recargar (ver storyProgress).
// - solved / lastSolvedAt: la investigacion se resolvio (el pizarron).
// - unknownChat: la conversacion con el numero desconocido.
//
// Sin configuracion de Firebase, o si la nube rechaza el acceso, todo sigue
// funcionando en el navegador (localStorage y memoria) y el indicador dice
// LOCAL. Sin red, Firestore guarda en el dispositivo y sube los cambios al
// volver la conexion (OFFLINE).
//
// Es un modulo con estado propio (como storyProgress): los componentes lo
// leen con useCloudSave() y cualquier parte del juego puede llamar a
// recordStep o saveChat sin pasar props.

const COLLECTION = "games";

// Expedientes de la investigacion, en el orden del recorrido: paso de
// storyProgress, campo en Firestore y nombre que se muestra.
export const CASE_FILES = [
  { step: "photos-ordered", field: "evidenceOrdered", label: "Cámaras ordenadas por hora" },
  { step: "phone-taken", field: "phoneTaken", label: "Celular recuperado del locker" },
  { step: "phone-unlocked", field: "phoneUnlocked", label: "Celular desbloqueado" },
  { step: "contact-talked", field: "contactTalked", label: "Contacto con el número desconocido" },
];
// Resolver el pizarron cierra la investigacion.
const SOLVED_STEP = "school-solved";
const STEP_FIELDS = Object.fromEntries(CASE_FILES.map(({ step, field }) => [step, field]));
// El chat se sube como mucho cada este tiempo (ms) y con los ultimos N mensajes.
const CHAT_DEBOUNCE = 1500;
const CHAT_MAX_MESSAGES = 400;

const INITIAL_STATE = {
  configured: hasFirebaseConfig,
  // Ya se sabe si hay sesion (o no hay Firebase).
  authReady: !hasFirebaseConfig,
  user: null,
  online: true,
  // Metadatos del ultimo snapshot del documento de la partida.
  loaded: false,
  fromCache: false,
  pendingWrites: false,
  // La nube rechazo el acceso (reglas, proveedor deshabilitado, etc.).
  failed: false,
  authLoading: false,
  authError: "",
  game: null,
};

let state = INITIAL_STATE;
const listeners = new Set();
let started = false;
let unsubscribeGame = null;
let queue = [];
let chatTimer = null;
let pendingChat = null;

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeCloud(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCloudState() {
  return state;
}

export function useCloudSave() {
  return useSyncExternalStore(subscribeCloud, getCloudState, () => INITIAL_STATE);
}

// remote: guardado y confirmado en Firestore.
// syncing: hay cambios esperando la confirmacion del servidor.
// offline: sin red; se guarda en el dispositivo y se sube despues.
// connecting: iniciando la sesion.
// local: solo en este navegador (sin Firebase o con la nube rechazando).
export function persistenceStatus(current = state) {
  if (!current.configured || current.failed) return "local";
  if (!current.online) return "offline";
  if (!current.authReady || !current.user || !current.loaded) return "connecting";
  if (current.fromCache) return "offline";
  if (current.pendingWrites) return "syncing";
  return "remote";
}

export function displayName(user) {
  if (!user || user.isAnonymous) return null;
  const profile = user.providerData.find((item) => item.displayName || item.email);
  return user.displayName || profile?.displayName || user.email || profile?.email || "CUENTA";
}

function getProvider(user) {
  if (user.isAnonymous) return "anonymous";
  return user.providerData[0]?.providerId || "password";
}

// El atajo de desarrollo ?final marca todos los pasos de golpe: no cuenta.
function isDevShortcut() {
  return process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("final");
}

function handleError(error, label) {
  console.warn(`Firebase: ${label}.`, error);
  if (error?.code === "permission-denied" || error?.code === "unauthenticated") {
    setState({ failed: true });
  }
}

function write(patch, uid = state.user?.uid) {
  const services = getFirebaseServices();
  const user = state.user;
  if (!services || !user || user.uid !== uid) return Promise.resolve();
  return setDoc(
    doc(services.db, COLLECTION, uid),
    { userId: uid, authProvider: getProvider(user), ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  ).catch((error) => handleError(error, "no se pudo guardar la partida"));
}

// Las escrituras que llegan antes de tener sesion esperan en cola.
function enqueue(patch) {
  if (!state.configured || state.failed) return;
  if (state.user) write(patch);
  else queue.push(patch);
}

async function saveUserProfile(user, db) {
  const userRef = doc(db, "users", user.uid);
  const profile = {
    userId: user.uid,
    email: user.email || null,
    displayName: displayName(user),
    photoURL: user.photoURL || null,
    isAnonymous: user.isAnonymous,
    authProvider: getProvider(user),
    lastLoginAt: serverTimestamp(),
  };
  try {
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) profile.createdAt = serverTimestamp();
  } catch {
    // Sin red no se puede saber si existe: se guarda igual (merge).
  }
  await setDoc(userRef, profile, { merge: true });
}

function watchGame(user, db) {
  unsubscribeGame?.();
  setState({ loaded: false, game: null });
  unsubscribeGame = onSnapshot(
    doc(db, COLLECTION, user.uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      setState({
        loaded: true,
        game: snapshot.exists() ? snapshot.data() : {},
        fromCache: snapshot.metadata.fromCache,
        pendingWrites: snapshot.metadata.hasPendingWrites,
      });
    },
    (error) => handleError(error, "no se pudo leer la partida"),
  );
}

// Se llama una vez al montar la portada (CloudStatus).
export function startCloudSave() {
  if (started || typeof window === "undefined") return;
  started = true;

  const updateOnline = () => setState({ online: navigator.onLine });
  updateOnline();
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);

  if (!hasFirebaseConfig) return;
  const { auth, db } = getFirebaseServices();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      unsubscribeGame?.();
      unsubscribeGame = null;
      setState({ user: null, loaded: false, game: null });
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.warn("Firebase: no se pudo iniciar la sesion anonima.", error);
        setState({ authReady: true, failed: true, authError: error.code || "auth/anonymous-sign-in-failed" });
      }
      return;
    }

    setState({ user, authReady: true, failed: false });
    watchGame(user, db);
    saveUserProfile(user, db).catch((error) => handleError(error, "no se pudo guardar el perfil"));
    const waiting = queue;
    queue = [];
    waiting.forEach((patch) => write(patch, user.uid));
  });
}

// Un paso del recorrido se completo por primera vez en esta visita.
export function recordStep(step) {
  if (typeof window === "undefined" || isDevShortcut()) return;
  // Los pasos internos (phone-ready, phone-returned) no son expedientes.
  if (step === SOLVED_STEP) {
    enqueue({ steps: arrayUnion(step), solved: true, lastSolvedAt: serverTimestamp() });
  } else if (STEP_FIELDS[step]) {
    enqueue({ steps: arrayUnion(step), [STEP_FIELDS[step]]: true });
  }
}

function flushChat() {
  window.clearTimeout(chatTimer);
  chatTimer = null;
  if (!pendingChat) return;
  const chat = pendingChat;
  pendingChat = null;
  enqueue({ unknownChat: { ...chat, messages: chat.messages.slice(-CHAT_MAX_MESSAGES) } });
}

// Conversacion con el numero desconocido (ya guardada en localStorage).
export function saveChat(chat) {
  if (!state.configured || state.failed) return;
  pendingChat = chat;
  window.clearTimeout(chatTimer);
  chatTimer = window.setTimeout(flushChat, CHAT_DEBOUNCE);
}

// Si se cierra la pestaña con el chat pendiente de subir, se sube en el momento.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushChat);
}

// Reiniciar el juego: se borra el chat de la nube (los expedientes y la
// investigacion resuelta quedan). Espera la confirmacion como mucho un par de segundos; sin red la
// escritura queda en cola en el dispositivo igual.
export function clearCloudChat() {
  window.clearTimeout(chatTimer);
  chatTimer = null;
  pendingChat = null;
  if (!state.user || state.failed) return Promise.resolve();
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 2500));
  return Promise.race([write({ unknownChat: deleteField() }), timeout]);
}

// --- Acceso ---------------------------------------------------------------

async function runAuth(action, fallbackCode) {
  setState({ authLoading: true, authError: "" });
  try {
    await action(getFirebaseServices().auth);
    // Al vincular una cuenta el uid no cambia y onAuthStateChanged no avisa:
    // se actualiza a mano para que se vea el nombre nuevo.
    const { auth, db } = getFirebaseServices();
    if (auth.currentUser) {
      setState({ user: auth.currentUser, failed: false });
      saveUserProfile(auth.currentUser, db).catch((error) => handleError(error, "no se pudo guardar el perfil"));
    }
  } catch (error) {
    setState({ authError: error.code || fallbackCode });
    throw error;
  } finally {
    setState({ authLoading: false });
  }
}

// Desde una sesion anonima se VINCULA la cuenta: el uid es el mismo y la
// partida guardada sigue ahi. Si esa cuenta ya existia, se entra a ella.
export function signInWithGoogle() {
  return runAuth(async (auth) => {
    const provider = new GoogleAuthProvider();
    if (!auth.currentUser?.isAnonymous) {
      await signInWithPopup(auth, provider);
      return;
    }
    try {
      await linkWithPopup(auth.currentUser, provider);
    } catch (error) {
      const credential = GoogleAuthProvider.credentialFromError(error);
      if (error.code !== "auth/credential-already-in-use" || !credential) throw error;
      await signInWithCredential(auth, credential);
    }
  }, "auth/google-sign-in-failed");
}

export function submitEmail({ email, password, mode }) {
  return runAuth(async (auth) => {
    if (mode !== "signup") {
      await signInWithEmailAndPassword(auth, email, password);
    } else if (auth.currentUser?.isAnonymous) {
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  }, "auth/email-sign-in-failed");
}

// Cierra la cuenta y vuelve a una sesion anonima nueva.
export function continueAsGuest() {
  return runAuth((auth) => signOut(auth), "auth/sign-out-failed");
}

export function clearAuthError() {
  setState({ authError: "" });
}
