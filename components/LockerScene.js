"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MODEL_URL as PHONE_MODEL_URL, disposeObject } from "@/components/PhoneModel";

const LOCKER_URL = "/models/school_locker.glb";
const PADLOCK_URL = "/models/combination_padlock.glb";
const BACKGROUND = 0x050605;
// Alto real del iPhone 13 Pro Max, en metros (el locker ya esta en metros).
const PHONE_HEIGHT = 0.16;
// Angulo de apertura maximo: el mismo que trae la puerta mas abierta del modelo.
const DOOR_OPEN_ANGLE = 1.85;
// Manija de la puerta (medida sobre la geometria del modelo): distancia desde
// la bisagra, altura y espesor de la puerta hacia afuera.
const HANDLE = { along: 0.373, height: 1.1, front: 0.032 };
// Candado: ancho real del cuerpo (4,5 cm) y medidas del modelo, en sus unidades
// (`focusY`: altura a la que apunta la camara, debajo de las ruedas para que
// el candado quede arriba del panel del codigo).
const PADLOCK_WIDTH = 0.045;
const PADLOCK_MODEL = { width: 2.692, shackleTop: 5.13, axisX: 0.9, focusY: 1.1 };
// Cada numero de una rueda ocupa 36°; con la rueda en 0° la marca lee "0".
const DIAL_STEP = (Math.PI * 2) / 10;
// Cuanto sube el arco al abrir (unidades del modelo) para liberar la pata corta.
const SHACKLE_LIFT = 0.8;

// Objetos dentro de los otros lockers. Cada uno indica:
// - model: clave de PROP_URLS (un modelo se puede repetir).
// - locker: 0 a 4, de izquierda a derecha vistos de frente (el 2 es el del celular).
// - level: 0 = piso del locker, 1 = estante del medio, 2 = estante de arriba.
// - width: medida real en metros de su lado horizontal mas largo.
// - turn: giro sobre si mismo (radianes); shift: corrimiento [fondo-frente, lado] en metros.
const PROP_URLS = {
  oldBooks: "/models/old_books.glb",
  strappedBooks: "/models/textured_books_1k.glb",
  stationery: "/models/stationery_pencil_pen_and_eraser_lowpoly.glb",
  ruler: "/models/ruler.glb",
};
const LOCKER_PROPS = [
  { model: "oldBooks", locker: 0, level: 1, width: 0.34, turn: 0.35 },
  { model: "strappedBooks", locker: 1, level: 1, width: 0.28, turn: 1.9 },
  { model: "stationery", locker: 3, level: 1, width: 0.17, turn: -0.6, shift: [0.05, 0.03] },
  { model: "ruler", locker: 4, level: 0, width: 0.3, turn: 0.25, shift: [0.03, 0] },
];

// Hoja con las cuentas que dan el codigo del candado: pegada con cinta en el
// fondo de un locker, a cierta altura sobre un estante. Medidas en metros.
const NOTE = { locker: 3, level: 1, height: 0.3, width: 0.15, tilt: 0.07 };

// Escena de los lockers. Las puertas se abren y cierran con un clic. El
// locker del medio tiene un candado de combinacion y adentro esta el celular.
// - Al tocar el candado (o esa puerta) la camara se acerca y se llama a
//   `onLockSelect`; `lockOpen` indica que el panel del codigo esta abierto y
//   `digits` los numeros elegidos, que giran las ruedas. Tocar una rueda llama
//   a `onDialStep(indice)`. Cada cambio de `shake` sacude el candado (codigo
//   incorrecto) y `unlocked` lo abre; al terminar se llama a `onUnlockDone`.
// - Al tocar el celular la camara se acerca y se llama a `onPhoneSelect`.
//   Mientras `phoneOpen` es true no se renderiza.
// - Al tocar la hoja (con las lineas de `noteLines`, escritas con la familia
//   `handFont`) la camara se acerca para leerla; otro clic la aleja.
// Al cerrarse el panel o la vista del celular la camara vuelve a alejarse.
export default function LockerScene({
  phoneOpen,
  onPhoneSelect,
  lockOpen,
  digits,
  shake,
  unlocked,
  onLockSelect,
  onDialStep,
  onUnlockDone,
  noteLines,
  handFont,
}) {
  const mountRef = useRef(null);
  const propsRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("loading");

  // El loop de animacion lee siempre los valores mas recientes.
  useEffect(() => {
    propsRef.current = {
      phoneOpen,
      onPhoneSelect,
      lockOpen,
      digits,
      shake,
      unlocked,
      onLockSelect,
      onDialStep,
      onUnlockDone,
      noteLines,
      handFont,
    };
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frameId;
    const doors = [];
    let phone = null;
    let padlock = null;
    let note = null;
    let lockers = null;
    let flight = null;
    // Objeto al que se acerco la camara: "phone", "lock", "note" o null. Al
    // llegar al celular o al candado se espera a que React abra su vista
    // (`waitingOpen`) antes de tomar su cierre como señal para volver.
    let focused = null;
    let waitingOpen = false;
    let returnView = null;
    let framedBox = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    scene.fog = new THREE.Fog(BACKGROUND, 3.5, 9);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.02, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.domElement.className = "locker-webgl";
    mount.append(renderer.domElement);

    // Entorno tenue para que el metal de los lockers y del celular tenga reflejos.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.25;

    scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x120c0c, 0.35));
    // Luz de pasillo: un foco desde arriba y adelante que proyecta sombras.
    const ceiling = new THREE.SpotLight(0xfff1dc, 40, 0, 0.75, 0.6, 2);
    ceiling.position.set(0, 3.2, 2.2);
    ceiling.castShadow = true;
    ceiling.shadow.mapSize.set(2048, 2048);
    ceiling.shadow.bias = -0.0004;
    scene.add(ceiling, ceiling.target);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.6;
    // Solo se recorre el frente de los lockers.
    controls.minAzimuthAngle = -0.8;
    controls.maxAzimuthAngle = 0.8;
    controls.minPolarAngle = 1.0;
    controls.maxPolarAngle = 1.72;

    const wrapper = new THREE.Group();
    scene.add(wrapper);

    function resize() {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      if (framedBox && !flight && !focused) frame(framedBox);
    }

    // Ubica la camara para que la fila de lockers entre completa en pantalla.
    // En pantallas verticales se encuadra el locker del medio (la fila entera
    // quedaria diminuta) y se recorre el resto girando.
    function frame(box) {
      framedBox = box;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const width = camera.aspect < 1 ? Math.min(size.x, 0.9) : size.x;
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const fitHeight = size.y / 2 / Math.tan(halfFov);
      const fitWidth = width / 2 / (Math.tan(halfFov) * camera.aspect);
      const distance = Math.max(fitHeight, fitWidth) * 1.3 + size.z / 2;

      controls.target.set(center.x, center.y, center.z);
      camera.position.set(center.x, center.y + 0.15, center.z + distance);
      controls.minDistance = 0.55;
      controls.maxDistance = distance * 1.25;
      controls.update();
      // La niebla arranca detras de los lockers, sea cual sea la distancia.
      scene.fog.near = distance;
      scene.fog.far = distance + 4;
    }

    const loader = new GLTFLoader();
    const loaded = [0, 0, 0];
    const trackProgress = (slot) => (event) => {
      if (!event.lengthComputable) return;
      loaded[slot] = event.loaded / event.total;
      setProgress(Math.round(((loaded[0] + loaded[1] + loaded[2]) / 3) * 100));
    };

    Promise.all([
      loader.loadAsync(LOCKER_URL, trackProgress(0)),
      loader.loadAsync(PHONE_MODEL_URL, trackProgress(1)),
      loader.loadAsync(PADLOCK_URL, trackProgress(2)),
    ])
      .then(([lockerGltf, phoneGltf, padlockGltf]) => {
        if (disposed) {
          [lockerGltf, phoneGltf, padlockGltf].forEach((gltf) => disposeObject(gltf.scene));
          return;
        }
        const built = buildLockers(lockerGltf.scene, doors);
        const { middle } = built;
        lockers = built.lockers;
        // En el modelo el frente mira hacia +X: se gira para que quede de cara a la camara.
        wrapper.rotation.y = -Math.PI / 2;
        wrapper.add(lockers);

        phone = buildPhone(phoneGltf.scene);
        placePhone(phone, middle);
        lockers.add(phone);

        // Luz roja tenue detras del celular: tiñe el fondo del locker y el
        // celular tapa el reflejo directo del foco.
        const glow = new THREE.PointLight(0xff3030, 0.25, 0.6, 2);
        glow.position.set(middle.box.min.x + 0.05, middle.shelfTop + 0.09, middle.center.z);
        lockers.add(glow);

        const middleDoor = doors.find((door) => door.body === middle);
        if (middleDoor) {
          padlock = buildPadlock(padlockGltf.scene);
          padlock.door = middleDoor;
          padlock.floorY = built.floorY;
          hangPadlock(padlock, middleDoor);
          middleDoor.locked = true;
        } else {
          disposeObject(padlockGltf.scene);
        }

        const noteBody = built.bodies[NOTE.locker];
        if (noteBody?.backX !== undefined) {
          const { noteLines, handFont } = propsRef.current;
          note = buildNote(noteLines ?? [], handFont, renderer.capabilities.getMaxAnisotropy());
          placeNote(note, noteBody);
          lockers.add(note);
        }

        // Los objetos de los otros lockers se cargan aparte: la escena ya se
        // puede usar mientras tanto.
        loadProps(loader, built.bodies)
          .then((props) => {
            if (disposed) props.forEach(disposeObject);
            else props.forEach((prop) => lockers.add(prop));
          })
          .catch((error) => console.error("No se pudieron cargar los objetos de los lockers.", error));

        scene.updateMatrixWorld(true);
        const bodiesBox = new THREE.Box3();
        doors.forEach((door) => bodiesBox.expandByObject(door.body.mesh));
        frame(bodiesBox);
        setStatus("ready");
      })
      .catch((error) => {
        console.error("No se pudieron cargar los modelos de los lockers.", error);
        if (!disposed) setStatus("error");
      });

    // Interaccion: un clic (sin arrastrar) abre o cierra la puerta tocada. La
    // puerta con candado no se abre: la camara viaja hasta el candado. Con la
    // camara en el candado, tocar una rueda la avanza un numero.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt = null;

    function pick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const targets = doors.map((door) => door.mesh);
      if (phone) targets.push(phone);
      if (padlock?.state === "locked") targets.push(padlock.group);
      if (note) targets.push(note);
      const [hit] = raycaster.intersectObjects(targets, true);
      if (!hit) return null;
      const door = doors.find((item) => item.mesh === hit.object);
      if (door) return { door };
      if (padlock && isDescendant(hit.object, padlock.group)) {
        const dial = padlock.dials.indexOf(hit.object);
        return dial >= 0 ? { padlock: true, dial } : { padlock: true };
      }
      if (hit.object === note) return { note: true };
      return { phone: true };
    }

    function handleDown(event) {
      downAt = { x: event.clientX, y: event.clientY };
    }

    function handleUp(event) {
      const start = downAt;
      downAt = null;
      if (!start || flight || focused === "phone") return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
      // Leyendo la hoja, cualquier clic vuelve.
      if (focused === "note") {
        flyBack();
        return;
      }
      const hit = pick(event);
      if (focused === "lock") {
        if (hit?.dial !== undefined) propsRef.current.onDialStep?.(hit.dial);
        return;
      }
      if (hit?.padlock || hit?.door?.locked) {
        flyToLock();
      } else if (hit?.door) {
        const door = hit.door;
        door.target = door.target ? 0 : door.openSign * DOOR_OPEN_ANGLE;
      } else if (hit?.note) {
        flyToNote();
      } else if (hit?.phone) {
        flyToPhone();
      }
    }

    function handleMove(event) {
      if (flight || focused === "phone") return;
      if (focused === "note") {
        renderer.domElement.style.cursor = "zoom-out";
        return;
      }
      const hit = pick(event);
      const clickable = focused === "lock" ? hit?.dial !== undefined : Boolean(hit);
      renderer.domElement.style.cursor = clickable ? "pointer" : "grab";
    }

    function flyTo(name, position, target, onArrive) {
      if (!focused) {
        returnView = { position: camera.position.clone(), target: controls.target.clone() };
      }
      startFlight(position, target, () => {
        focused = name;
        waitingOpen = true;
        onArrive();
      });
    }

    function flyToPhone() {
      const focus = phone.getWorldPosition(new THREE.Vector3());
      focus.y += PHONE_HEIGHT / 2;
      flyTo("phone", focus.clone().add(new THREE.Vector3(0, 0.04, 0.42)), focus, () =>
        propsRef.current.onPhoneSelect?.(),
      );
    }

    // Se mira el candado de frente a las ruedas (donde esta la marca que
    // indica el numero), un poco desde adelante para ver tambien el cuerpo.
    function flyToLock() {
      const { model } = padlock;
      model.updateWorldMatrix(true, false);
      const focus = model.localToWorld(new THREE.Vector3(PADLOCK_MODEL.axisX, PADLOCK_MODEL.focusY, 0));
      const reading = new THREE.Vector3(1, 0, 0).transformDirection(model.matrixWorld);
      const direction = reading.add(new THREE.Vector3(0, 0.15, 0.6)).normalize();
      const distance = camera.aspect < 1 ? 0.42 : 0.3;
      flyTo("lock", focus.clone().addScaledVector(direction, distance), focus, () =>
        propsRef.current.onLockSelect?.(),
      );
    }

    // De frente a la hoja, a una distancia en la que se lee entera.
    function flyToNote() {
      note.updateWorldMatrix(true, false);
      const focus = note.getWorldPosition(new THREE.Vector3());
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(note.matrixWorld);
      const distance = camera.aspect < 1 ? 0.64 : 0.4;
      flyTo("note", focus.clone().addScaledVector(normal, distance), focus, () => {
        waitingOpen = false;
      });
    }

    function flyBack() {
      focused = null;
      startFlight(returnView.position, returnView.target, () => {
        controls.enabled = true;
      });
    }

    function startFlight(position, target, onDone) {
      controls.enabled = false;
      flight = {
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        position,
        target,
        t: 0,
        onDone,
      };
    }

    function updateFlight(delta) {
      flight.t = Math.min(flight.t + delta / 1.2, 1);
      const eased = flight.t < 0.5 ? 4 * flight.t ** 3 : 1 - (-2 * flight.t + 2) ** 3 / 2;
      camera.position.lerpVectors(flight.fromPosition, flight.position, eased);
      controls.target.lerpVectors(flight.fromTarget, flight.target, eased);
      camera.lookAt(controls.target);
      if (flight.t === 1) {
        const { onDone } = flight;
        flight = null;
        onDone();
      }
    }

    const timer = new THREE.Timer();
    timer.connect(document);

    // Ruedas, sacudida y apertura del candado.
    function updatePadlock(delta) {
      const props = propsRef.current;
      const ease = 1 - Math.exp(-delta * 12);
      padlock.dials.forEach((dial, index) => {
        const goal = -(props.digits?.[index] ?? 0) * DIAL_STEP;
        // Gira por el camino mas corto (de 9 a 0 avanza un paso, no da la vuelta).
        const diff = Math.atan2(Math.sin(goal - dial.rotation.y), Math.cos(goal - dial.rotation.y));
        dial.rotation.y += diff * ease;
      });

      const { door } = padlock;
      if (props.shake !== padlock.shakeSeen) {
        padlock.shakeSeen = props.shake;
        if (padlock.state === "locked") padlock.shakeTime = 0.6;
      }
      if (padlock.shakeTime > 0) {
        padlock.shakeTime = Math.max(padlock.shakeTime - delta, 0);
        const wobble = Math.sin(padlock.shakeTime * 45) * padlock.shakeTime;
        padlock.group.rotation.x = wobble * 0.6;
        // La puerta golpea contra el candado: se abre apenas y vuelve.
        door.pivot.rotation.y = door.angle + door.openSign * Math.abs(wobble) * 0.02;
      }

      if (props.unlocked && padlock.state === "locked") {
        padlock.state = "opening";
        padlock.time = 0;
      }
      if (padlock.state === "opening") {
        padlock.time += delta;
        const lift = THREE.MathUtils.smoothstep(padlock.time, 0, 0.45);
        const turn = THREE.MathUtils.smoothstep(padlock.time, 0.45, 0.95);
        padlock.shackle.position.y = lift * SHACKLE_LIFT;
        padlock.shackle.rotation.y = turn * Math.PI * 0.6;
        if (padlock.time > 1.3) {
          // El candado se suelta y cae; la puerta queda libre y se abre.
          padlock.state = "falling";
          padlock.velocity = 0;
          lockers.attach(padlock.group);
          padlock.fallFrom = padlock.group.position.y;
          door.locked = false;
          door.target = door.openSign * DOOR_OPEN_ANGLE;
          props.onUnlockDone?.();
        }
      }
      if (padlock.state === "falling") {
        const restY = padlock.floorY + 0.012;
        padlock.velocity += 9.8 * delta;
        const y = Math.max(padlock.group.position.y - padlock.velocity * delta, restY);
        padlock.group.position.y = y;
        // Mientras cae se va acostando hasta quedar de lado en el piso.
        const fallen = 1 - (y - restY) / Math.max(padlock.fallFrom - restY, 0.001);
        padlock.group.rotation.x = fallen * (Math.PI / 2);
        if (y === restY) padlock.state = "done";
      }
    }

    function animate(timestamp) {
      frameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const props = propsRef.current;
      // Con la vista del celular abierta la escena queda congelada detras.
      if (props.phoneOpen) {
        waitingOpen = false;
        return;
      }
      if (focused && focused !== "note" && !flight) {
        if (focused === "lock" && props.lockOpen) waitingOpen = false;
        else if (!waitingOpen) flyBack();
      }
      const delta = Math.min(timer.getDelta(), 0.1);
      const ease = 1 - Math.exp(-delta * 5);
      doors.forEach((door) => {
        door.angle += (door.target - door.angle) * ease;
        door.pivot.rotation.y = door.angle;
      });
      if (padlock) updatePadlock(delta);
      if (flight) updateFlight(delta);
      // Con la camara en el candado o el celular los controles quedan quietos
      // (si no, su distancia minima la empujaria hacia atras).
      else if (!focused) controls.update();
      renderer.render(scene, camera);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    renderer.domElement.addEventListener("pointerdown", handleDown);
    renderer.domElement.addEventListener("pointerup", handleUp);
    renderer.domElement.addEventListener("pointermove", handleMove);
    resize();
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handleDown);
      renderer.domElement.removeEventListener("pointerup", handleUp);
      renderer.domElement.removeEventListener("pointermove", handleMove);
      controls.dispose();
      disposeObject(wrapper);
      timer.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="locker-stage">
      <div
        ref={mountRef}
        className="locker-canvas"
        role="group"
        aria-label="Lockers 3D. Tocá una puerta para abrirla o cerrarla."
      />
      {status !== "ready" && (
        <p className="phone-status" role="status">
          {status === "error" ? "NO SE PUDIERON CARGAR LOS MODELOS" : `CARGANDO… ${progress}%`}
        </p>
      )}
    </div>
  );
}

// El modelo trae los cinco lockers fusionados en una sola malla. Esa malla
// esta hecha de piezas sueltas (cuerpos, puertas y estantes que no comparten
// vertices), asi que se separa en piezas y cada puerta pasa a girar sobre su
// propia bisagra. Devuelve el grupo armado y el locker del medio.
function buildLockers(source, doors) {
  source.updateMatrixWorld(true);
  const lockers = new THREE.Group();
  const bodies = [];
  const shelves = [];
  const doorMeshes = [];
  let floorY = null;

  source.traverse((child) => {
    if (!child.isMesh) return;
    // Se "hornea" la transformacion de la jerarquia de Sketchfab en la
    // geometria: asi todo queda en metros, con Y hacia arriba.
    const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
    child.geometry.dispose();
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());

    // El piso es un plano sin espesor: queda tal cual.
    if (size.y < 0.001) {
      const floor = new THREE.Mesh(geometry, child.material);
      floor.receiveShadow = true;
      lockers.add(floor);
      floorY = geometry.boundingBox.min.y;
      return;
    }

    for (const part of splitConnectedParts(geometry)) {
      const mesh = new THREE.Mesh(part, child.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      part.computeBoundingBox();
      const box = part.boundingBox;
      const partSize = box.getSize(new THREE.Vector3());
      const print = footprint(part);
      if (partSize.y < partSize.x * 0.2) {
        shelves.push(box);
        lockers.add(mesh);
      } else if (print.halfWidth < print.halfLength * 0.3) {
        doorMeshes.push({ mesh, print });
      } else {
        bodies.push({ mesh, box, center: box.getCenter(new THREE.Vector3()) });
        lockers.add(mesh);
      }
    }
    geometry.dispose();
  });

  // De izquierda a derecha vistos de frente (en el modelo, de +Z a -Z).
  bodies.sort((a, b) => b.center.z - a.center.z);
  const raycaster = new THREE.Raycaster();
  bodies.forEach((body) => {
    const own = shelves
      .filter((box) => body.box.containsPoint(box.getCenter(new THREE.Vector3())))
      .sort((a, b) => a.max.y - b.max.y);
    body.shelfTop = own.length ? own[0].max.y : body.box.min.y;
    // Piso interior: un rayo hacia abajo desde debajo del primer estante.
    const start = (own[0]?.min.y ?? body.box.max.y) - 0.01;
    raycaster.set(new THREE.Vector3(body.center.x, start, body.center.z), new THREE.Vector3(0, -1, 0));
    const [floor] = raycaster.intersectObject(body.mesh);
    // Alturas donde se pueden apoyar objetos: piso y estantes, de abajo hacia arriba.
    body.levels = [floor ? floor.point.y : body.box.min.y, ...own.map((box) => box.max.y)];
    // Pared del fondo (por dentro), a la altura del compartimento del medio.
    raycaster.set(
      new THREE.Vector3(body.center.x, body.levels[1] + 0.3, body.center.z),
      new THREE.Vector3(-1, 0, 0),
    );
    const [back] = raycaster.intersectObject(body.mesh);
    body.backX = back?.point.x;
  });

  for (const { mesh, print } of doorMeshes) {
    const body = bodies.reduce((best, item) =>
      item.center.distanceTo(mesh.geometry.boundingBox.getCenter(new THREE.Vector3())) <
      best.center.distanceTo(mesh.geometry.boundingBox.getCenter(new THREE.Vector3()))
        ? item
        : best,
    );
    doors.push(rigDoor(mesh, print, body));
    lockers.add(doors.at(-1).pivot);
  }

  // Apoya los lockers en y = 0 y centra la fila en el origen.
  const box = new THREE.Box3();
  bodies.forEach((body) => box.union(body.box));
  const center = box.getCenter(new THREE.Vector3());
  lockers.position.set(-center.x, -box.min.y, -center.z);

  return {
    lockers,
    bodies,
    middle: bodies[Math.floor(bodies.length / 2)],
    floorY: floorY ?? box.min.y,
  };
}

// Carga los modelos de LOCKER_PROPS (cada archivo una sola vez) y devuelve
// los objetos ya ubicados en sus lockers.
async function loadProps(loader, bodies) {
  const keys = [...new Set(LOCKER_PROPS.map((item) => item.model))];
  const scenes = await Promise.all(keys.map((key) => loader.loadAsync(PROP_URLS[key])));
  const sources = Object.fromEntries(keys.map((key, i) => [key, scenes[i].scene]));
  const used = new Set();
  return LOCKER_PROPS.filter((item) => bodies[item.locker]?.levels[item.level] !== undefined).map((item) => {
    // La primera vez se usa el original; las siguientes, una copia (comparten geometria y texturas).
    const source = used.has(item.model) ? sources[item.model].clone(true) : sources[item.model];
    used.add(item.model);
    return placeProp(source, bodies[item.locker], item);
  });
}

// Escala el modelo a su medida real, lo apoya en el nivel indicado y lo
// centra en el locker (con el giro y el corrimiento pedidos).
function placeProp(source, body, { level, width, turn = 0, shift = [0, 0] }) {
  const prop = new THREE.Group();
  prop.add(source);
  source.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  source.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  source.traverse((child) => {
    if (child.isMesh) child.castShadow = child.receiveShadow = true;
  });

  prop.scale.setScalar(width / Math.max(size.x, size.z));
  prop.rotation.y = turn;
  prop.position.set(body.center.x + shift[0], body.levels[level], body.center.z + shift[1]);
  return prop;
}

// Las puertas del modelo vienen entreabiertas, cada una en un angulo
// distinto. Se busca la bisagra (el extremo de la puerta mas cercano a una
// esquina del frente de su locker), se lleva la puerta a la posicion cerrada
// y se cuelga de un grupo ubicado en la bisagra: girar ese grupo abre la puerta.
function rigDoor(mesh, print, body) {
  const { center, axis, halfLength } = print;
  const ends = [
    center.clone().addScaledVector(axis, halfLength),
    center.clone().addScaledVector(axis, -halfLength),
  ];
  // El frente del locker es su cara +X; sus esquinas, los dos extremos en Z.
  const corners = [
    new THREE.Vector2(body.box.max.x, body.box.min.z),
    new THREE.Vector2(body.box.max.x, body.box.max.z),
  ];
  let best = null;
  for (const end of ends) {
    for (const corner of corners) {
      const distance = end.distanceTo(corner);
      if (!best || distance < best.distance) best = { end, corner, distance };
    }
  }
  const hinge = best.end;
  // Cerrada, la puerta va desde la bisagra hacia la otra esquina del frente.
  const closed = new THREE.Vector2(0, Math.sign(body.center.z - best.corner.y));
  const current = center.clone().sub(hinge).normalize();
  // Angulo (sobre Y) que lleva la direccion cerrada a la actual.
  const angle = Math.atan2(closed.y * current.x - closed.x * current.y, closed.dot(current));

  mesh.geometry.translate(-hinge.x, 0, -hinge.y);
  mesh.geometry.rotateY(-angle);
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();

  const pivot = new THREE.Group();
  pivot.position.set(hinge.x, 0, hinge.y);
  pivot.add(mesh);
  // Todas abren hacia afuera: el sentido es el mismo en que venian abiertas.
  // `closedSign` es hacia donde se extiende la puerta cerrada (en Z) desde la bisagra.
  return {
    mesh,
    pivot,
    body,
    angle: 0,
    target: 0,
    openSign: Math.sign(angle) || 1,
    closedSign: closed.y,
    locked: false,
  };
}

// Prepara el candado de combinacion a escala real. Las tres ruedas y el arco
// vienen como piezas separadas: se les mueve el eje de giro al eje del arco
// (la pata larga, que atraviesa las ruedas) para poder girarlas.
function buildPadlock(source) {
  const scale = PADLOCK_WIDTH / PADLOCK_MODEL.width;
  const axisPiece = (name) => {
    const mesh = source.getObjectByName(name)?.children.find((child) => child.isMesh);
    if (!mesh) return null;
    mesh.geometry.translate(-PADLOCK_MODEL.axisX, 0, 0);
    mesh.position.x += PADLOCK_MODEL.axisX;
    return mesh;
  };
  // De arriba hacia abajo: primer, segundo y tercer numero del codigo.
  const dials = ["FirstGear", "SecondGear", "ThirdGear"].map(axisPiece);
  const shackle = axisPiece("Metal_Piece");
  source.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  // `model` lleva la escala y la orientacion; `group` es el punto del que
  // cuelga (el interior del arco), asi el balanceo gira alrededor de ese punto.
  const model = new THREE.Group();
  model.add(source);
  model.scale.setScalar(scale);
  model.position.y = -PADLOCK_MODEL.shackleTop * scale;
  // Girado 45°: se ve el frente del candado y tambien las ruedas con sus numeros.
  model.rotation.y = Math.PI / 4;
  const group = new THREE.Group();
  group.add(model);

  return { group, model, dials, shackle, state: "locked", shakeTime: 0, shakeSeen: undefined };
}

// Cuelga el candado de la manija de la puerta (como hijo de su bisagra, asi
// acompaña a la puerta si se mueve).
function hangPadlock(padlock, door) {
  // Lo que sobresale del candado hacia atras desde su eje, ya girado 45°.
  const back = (PADLOCK_WIDTH / 2) * Math.SQRT1_2 + 0.006;
  padlock.group.position.set(HANDLE.front + back, HANDLE.height, door.closedSign * HANDLE.along);
  door.pivot.add(padlock.group);
}

// Hoja de cuaderno con las cuentas escritas a mano, dibujada en un canvas.
function buildNote(lines, fontFamily, anisotropy) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  drawNote(canvas, lines, "cursive");
  // Se redibuja cuando termina de cargar la letra manuscrita.
  if (fontFamily) {
    document.fonts
      .load(`600 120px ${fontFamily}`)
      .then(() => {
        drawNote(canvas, lines, fontFamily);
        texture.needsUpdate = true;
      })
      .catch(() => {});
  }

  const height = NOTE.width * (canvas.height / canvas.width);
  const note = new THREE.Mesh(
    new THREE.PlaneGeometry(NOTE.width, height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }),
  );
  note.receiveShadow = true;
  return note;
}

function drawNote(canvas, lines, fontFamily) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  // Papel apenas amarillento, mas oscuro en los bordes.
  context.fillStyle = "#efe9da";
  context.fillRect(0, 0, width, height);
  const aged = context.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.75);
  aged.addColorStop(0, "rgba(0,0,0,0)");
  aged.addColorStop(1, "rgba(120,90,40,0.22)");
  context.fillStyle = aged;
  context.fillRect(0, 0, width, height);
  // Renglones y margen.
  context.lineWidth = 2;
  context.strokeStyle = "rgba(70,110,180,0.35)";
  for (let y = 170; y < height; y += 74) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.strokeStyle = "rgba(200,60,60,0.45)";
  context.beginPath();
  context.moveTo(110, 0);
  context.lineTo(110, height);
  context.stroke();
  // Cinta en el borde de arriba.
  context.fillStyle = "rgba(235,228,200,0.75)";
  context.save();
  context.translate(width / 2, 22);
  context.rotate(-0.04);
  context.fillRect(-120, -34, 240, 68);
  context.restore();
  // Las cuentas, una debajo de la otra, cada una un poco torcida.
  context.fillStyle = "#1f2b5e";
  context.font = `600 132px ${fontFamily}`;
  context.textBaseline = "alphabetic";
  lines.forEach((line, index) => {
    context.save();
    context.translate(190 + (index % 2) * 18, 380 + index * 222);
    context.rotate(index % 2 ? 0.03 : -0.035);
    context.fillText(line, 0, 0);
    context.restore();
  });
}

// Pegada en el fondo del locker, apenas despegada de la pared y torcida.
function placeNote(note, body) {
  note.position.set(body.backX + 0.003, body.levels[NOTE.level] + NOTE.height, body.center.z);
  note.rotation.set(0, Math.PI / 2, NOTE.tilt);
}

function isDescendant(object, ancestor) {
  for (let node = object; node; node = node.parent) {
    if (node === ancestor) return true;
  }
  return false;
}

// Rectangulo de area minima que contiene la planta (X, Z) de una pieza.
// Para una puerta da su ancho (largo) y su espesor (ancho) y hacia donde mira.
function footprint(geometry) {
  const position = geometry.attributes.position;
  let best = null;
  for (let degrees = 0; degrees < 180; degrees += 0.25) {
    const radians = THREE.MathUtils.degToRad(degrees);
    const ux = Math.cos(radians);
    const uz = Math.sin(radians);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const u = x * ux + z * uz;
      const v = -x * uz + z * ux;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (!best || area < best.area) best = { area, ux, uz, minU, maxU, minV, maxV };
  }
  const { ux, uz, minU, maxU, minV, maxV } = best;
  const cu = (minU + maxU) / 2;
  const cv = (minV + maxV) / 2;
  const center = new THREE.Vector2(cu * ux - cv * uz, cu * uz + cv * ux);
  const alongU = maxU - minU >= maxV - minV;
  return {
    center,
    axis: alongU ? new THREE.Vector2(ux, uz) : new THREE.Vector2(-uz, ux),
    halfLength: Math.max(maxU - minU, maxV - minV) / 2,
    halfWidth: Math.min(maxU - minU, maxV - minV) / 2,
  };
}

// Separa una geometria indexada en sus piezas conectadas (grupos de
// triangulos que comparten vertices). Los vertices duplicados por tener otra
// normal o UV se consideran el mismo si estan en la misma posicion.
function splitConnectedParts(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const keys = new Map();
  const vertexId = new Uint32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    const key = `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
    if (!keys.has(key)) keys.set(key, keys.size);
    vertexId[i] = keys.get(key);
  }
  const parent = Array.from({ length: keys.size }, (_, i) => i);
  const find = (id) => (parent[id] === id ? id : (parent[id] = find(parent[id])));
  for (let i = 0; i < index.count; i += 3) {
    const a = find(vertexId[index.getX(i)]);
    const b = find(vertexId[index.getX(i + 1)]);
    const c = find(vertexId[index.getX(i + 2)]);
    parent[a] = b;
    parent[find(b)] = find(c);
  }
  const parts = new Map();
  for (let i = 0; i < index.count; i += 3) {
    const root = find(vertexId[index.getX(i)]);
    if (!parts.has(root)) parts.set(root, []);
    parts.get(root).push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  return [...parts.values()].map((indices) => extractPart(geometry, indices));
}

// Arma una geometria nueva solo con los vertices que usan esos triangulos.
function extractPart(source, indices) {
  const remap = new Map();
  const newIndex = indices.map((i) => {
    if (!remap.has(i)) remap.set(i, remap.size);
    return remap.get(i);
  });
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const { itemSize } = attribute;
    const array = new Float32Array(remap.size * itemSize);
    const getters = ["getX", "getY", "getZ", "getW"].slice(0, itemSize);
    for (const [from, to] of remap) {
      getters.forEach((getter, c) => {
        array[to * itemSize + c] = attribute[getter](from);
      });
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }
  geometry.setIndex(newIndex);
  return geometry;
}

// Prepara el celular a escala real, con la pantalla encendida.
function buildPhone(source) {
  const screen = source.getObjectByName("Body_Wallpaper_0");
  if (screen?.material && "emissive" in screen.material) {
    screen.material.emissive.set(0xffffff);
    screen.material.emissiveMap = screen.material.map;
    screen.material.emissiveIntensity = 0.9;
  }
  source.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  const scale = PHONE_HEIGHT / size.y;
  source.scale.setScalar(scale);
  // La pantalla del modelo mira hacia -Z: se gira para que mire al frente del locker (+X).
  source.rotation.y = -Math.PI / 2;
  // Se centra con la base del celular en el origen del grupo.
  const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
  const offset = new THREE.Vector3(center.x, box.min.y * scale, center.z).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    -Math.PI / 2,
  );
  source.position.copy(offset).negate();

  const phone = new THREE.Group();
  phone.add(source);
  return phone;
}

// Parado sobre el estante, apoyado contra el fondo del locker.
function placePhone(phone, body) {
  phone.position.set(body.box.min.x + 0.09, body.shelfTop, body.center.z);
  phone.rotation.z = 0.22;
}
