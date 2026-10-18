"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const MODEL_URL = "/models/apple_iphone_13_pro_max.glb";

// Sin `entranceRef` el celular se explora libremente (rotacion y zoom).
// Con `entranceRef` (valor de 0 a 1 que actualiza el scroll) el celular entra
// en escena siguiendo ese valor; la rueda queda libre para scrollear la pagina
// y la rotacion se habilita recien cuando termino de entrar.
export default function PhoneModel({ entranceRef }) {
  const mountRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scrollDriven = Boolean(entranceRef);
    let disposed = false;
    let visible = true;
    let frameId;
    let model = null;
    let modelSize = null;
    let entrance = 0;
    const pivot = new THREE.Group();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

    // alpha: true deja el fondo transparente para integrarlo con la pagina.
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    // Los materiales metalicos del modelo necesitan algo que reflejar: un
    // entorno generado (no se muestra como fondo, solo ilumina).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1d1b, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(-3, 1, -3);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.8;
    if (scrollDriven) {
      controls.enabled = false;
      controls.enableZoom = false;
      // En pantallas tactiles el gesto vertical sigue scrolleando la pagina;
      // el horizontal gira el celular.
      renderer.domElement.style.touchAction = "pan-y";
    }

    function resize() {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    }

    // Ubica la camara a la distancia justa para que el celular entre completo
    // (por alto y por ancho) y define los limites de zoom a partir de ella.
    function frameModel(size) {
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const fitHeight = size.y / 2 / Math.tan(halfFov);
      const fitWidth = size.x / 2 / (Math.tan(halfFov) * camera.aspect);
      const distance = Math.max(fitHeight, fitWidth) * 1.35 + size.z;

      camera.position.set(0, 0, distance);
      camera.near = distance / 100;
      camera.far = distance * 10;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.minDistance = distance * 0.45;
      controls.maxDistance = distance * 2;
      controls.update();
    }

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        model = gltf.scene;

        // El mapeo UV del wallpaper viene invertido verticalmente en el archivo.
        // (flipY no sirve: GLTFLoader carga las texturas como ImageBitmap.)
        model.traverse((child) => {
          const map = child.isMesh && child.material.name === "Wallpaper" && child.material.map;
          if (!map) return;
          map.center.set(0.5, 0.5);
          map.repeat.set(1, -1);
        });

        // La pantalla del modelo mira hacia -Z: se gira para que quede de frente.
        model.rotation.y = Math.PI;
        const box = new THREE.Box3().setFromObject(model);
        modelSize = box.getSize(new THREE.Vector3());
        model.position.sub(box.getCenter(new THREE.Vector3()));

        pivot.add(model);
        scene.add(pivot);
        frameModel(modelSize);
        setStatus("ready");
      },
      (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      },
      (error) => {
        console.error("No se pudo cargar el modelo del celular.", error);
        if (!disposed) setStatus("error");
      },
    );

    // Entrada: sube desde abajo girando sobre si mismo hasta quedar de frente.
    function applyEntrance() {
      entrance += (entranceRef.current - entrance) * 0.08;
      const eased = 1 - (1 - entrance) ** 3;
      const rest = 1 - eased;
      pivot.position.y = rest * -modelSize.y * 1.3;
      pivot.rotation.set(rest * 0.7, rest * Math.PI * 1.5, rest * -0.25);
      pivot.scale.setScalar(0.55 + eased * 0.45);
      controls.enabled = entrance > 0.97;
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      if (!visible) return;
      if (scrollDriven && modelSize) applyEntrance();
      controls.update();
      renderer.render(scene, camera);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    // No se renderiza mientras el canvas esta fuera de pantalla.
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(mount);
    resize();
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      visibility.disconnect();
      controls.dispose();
      if (model) disposeObject(model);
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [entranceRef]);

  return (
    <div className="phone-stage">
      <div
        ref={mountRef}
        className="phone-canvas"
        role="img"
        aria-label="Modelo 3D de un celular. Arrastrá para girarlo y usá la rueda para acercarlo."
      />
      {status !== "ready" && (
        <p className="phone-status" role="status">
          {status === "error" ? "NO SE PUDO CARGAR EL MODELO" : `CARGANDO MODELO… ${progress}%`}
        </p>
      )}
    </div>
  );
}

function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}
