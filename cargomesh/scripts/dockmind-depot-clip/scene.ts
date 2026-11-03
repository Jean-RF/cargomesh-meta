// Escena para clips sintéticos de DockMind: la carga del muelle 02 vista por una cámara fija.
// Reutiliza los modelos de logistics-3d sin cambiarlos. El avance de cada cuadro replica lo que
// depot-yard-scene.tsx hace con el camión que carga, pero con un reloj controlado desde fuera.
import {
  ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, HemisphereLight, PCFShadowMap,
  PerspectiveCamera, PMREMGenerator, Quaternion, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildDepot } from '@/features/logistics-3d/depot-model';
import { animateDepotActors, buildDepotActors } from '@/features/logistics-3d/depot-actors';
import { clamp01, depotCyclePose, ease } from '@/features/logistics-3d/depot-cycle';
import { buildCargoMeshTruck, setTruckCargoAccess, setTruckWheelAngle } from '@/features/logistics-3d/truck-model';
import type { DepotTemplateId } from '@/features/logistics-3d/depot-templates';

export type ClipVariant = 'complete' | 'missing-one';
export type ClipSetup = {
  width: number; height: number; variant: ClipVariant; template: DepotTemplateId;
  camera: { position: [number, number, number]; target: [number, number, number]; fov: number };
};

const BAY_X = 3, DOOR_Z = 1, LINE_BOTTOM = -1.5, TRUCK_SCALE = .58, WHEEL_RADIUS = .369;
// depot-cycle.ts: la carga empieza a los 36 s, cada viaje dura 7 s y el pallet se suelta al 66 % del viaje.
const LOAD_START = 36, TRIP_SECONDS = 7, RELEASE = .66;
// Hasta dónde se desliza cada pallet entregado dentro del remolque: el primero queda al fondo.
const SLIDE_DEPTH = [3, 2, 1], SLIDE_SECONDS = 1.6;

function createClip(setup: ClipSetup) {
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(setup.width, setup.height, false);
  renderer.toneMapping = ACESFilmicToneMapping; renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#e4edf0');
  const generator = new PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = generator.fromScene(room, .05, .1, 100, { size: 128 }).texture;
  scene.environmentIntensity = .75; room.dispose(); generator.dispose();
  const sun = new DirectionalLight('#fff0d4', 2.7);
  sun.position.set(-12, 22, 10); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .025;
  scene.add(new AmbientLight('#ffffff', .5), new HemisphereLight('#edf7ff', '#8c967b', 1.4), sun);

  const depot = buildDepot('#147d88', setup.template), actors = buildDepotActors('articulated');
  const truck = buildCargoMeshTruck('articulated', { cargoAccess: true });
  truck.scale.setScalar(TRUCK_SCALE); truck.add(actors.payload); depot.root.add(actors.root);
  scene.add(depot.root, truck);
  // El muelle 02 queda abierto mientras el camión está atracado.
  depot.shutters[1].scale.y = .04; depot.shutters[1].position.y = .35 + 2.28 * .96;

  const camera = new PerspectiveCamera(setup.camera.fov, setup.width / setup.height, .05, 200);
  camera.position.fromArray(setup.camera.position); camera.lookAt(new Vector3(...setup.camera.target));
  camera.updateMatrixWorld(true);

  // En el ciclo original el pallet llevado desaparece al soltarse y otro aparece en el remolque al terminar
  // el viaje. Un video real no salta así: aquí el pallet soltado sigue visible y se desliza hacia el fondo.
  const dropped = SLIDE_DEPTH.map(() => { const item = actors.carried.clone(true); item.visible = false; scene.add(item); return item; });
  const releases: { position: Vector3; quaternion: Quaternion }[] = [];
  function releasePose(trip: number) {
    if (!releases[trip]) {
      animateDepotActors(actors, depotCyclePose(LOAD_START + (trip + RELEASE - .01) * TRIP_SECONDS), false);
      actors.root.updateMatrixWorld(true);
      releases[trip] = { position: actors.carried.getWorldPosition(new Vector3()), quaternion: actors.carried.getWorldQuaternion(new Quaternion()) };
    }
    return releases[trip];
  }

  const carriedAt = new Vector3();
  /** Dibuja el instante `cycleSeconds` del ciclo de la sede y devuelve el cuadro y el pallet llevado. */
  function frame(cycleSeconds: number) {
    dropped.forEach((item, trip) => {
      const releasedAt = LOAD_START + (trip + RELEASE) * TRIP_SECONDS;
      item.visible = cycleSeconds >= releasedAt && !(setup.variant === 'missing-one' && trip === 2);
      if (!item.visible) return;
      const { position, quaternion } = releasePose(trip);
      item.position.copy(position).setZ(position.z + SLIDE_DEPTH[trip] * ease(clamp01((cycleSeconds - releasedAt) / SLIDE_SECONDS)));
      item.quaternion.copy(quaternion);
    });
    const pose = depotCyclePose(cycleSeconds);
    truck.position.copy(pose.position).setY(.21); truck.rotation.y = pose.yaw;
    setTruckWheelAngle(truck, pose.wheelDistance / (WHEEL_RADIUS * TRUCK_SCALE)); setTruckCargoAccess(truck, pose.doors);
    animateDepotActors(actors, pose, false);
    actors.payload.visible = false;
    if (setup.variant === 'missing-one' && pose.trip === 2) {
      // El montacargas hace el tercer viaje vacío: el último pallet se queda en la zona de preparación.
      actors.carried.visible = false;
      actors.staged[2].visible = true;
    }
    renderer.render(scene, camera);
    actors.carried.getWorldPosition(carriedAt);
    return { image: renderer.domElement.toDataURL('image/jpeg', .92), carried: actors.carried.visible ? carriedAt.z : null };
  }

  /**
   * Línea de DockMind: la vertical del centro de la puerta (x = 3, z = 1) proyectada en la imagen, en fracciones.
   * Un punto cruza la línea cuando pasa por el plano de la puerta. La línea baja por debajo del piso porque,
   * con la cámara en alto, el pallet que se acerca aparece más abajo que el umbral: DockMind solo da lado
   * a las cajas cuyo centro cae dentro del segmento.
   */
  function line() {
    const project = (x: number, y: number, z: number) => {
      const p = new Vector3(x, y, z).project(camera);
      return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
    };
    const bottom = project(BAY_X, LINE_BOTTOM, DOOR_Z), top = project(BAY_X, 2.6, DOOR_Z), inside = project(BAY_X, 1.2, DOOR_Z + 2);
    return { x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y, inside_x: inside.x, inside_y: inside.y, door_z: DOOR_Z };
  }

  return { frame, line };
}

declare global { interface Window { dockmindClip?: { setup: (setup: ClipSetup) => void; frame: (cycleSeconds: number) => { image: string; carried: number | null }; line: () => ReturnType<ReturnType<typeof createClip>['line']> } } }
let clip: ReturnType<typeof createClip> | null = null;
window.dockmindClip = {
  setup: setup => { clip = createClip(setup); },
  frame: cycleSeconds => clip!.frame(cycleSeconds),
  line: () => clip!.line(),
};
