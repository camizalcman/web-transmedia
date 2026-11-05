import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let services = null;

// Firestore con cache persistente (IndexedDB): sin conexion las lecturas salen
// del dispositivo y las escrituras quedan en cola hasta que vuelve la red.
// Si ya estaba inicializado (recarga en caliente de next dev) o el navegador
// no tiene IndexedDB, se usa la instancia comun.
function createFirestore(app) {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}

export function getFirebaseServices() {
  if (!hasFirebaseConfig) return null;
  if (services) return services;

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  services = {
    auth: getAuth(app),
    db: createFirestore(app),
  };

  return services;
}
