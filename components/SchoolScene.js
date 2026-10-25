"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { disposeObject } from "@/components/PhoneModel";
import { groupStrokes, recognizeSequence } from "@/lib/shapeRecognizer";
import { ESCAPE_MESSAGE, SYMBOL_SEQUENCE } from "@/data/dimension";

const HALLWAY_URL = "/models/school_hallway.glb";
const CLASSROOM_URL = "/models/japanese_classroom.glb";

// Navegacion en primera persona (metros y segundos).
const EYE_HEIGHT = 1.55;
const BODY_RADIUS = 0.32;
const WALK_SPEED = 2.2;
const TURN_SPEED = 1.9;
const LOOK_SPEED = 0.0042;
// Alturas (sobre el piso) de los rayos que detectan paredes y muebles.
const COLLISION_HEIGHTS = [0.3, 0.8, 1.35];
// Tras dejar de dibujar, cuanto se espera antes de revisar el pizarron (s).
const CHECK_DELAY = 1.3;
// Puntero de tiza: sobre el pizarron indica que se puede dibujar.
const CHALK_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M3 27l3 3 22-22-3-3z' fill='%23f2f0e6' stroke='%23333' stroke-width='1.2'/%3E%3Cpath d='M3 27l3 3-4 1z' fill='%23fff'/%3E%3C/svg%3E\") 2 30, crosshair";

// Medidas tomadas de los modelos (coordenadas propias de cada uno).
// yaw 0 = mirando hacia -Z.
const HALLWAY = {
  start: { x: 60.3, z: 19.5, yaw: 0 },
  bounds: { minX: 59.45, maxX: 61.05, minZ: -9.3, maxZ: 41.2 },
  // Plafones del techo (centro en X 60.18, a 2.9 m).
  lamps: [-7.57, -2.4, 2.78, 7.96, 13.14, 18.32, 23.5, 28.68, 33.86, 39.04],
  // Simbolos sobre la pared de las aulas, en el orden del acertijo: cada uno
  // en un tramo liso de pared (entre columnas y puertas), a 7-10 m del otro.
  symbols: [
    { shape: "circle", z: 14.1 },
    { shape: "square", z: 7.05 },
    { shape: "triangle", z: -3.3 },
  ],
  wallX: 61.29,
  // Puerta del aula 2° E (la que lleva al pizarron): la ultima del pasillo.
  door: { x: 61.5, z: -8.87, minZ: -9.65, maxZ: -8.1 },
  reach: 3,
};
const CLASSROOM = {
  start: { x: -0.9, z: -0.9, look: { x: 1.55, z: -4.16 } },
  bounds: { minX: -10.5, maxX: 1.15, minZ: -8.0, maxZ: -0.4 },
  floorY: 0.04,
  // Superficie verde del pizarron grande (mira hacia -X).
  board: { x: 1.535, y: 1.655, z: -4.16, width: 5.32, height: 1.35 },
  boardReach: 4.5,
  // Puerta del frente (por donde se entra y se vuelve al pasillo).
  exitDoor: { x: 0.5, z: 0.25 },
  exitReach: 2.6,
};
// Lienzo de la tiza (misma proporcion que el pizarron).
const BOARD_CANVAS = { width: 2048, height: 520 };

// Pasillo y aula de la dimension paralela. El componente no tiene interfaz
// propia: la seccion que lo contiene (SchoolScroll) dibuja los botones y le
// pasa por `propsRef` el estado (`exploring`: la escena ocupa la pantalla y
// recibe el teclado; acertijo resuelto, etc.). La escena expone el borrador
// del pizarron en `apiRef` y avisa los cambios con callbacks: onPlace,
// onDrawing, onLoading, onMoved (primer paso) y onSolved.
export default function SchoolScene(props) {
  const mountRef = useRef(null);
  const propsRef = useRef(props);

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const call = (name, ...args) => propsRef.current[name]?.(...args);
    let disposed = false;
    let frameId;
    let visible = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.domElement.className = "school-webgl";
    mount.append(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 80);
    camera.rotation.order = "YXZ";

    // Estado del jugador.
    const player = { x: HALLWAY.start.x, z: HALLWAY.start.z, yaw: HALLWAY.start.yaw, pitch: 0 };
    const keys = new Set();
    const worlds = { hallway: null, classroom: null };
    let place = "hallway";
    let classroomLoad = null;
    let explored = false;
    let busy = false; // transicion entre escenas
    let flight = null;
    let drawing = null;
    let solve = null;
    // 0 = dimension paralela (rojo), 1 = iluminacion normal.
    let normalMix = propsRef.current.solved ? 1 : 0;
    let moved = false;

    function resize() {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    }

    // --- Carga --------------------------------------------------------------

    const loader = new GLTFLoader();
    loader.load(
      HALLWAY_URL,
      (gltf) => {
        if (disposed) return disposeObject(gltf.scene);
        worlds.hallway = buildHallway(gltf.scene);
        call("onLoading", null);
        call("onPlace", "hallway");
        // El aula se baja en segundo plano mientras se recorre el pasillo.
        loadClassroom();
      },
      (event) => {
        if (event.lengthComputable) {
          call("onLoading", `CARGANDO EL PASILLO… ${Math.round((event.loaded / event.total) * 100)}%`);
        }
      },
      (error) => {
        console.error("No se pudo cargar el pasillo.", error);
        call("onLoading", "NO SE PUDO CARGAR EL PASILLO");
      },
    );

    function loadClassroom() {
      if (classroomLoad) return classroomLoad;
      classroomLoad = new Promise((resolve, reject) => {
        loader.load(
          CLASSROOM_URL,
          (gltf) => {
            if (disposed) return disposeObject(gltf.scene);
            worlds.classroom = buildClassroom(gltf.scene);
            resolve(worlds.classroom);
          },
          (event) => {
            if (busy && event.lengthComputable) {
              call("onLoading", `CARGANDO EL AULA… ${Math.round((event.loaded / event.total) * 100)}%`);
            }
          },
          reject,
        );
      });
      return classroomLoad;
    }

    // --- Pasillo ------------------------------------------------------------

    function buildHallway(model) {
      const scene = new THREE.Scene();
      scene.add(model);
      scene.fog = new THREE.FogExp2(0x000000, 0.08);
      scene.background = new THREE.Color();
      const colliders = [];
      const doorMeshes = [];
      let lampMaterial = null;

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        const material = child.material.name;
        if (material === "CR_Emissive") lampMaterial = child.material;
        if (/floor|Flooring|Emissive/.test(material) || /ceiiling/.test(child.parent?.name)) return;
        colliders.push(child);
        if (material === "CR_doorBoard") {
          const center = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
          if (center.z > HALLWAY.door.minZ && center.z < HALLWAY.door.maxZ) doorMeshes.push(child);
        }
      });

      // Luces: una por plafon, mas una que se escapa por la puerta del aula y
      // dos focos con sombras (al comienzo y frente a la puerta).
      const hemi = new THREE.HemisphereLight();
      const sun = new THREE.DirectionalLight(0xeef3ff, 0);
      sun.position.set(40, 9, 20);
      sun.target.position.set(60, 0, 15);
      scene.add(hemi, sun, sun.target);

      const lamps = HALLWAY.lamps.map((z, index) => {
        const light = new THREE.PointLight(0xff2418, 1, 8, 1.6);
        light.position.set(60.18, 2.65, z);
        scene.add(light);
        // Algunos plafones estan "rotos": casi apagados y titilando.
        return { light, broken: index % 3 === 1, seed: index * 1.7 };
      });
      const shadowSpots = [18.32, -7.57].map((z) => {
        const spot = new THREE.SpotLight(0xff1a10, 1, 9, 1.15, 0.7, 1.4);
        spot.position.set(60.18, 2.8, z);
        spot.target.position.set(60.4, 0, z - 0.6);
        spot.castShadow = true;
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.bias = -0.0005;
        scene.add(spot, spot.target);
        return spot;
      });
      const doorLight = new THREE.PointLight(0xff1010, 1, 3.5, 1.5);
      doorLight.position.set(61.05, 1.1, HALLWAY.door.z);
      scene.add(doorLight);

      const symbols = HALLWAY.symbols.map(({ shape, z }, index) => {
        const mesh = buildSymbol(shape, index);
        mesh.position.set(HALLWAY.wallX, 1.6, z);
        mesh.rotation.y = -Math.PI / 2;
        scene.add(mesh);
        return mesh;
      });
      const sign = buildDoorSign("2° E");
      sign.position.set(HALLWAY.wallX, 2.28, HALLWAY.door.z);
      sign.rotation.y = -Math.PI / 2;
      scene.add(sign);
      // Flecha pintada en el piso, con la misma sustancia que los simbolos,
      // que apunta a la puerta. Late y se apaga junto con ellos.
      const arrow = buildFloorArrow();
      arrow.position.set(60.45, 0.015, HALLWAY.door.z);
      arrow.rotation.x = -Math.PI / 2;
      scene.add(arrow);
      symbols.push(arrow);

      const fogDim = new THREE.Color(0x160304);
      const fogNormal = new THREE.Color(0xd5dbe0);
      const lampDim = new THREE.Color(0xff1a10);
      const lampNormal = new THREE.Color(0xfff4e5);

      function applyLighting(mix, time, blackout) {
        const dim = 1 - mix;
        hemi.color.copy(lampDim).lerp(new THREE.Color(0xffffff), mix);
        hemi.groundColor.setRGB(0.07 * dim + 0.45 * mix, 0.0 + 0.42 * mix, 0.0 + 0.38 * mix);
        hemi.intensity = (0.42 * dim + 1.1 * mix) * blackout;
        sun.intensity = 1.6 * mix;
        lamps.forEach(({ light, broken, seed }) => {
          const flicker = broken ? flickerNoise(time * 7 + seed) : 0.85 + 0.15 * Math.sin(time * 1.3 + seed);
          light.color.copy(lampDim).lerp(lampNormal, mix);
          light.intensity = (3.6 * flicker * dim + 5 * mix) * blackout;
        });
        shadowSpots.forEach((spot) => {
          spot.color.copy(lampDim).lerp(lampNormal, mix);
          spot.intensity = (10 * dim + 4 * mix) * blackout;
        });
        doorLight.intensity = (2.2 + 0.8 * Math.sin(time * 2.1)) * dim * blackout;
        if (lampMaterial) {
          lampMaterial.emissive.copy(lampDim).lerp(lampNormal, mix);
          lampMaterial.emissiveIntensity = (1.2 * dim + 2.2 * mix) * blackout;
        }
        scene.fog.color.copy(fogDim).lerp(fogNormal, mix);
        scene.fog.density = 0.06 * dim + 0.012 * mix;
        scene.background.copy(scene.fog.color);
        // Los simbolos laten en la oscuridad y desaparecen con la luz normal.
        symbols.forEach((mesh, index) => {
          mesh.material.opacity = (0.78 + 0.22 * Math.sin(time * 1.8 + index)) * dim;
          mesh.visible = dim > 0.01;
        });
      }

      return {
        name: "hallway",
        scene,
        colliders,
        doorMeshes,
        floorY: 0,
        bounds: HALLWAY.bounds,
        applyLighting,
      };
    }

    // --- Aula ---------------------------------------------------------------

    function buildClassroom(model) {
      const scene = new THREE.Scene();
      scene.add(model);
      scene.fog = new THREE.FogExp2(0x000000, 0.06);
      scene.background = new THREE.Color();
      const colliders = [];
      const exitMeshes = [];
      const lampMaterials = [];

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        const names = `${child.name} ${child.parent?.name ?? ""}`;
        if (/LAMPARAS/.test(names)) {
          // Material propio para poder encender las lamparas sin tocar el resto.
          child.material = child.material.clone();
          lampMaterials.push(child.material);
          return;
        }
        if (/FLOOR|ROOF/.test(names)) return;
        colliders.push(child);
        if (/PUERTA/.test(names)) {
          const center = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
          if (center.x > -1.5) exitMeshes.push(child);
        }
      });

      const hemi = new THREE.HemisphereLight();
      const sun = new THREE.DirectionalLight(0xfff6e8, 0);
      sun.position.set(-4, 7, -16);
      sun.target.position.set(-4, 0, -4);
      scene.add(hemi, sun, sun.target);
      const ceiling = [
        [-6.9, -5.9],
        [-6.9, -2.4],
        [-2.6, -5.9],
        [-2.6, -2.4],
      ].map(([x, z], index) => {
        const light = new THREE.PointLight(0xff2418, 1, 9, 1.6);
        light.position.set(x, 2.55, z);
        scene.add(light);
        return { light, seed: index * 2.3 };
      });
      // Foco sobre el pizarron, con sombras: es lo mas visible del aula.
      const boardSpot = new THREE.SpotLight(0xff2a1a, 1, 9, 0.62, 0.6, 1.2);
      boardSpot.position.set(-1.4, 3.0, CLASSROOM.board.z);
      boardSpot.target.position.set(CLASSROOM.board.x, 1.5, CLASSROOM.board.z);
      boardSpot.castShadow = true;
      boardSpot.shadow.mapSize.set(1024, 1024);
      boardSpot.shadow.bias = -0.0005;
      scene.add(boardSpot, boardSpot.target);

      const board = buildBoard();
      scene.add(board.mesh);
      if (propsRef.current.solved) board.fontReady.then(() => board.writeMessage(1));

      const dimColor = new THREE.Color(0xff2418);
      const normalColor = new THREE.Color(0xfff6ea);
      const fogDim = new THREE.Color(0x140203);
      const fogNormal = new THREE.Color(0xe6e0d6);

      function applyLighting(mix, time, blackout) {
        const dim = 1 - mix;
        hemi.color.copy(dimColor).lerp(new THREE.Color(0xfffaf0), mix);
        hemi.groundColor.setRGB(0.07 * dim + 0.42 * mix, 0.35 * mix, 0.28 * mix);
        hemi.intensity = (0.55 * dim + 1.15 * mix) * blackout;
        sun.intensity = 2.2 * mix * blackout;
        ceiling.forEach(({ light, seed }) => {
          light.color.copy(dimColor).lerp(normalColor, mix);
          light.intensity = (2.9 * (0.8 + 0.2 * flickerNoise(time * 3 + seed)) * dim + 5 * mix) * blackout;
        });
        boardSpot.color.copy(dimColor).lerp(normalColor, mix);
        boardSpot.intensity = (13 * dim + 3 * mix) * blackout;
        lampMaterials.forEach((material) => {
          material.emissive.copy(dimColor).lerp(normalColor, mix);
          material.emissiveIntensity = (0.55 * dim + 1.6 * mix) * blackout;
        });
        scene.fog.color.copy(fogDim).lerp(fogNormal, mix);
        scene.fog.density = 0.045 * dim + 0.008 * mix;
        scene.background.copy(scene.fog.color);
      }

      return {
        name: "classroom",
        scene,
        colliders,
        exitMeshes,
        board,
        floorY: CLASSROOM.floorY,
        bounds: CLASSROOM.bounds,
        applyLighting,
      };
    }

    // Pizarron: un plano apenas delante de la superficie verde con una
    // textura de canvas donde se dibuja la tiza (y se escribe el mensaje).
    function buildBoard() {
      const { x, y, z, width, height } = CLASSROOM.board;
      const canvas = document.createElement("canvas");
      canvas.width = BOARD_CANVAS.width;
      canvas.height = BOARD_CANVAS.height;
      const context = canvas.getContext("2d");
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          roughness: 1,
          emissive: 0xffffff,
          emissiveMap: texture,
          emissiveIntensity: 0.35,
        }),
      );
      mesh.position.set(x - 0.006, y, z);
      mesh.rotation.y = -Math.PI / 2;

      const strokes = [];
      let current = null;
      // La letra manuscrita del mensaje se pide de antemano.
      const family = propsRef.current.handFont || "cursive";
      const fontReady = document.fonts.load(`600 120px ${family}`).catch(() => {});

      function chalkSegment(a, b) {
        context.strokeStyle = "rgba(244,244,236,0.88)";
        context.lineWidth = 11;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
        // Grano de la tiza.
        context.fillStyle = "rgba(244,244,236,0.35)";
        for (let i = 0; i < 4; i += 1) {
          context.fillRect(b.x + (Math.random() - 0.5) * 14, b.y + (Math.random() - 0.5) * 14, 2, 2);
        }
      }

      return {
        mesh,
        strokes,
        fontReady,
        // Punto del lienzo a partir de la UV del rayo que toco el pizarron.
        toCanvas: (uv) => ({ x: uv.x * canvas.width, y: (1 - uv.y) * canvas.height }),
        begin(point) {
          current = [point];
          strokes.push(current);
          chalkSegment(point, { x: point.x + 0.1, y: point.y });
          texture.needsUpdate = true;
        },
        extend(point) {
          if (!current) return;
          const last = current.at(-1);
          if (Math.hypot(point.x - last.x, point.y - last.y) < 3) return;
          current.push(point);
          chalkSegment(last, point);
          texture.needsUpdate = true;
        },
        end() {
          current = null;
        },
        clear() {
          strokes.length = 0;
          current = null;
          context.clearRect(0, 0, canvas.width, canvas.height);
          texture.needsUpdate = true;
        },
        // Tiñe de rojo lo dibujado (secuencia incorrecta).
        reject() {
          context.save();
          context.globalCompositeOperation = "source-in";
          context.fillStyle = "rgba(255,55,45,0.95)";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.restore();
          texture.needsUpdate = true;
        },
        // Borra el dibujo de a poco (amount de 0 a 1).
        fade(amount) {
          context.save();
          context.globalCompositeOperation = "destination-out";
          context.fillStyle = `rgba(0,0,0,${amount})`;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.restore();
          texture.needsUpdate = true;
        },
        // Escribe el mensaje hasta `progress` (0 a 1), letra por letra.
        writeMessage(progress) {
          const total = ESCAPE_MESSAGE.join("").length;
          let remaining = Math.floor(total * progress);
          context.clearRect(0, 0, canvas.width, canvas.height);
          ESCAPE_MESSAGE.forEach((line, index) => {
            const text = line.slice(0, Math.max(remaining, 0));
            remaining -= line.length;
            if (!text) return;
            let size = index === 0 ? 150 : 118;
            context.font = `600 ${size}px ${family}`;
            while (context.measureText(line).width > canvas.width * 0.9 && size > 40) {
              size -= 4;
              context.font = `600 ${size}px ${family}`;
            }
            const left = (canvas.width - context.measureText(line).width) / 2;
            const baseline = index === 0 ? 210 : 390;
            context.fillStyle = "rgba(244,244,236,0.9)";
            context.fillText(text, left, baseline);
            // Segunda pasada corrida: textura de tiza.
            context.fillStyle = "rgba(244,244,236,0.25)";
            context.fillText(text, left + 2, baseline + 1.5);
          });
          texture.needsUpdate = true;
        },
      };
    }

    // --- Movimiento ---------------------------------------------------------

    const ray = new THREE.Raycaster();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    function blocked(world, x, z, direction, distance) {
      for (const height of COLLISION_HEIGHTS) {
        ray.set(new THREE.Vector3(x, world.floorY + height, z), direction);
        ray.far = distance;
        if (ray.intersectObjects(world.colliders, false).length) return true;
      }
      return false;
    }

    function walk(world, delta) {
      const input = propsRef.current.moveRef?.current ?? {};
      const pressed = (...codes) => codes.some((code) => keys.has(code));
      const ahead =
        (pressed("KeyW", "ArrowUp") ? 1 : 0) - (pressed("KeyS", "ArrowDown") ? 1 : 0) + (input.forward || 0);
      const side = (pressed("KeyD") ? 1 : 0) - (pressed("KeyA") ? 1 : 0);
      const turn = (pressed("ArrowRight") ? 1 : 0) - (pressed("ArrowLeft") ? 1 : 0) + (input.turn || 0);

      player.yaw -= turn * TURN_SPEED * delta;
      forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      const step = forward.multiplyScalar(ahead).add(right.multiplyScalar(side));
      if (step.lengthSq() === 0) return;
      if (!moved) {
        moved = true;
        call("onMoved");
      }
      step.normalize().multiplyScalar(WALK_SPEED * delta);

      // Eje por eje, asi contra una pared se desliza en vez de frenar en seco.
      for (const axis of ["x", "z"]) {
        const amount = step[axis];
        if (!amount) continue;
        const direction = new THREE.Vector3(axis === "x" ? Math.sign(amount) : 0, 0, axis === "z" ? Math.sign(amount) : 0);
        if (!blocked(world, player.x, player.z, direction, Math.abs(amount) + BODY_RADIUS)) player[axis] += amount;
      }
      const { minX, maxX, minZ, maxZ } = world.bounds;
      player.x = THREE.MathUtils.clamp(player.x, minX, maxX);
      player.z = THREE.MathUtils.clamp(player.z, minZ, maxZ);
    }

    function placeCamera(world) {
      camera.position.set(player.x, world.floorY + EYE_HEIGHT, player.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
    }

    // Vuelo de camara (pizarron): interpola posicion y punto de mira.
    function startFlight(toPosition, toTarget, onDone) {
      const fromTarget = camera.getWorldDirection(new THREE.Vector3()).add(camera.position);
      flight = { from: camera.position.clone(), to: toPosition, fromTarget, toTarget, t: 0, onDone };
    }

    function updateFlight(delta) {
      flight.t = Math.min(flight.t + delta / 1.1, 1);
      const eased = flight.t < 0.5 ? 4 * flight.t ** 3 : 1 - (-2 * flight.t + 2) ** 3 / 2;
      camera.position.lerpVectors(flight.from, flight.to, eased);
      camera.lookAt(new THREE.Vector3().lerpVectors(flight.fromTarget, flight.toTarget, eased));
      if (flight.t === 1) {
        const { onDone } = flight;
        flight = null;
        onDone?.();
      }
    }

    // --- Interaccion --------------------------------------------------------

    const pointer = new THREE.Vector2();
    let drag = null;

    function pointerRay(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(pointer, camera);
      ray.far = 60;
    }

    function canInteract() {
      return propsRef.current.exploring && !busy && !flight && !solve?.running;
    }

    function handleDown(event) {
      if (!canInteract()) return;
      if (drawing?.active) {
        if (rejection) return;
        const point = boardPoint(event);
        // Tocar fuera del pizarron deja de dibujar.
        if (!point) return stopDrawing();
        renderer.domElement.setPointerCapture(event.pointerId);
        checkAt = null;
        worlds.classroom.board.begin(point);
        drag = { drawing: true };
        return;
      }
      renderer.domElement.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY, moved: 0 };
    }

    function handleMove(event) {
      if (drag?.drawing) {
        const point = boardPoint(event);
        if (point) worlds.classroom.board.extend(point);
        return;
      }
      if (!drag) return hover(event);
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = event.clientX;
      drag.y = event.clientY;
      player.yaw -= dx * LOOK_SPEED;
      player.pitch = THREE.MathUtils.clamp(player.pitch - dy * LOOK_SPEED, -1.1, 1.1);
    }

    function handleUp(event) {
      const finished = drag;
      drag = null;
      if (finished?.drawing) {
        worlds.classroom.board.end();
        // Cuando se deja de dibujar un momento, se revisa el pizarron.
        checkAt = timer.getElapsed() + CHECK_DELAY;
        return;
      }
      if (!finished || finished.moved > 6 || !canInteract()) return;
      click(event);
    }

    function boardPoint(event) {
      pointerRay(event);
      const [hit] = ray.intersectObject(worlds.classroom.board.mesh);
      return hit ? worlds.classroom.board.toCanvas(hit.uv) : null;
    }

    // Lo que se puede usar bajo el puntero (y lo bastante cerca): la puerta
    // del aula, el pizarron o la puerta para volver.
    function targetAt(event) {
      const world = worlds[place];
      if (!world) return null;
      pointerRay(event);
      const [hit] = ray.intersectObjects(world.scene.children, true);
      if (!hit) return null;
      if (place === "hallway") {
        return world.doorMeshes.includes(hit.object) && hit.distance <= HALLWAY.reach + 0.6 ? "door" : null;
      }
      const onBoard = hit.object === world.board.mesh || /VERDE_GRANDE|MARCO_GRANDE/.test(namesOf(hit.object));
      if (onBoard && hit.distance <= CLASSROOM.boardReach + 1) return propsRef.current.solved ? null : "board";
      if (world.exitMeshes.includes(hit.object) && hit.distance <= CLASSROOM.exitReach + 0.6) return "exit";
      return null;
    }

    function click(event) {
      const target = targetAt(event);
      if (target === "door") enterClassroom();
      else if (target === "board") startDrawing();
      else if (target === "exit") returnToHallway();
    }

    // El puntero cambia sobre lo que se puede usar (sin carteles).
    let hoverAt = 0;
    function hover(event) {
      const now = performance.now();
      if (now - hoverAt < 80) return;
      hoverAt = now;
      let cursor = "";
      if (canInteract()) {
        if (drawing?.active) cursor = boardPoint(event) ? CHALK_CURSOR : "";
        else if (!drawing) {
          const target = targetAt(event);
          cursor = target === "board" ? CHALK_CURSOR : target ? "pointer" : "";
        }
      }
      renderer.domElement.style.cursor = cursor;
    }

    // --- Cambios de escena --------------------------------------------------

    function fadeTo(opacity) {
      const fade = propsRef.current.fadeRef?.current;
      if (fade) fade.style.opacity = String(opacity);
      return new Promise((resolve) => setTimeout(resolve, 650));
    }

    async function switchWorld(load, setup) {
      busy = true;
      keys.clear();
      await fadeTo(1);
      try {
        const world = await load();
        if (disposed) return;
        setup(world);
        call("onLoading", null);
        call("onPlace", place);
      } catch (error) {
        console.error("No se pudo cargar el aula.", error);
        call("onLoading", "NO SE PUDO CARGAR EL AULA");
      }
      await fadeTo(0);
      busy = false;
    }

    function enterClassroom() {
      switchWorld(loadClassroom, () => {
        place = "classroom";
        const { start } = CLASSROOM;
        player.x = start.x;
        player.z = start.z;
        player.yaw = Math.atan2(-(start.look.x - start.x), -(start.look.z - start.z));
        player.pitch = -0.05;
      });
    }

    function returnToHallway() {
      switchWorld(
        async () => worlds.hallway,
        () => {
          place = "hallway";
          player.x = 60.5;
          player.z = HALLWAY.door.z;
          player.yaw = 0;
          player.pitch = 0;
        },
      );
    }

    // --- Pizarron -----------------------------------------------------------

    // Se encuadra el pizarron completo de frente (en pantallas angostas, lo
    // mas que permite el largo del aula).
    function boardView() {
      const { x, y, z, width, height } = CLASSROOM.board;
      const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
      const fitWidth = width / 2 / (Math.tan(halfV) * camera.aspect);
      const fitHeight = height / 2 / Math.tan(halfV);
      const distance = Math.min(Math.max(fitWidth, fitHeight) * 1.12, 10.5);
      return { position: new THREE.Vector3(x - distance, y, z), target: new THREE.Vector3(x, y, z) };
    }

    function startDrawing() {
      const view = boardView();
      drawing = { active: false };
      checkAt = null;
      keys.clear();
      startFlight(view.position, view.target, () => {
        drawing.active = true;
        call("onDrawing", true);
      });
    }

    function stopDrawing() {
      if (!drawing?.active) return;
      drawing.active = false;
      checkAt = null;
      call("onDrawing", false);
      const back = new THREE.Vector3(player.x, CLASSROOM.floorY + EYE_HEIGHT, player.z);
      const target = back.clone().add(new THREE.Vector3(-Math.sin(player.yaw), Math.tan(player.pitch), -Math.cos(player.yaw)));
      startFlight(back, target, () => {
        drawing = null;
      });
    }

    // El borrador de la interfaz.
    propsRef.current.apiRef.current = {
      clear() {
        if (rejection) return;
        checkAt = null;
        worlds.classroom?.board.clear();
      },
    };

    // Revision automatica: cuando hay tantos simbolos como la secuencia, se
    // validan. Si estan bien se resuelve el acertijo; si no, la tiza se pone
    // roja y se borra sola para volver a intentar.
    let checkAt = null;
    let rejection = null;
    function checkBoard() {
      const board = worlds.classroom.board;
      if (groupStrokes(board.strokes).length < SYMBOL_SEQUENCE.length) return;
      if (recognizeSequence(board.strokes, SYMBOL_SEQUENCE).correct) {
        startSolve();
      } else {
        board.reject();
        rejection = { time: 0 };
      }
    }

    function updateRejection(delta) {
      rejection.time += delta;
      const board = worlds.classroom.board;
      if (rejection.time > 0.7) board.fade(0.12);
      if (rejection.time > 1.4) {
        board.clear();
        rejection = null;
      }
    }

    // Secuencia de resolucion: parpadeo, apagon, luz normal y el mensaje que
    // se escribe solo en el pizarron.
    const SOLVE = { flicker: 1.8, light: 1.7, wipe: 0.7, charsPerSecond: 16 };
    function startSolve() {
      drawing.active = false;
      call("onDrawing", false);
      solve = { running: true, time: 0 };
    }

    function updateSolve(delta) {
      solve.time += delta;
      const { time } = solve;
      const board = worlds.classroom.board;
      const lightStart = SOLVE.flicker;
      const wipeStart = lightStart + SOLVE.light;
      const writeStart = wipeStart + SOLVE.wipe;
      if (time < lightStart) {
        // Parpadeo cada vez mas violento y apagones.
        const strength = time / SOLVE.flicker;
        if (time >= (solve.nextFlick ?? 0)) {
          solve.nextFlick = time + 0.05 + Math.random() * 0.12;
          solve.blackout = Math.random() < 0.25 + strength * 0.45 ? 0.05 : 1 - strength * 0.5;
        }
      } else if (time < wipeStart) {
        solve.blackout = 1;
        normalMix = THREE.MathUtils.smoothstep(time, lightStart, wipeStart);
        if (!solve.notified) {
          solve.notified = true;
          call("onSolved");
        }
      } else if (time < writeStart) {
        normalMix = 1;
        board.fade(0.18);
      } else {
        const total = ESCAPE_MESSAGE.join("").length;
        const progress = Math.min(((time - writeStart) * SOLVE.charsPerSecond) / total, 1);
        board.writeMessage(progress);
        if (progress === 1) {
          solve = { running: false };
          drawing = null;
          // La camara vuelve a quedar en manos del jugador frente al pizarron.
          const { position } = boardView();
          player.x = THREE.MathUtils.clamp(position.x, CLASSROOM.bounds.minX, CLASSROOM.bounds.maxX);
          player.z = position.z;
          player.yaw = Math.atan2(-(CLASSROOM.board.x - player.x), -(CLASSROOM.board.z - player.z));
          player.pitch = 0;
        }
      }
    }

    // --- Teclado ------------------------------------------------------------

    const HANDLED = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    function handleKeyDown(event) {
      if (!propsRef.current.exploring) return;
      if (event.code === "Escape") {
        stopDrawing();
        return;
      }
      if (!HANDLED.has(event.code)) return;
      event.preventDefault();
      // Moverse deja de dibujar.
      if (drawing?.active) stopDrawing();
      keys.add(event.code);
    }
    function handleKeyUp(event) {
      keys.delete(event.code);
    }

    // --- Loop ---------------------------------------------------------------

    const timer = new THREE.Timer();
    timer.connect(document);

    function animate(timestamp) {
      frameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const world = worlds[place];
      if (!visible || !world) return;
      const delta = Math.min(timer.getDelta(), 0.1);
      const time = timer.getElapsed();
      const { exploring, entranceRef } = propsRef.current;

      if (solve?.running) updateSolve(delta);
      if (rejection) updateRejection(delta);
      if (checkAt !== null && time >= checkAt && drawing?.active && !rejection) {
        checkAt = null;
        checkBoard();
      }
      if (exploring) explored = true;
      else keys.clear();

      if (flight) {
        updateFlight(delta);
      } else if (drawing || solve?.running) {
        // La camara queda fija frente al pizarron.
      } else if (exploring && !busy) {
        walk(world, delta);
        placeCamera(world);
      } else if (!explored) {
        // Entrada con el scroll: la camara avanza desde el fondo del pasillo.
        const entrance = entranceRef?.current ?? 1;
        const eased = 1 - (1 - entrance) ** 3;
        player.z = HALLWAY.start.z + (1 - eased) * 4;
        player.pitch = (1 - eased) * 0.12;
        placeCamera(world);
      } else {
        placeCamera(world);
      }
      // Fundido de entrada con el scroll (los cambios de escena manejan el suyo).
      const fade = propsRef.current.fadeRef?.current;
      if (fade && !busy) fade.style.opacity = String(Math.max(0, 1 - (entranceRef?.current ?? 1) * 1.25));

      // Ambas escenas comparten el estado de la luz: al volver al pasillo
      // despues de resolver el acertijo, tambien esta iluminado.
      const blackout = solve?.running ? solve.blackout ?? 1 : 1;
      world.applyLighting(normalMix, time, blackout);
      renderer.render(world.scene, camera);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(mount);
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerup", handleUp);
    canvas.addEventListener("pointercancel", handleUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    const releaseKeys = () => keys.clear();
    window.addEventListener("blur", releaseKeys);
    resize();
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointercancel", handleUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseKeys);
      Object.values(worlds).forEach((world) => world && disposeWorld(world.scene));
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div ref={mountRef} className="school-canvas" />;
}

// Ruido suave entre 0 y 1 para el titileo de las luces.
function flickerNoise(t) {
  const base = Math.sin(t) * 0.5 + Math.sin(t * 2.7 + 1.3) * 0.3 + Math.sin(t * 7.1) * 0.2;
  // De vez en cuando se corta del todo.
  return base > 0.82 ? 0.08 : 0.55 + base * 0.45;
}

function namesOf(object) {
  let names = "";
  for (let node = object; node; node = node.parent) names += ` ${node.name}`;
  return names;
}

// Simbolo pintado con una sustancia roja luminosa (canvas con brillo), con
// trazo levemente irregular y unas gotas que chorrean.
function buildSymbol(shape, seed) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  let state = seed * 9301 + 49297;
  const random = () => ((state = (state * 9301 + 49297) % 233280) / 233280);
  const jitter = (value) => value + (random() - 0.5) * 14;

  const paths = {
    circle: [Array.from({ length: 33 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2 - Math.PI / 2;
      return [256 + Math.cos(angle) * 168, 256 + Math.sin(angle) * 168];
    })],
    cross: [
      [[256, 82], [256, 430]],
      [[82, 256], [430, 256]],
    ],
    square: [[[96, 96], [416, 96], [416, 416], [96, 416], [96, 96]]],
    rhombus: [[[256, 70], [418, 256], [256, 442], [94, 256], [256, 70]]],
    triangle: [[[256, 78], [434, 420], [78, 420], [256, 78]]],
  }[shape];

  const trace = (width, color, blur) => {
    context.lineWidth = width;
    context.strokeStyle = color;
    context.shadowColor = "rgba(255,30,15,0.9)";
    context.shadowBlur = blur;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const path of paths) {
      context.beginPath();
      path.forEach(([x, y], index) => (index ? context.lineTo(jitter(x), jitter(y)) : context.moveTo(jitter(x), jitter(y))));
      context.stroke();
    }
  };
  trace(30, "rgba(255,40,25,0.85)", 45);
  trace(12, "rgba(255,190,170,0.95)", 12);
  // Gotas que chorrean hacia abajo.
  context.shadowBlur = 10;
  for (let i = 0; i < 5; i += 1) {
    const path = paths[Math.floor(random() * paths.length)];
    const [x, y] = path[Math.floor(random() * path.length)];
    const length = 30 + random() * 70;
    const gradient = context.createLinearGradient(x, y, x, y + length);
    gradient.addColorStop(0, "rgba(255,40,25,0.8)");
    gradient.addColorStop(1, "rgba(255,40,25,0)");
    context.strokeStyle = gradient;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 4, y + length);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
}

// Flecha pintada en el piso (apunta hacia +X del plano: la puerta).
function buildFloorArrow() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.lineCap = "round";
  context.lineJoin = "round";
  const path = () => {
    context.beginPath();
    context.moveTo(60, 132);
    context.lineTo(400, 124);
    context.moveTo(318, 52);
    context.lineTo(410, 126);
    context.lineTo(322, 204);
  };
  context.shadowColor = "rgba(255,30,15,0.9)";
  context.shadowBlur = 40;
  context.strokeStyle = "rgba(255,40,25,0.8)";
  context.lineWidth = 28;
  path();
  context.stroke();
  context.shadowBlur = 10;
  context.strokeStyle = "rgba(255,190,170,0.9)";
  context.lineWidth = 10;
  path();
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.45),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
}

// Cartel del aula sobre la puerta.
function buildDoorSign(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  context.fillStyle = "#d8d4c8";
  context.fillRect(0, 0, 256, 112);
  context.strokeStyle = "#555";
  context.lineWidth = 6;
  context.strokeRect(3, 3, 250, 106);
  context.fillStyle = "#1c1c1c";
  context.font = "bold 64px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.175), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
}

function disposeWorld(scene) {
  scene.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => value?.isTexture && value.dispose());
      material.dispose();
    });
  });
}
