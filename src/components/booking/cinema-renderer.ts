import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { getAislesAfter, getSeatPosition, type CinemaSeat } from "@/lib/seat-selection";
import { cinemaPalettes, type CinemaTheme } from "@/lib/cinema-theme";
import { createCinemaOutput } from "./cinema-output";

type View = { seat: CinemaSeat; zoom: number };
type Disposable = { dispose(): void };

export type CinemaRenderer = {
  ready: Promise<void>;
  setView(view: View): void;
  dispose(): void;
};

let areaLightsInitialized = false;

/** Shared, instanced seat parts keep the detailed hall inexpensive to draw. */
export function createCinemaRenderer(
  host: HTMLElement,
  seats: CinemaSeat[],
  seatsPerRow: number,
  aislesAfter: number[],
  theme: CinemaTheme,
  initialView: View,
  onContextLost: () => void,
): CinemaRenderer {
  const palette = cinemaPalettes[theme];
  if (!areaLightsInitialized) {
    RectAreaLightUniformsLib.init();
    areaLightsInitialized = true;
  }

  const resources = new Set<Disposable>();
  const keep = <T extends Disposable>(resource: T): T => {
    resources.add(resource);
    return resource;
  };
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.dataset.cinemaCanvas = "true";
  renderer.domElement.dataset.hallTheme = theme;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.035, 70);
  const rowPitch = 1.24;
  const rowRise = 0.21;
  const seatedEyeHeight = 1.51;
  const rows = Math.max(1, ...seats.map((seat) => seat.row));
  const physicalSeats = [...seats].sort(
    (a, b) => b.row - a.row || a.number - b.number,
  );
  const physicalCoordinates = new Set(
    seats.map((seat) => `${seat.row}:${seat.number}`),
  );
  const halfWidth = Math.max(
    3.8,
    Math.max(...seats.map((seat) => Math.abs(getSeatPosition(seat.number, seatsPerRow, aislesAfter)))) * 0.82 + 0.95,
  );
  const screenWidth = Math.min(12.6, (halfWidth - 0.5) * 1.8);
  const firstRowZ = Math.max(4.5, screenWidth * 0.68);
  const depth = firstRowZ + rows * rowPitch + 1.1;
  scene.fog = new THREE.Fog(palette.fog, depth * 0.72, depth * 1.8);
  const screenHeight = screenWidth / 2.39;
  const screenBottom = 1.15;
  const screenCenter = screenBottom + screenHeight / 2;
  const screenAim = new THREE.Vector3(0, screenBottom + screenHeight * 0.38, 0);
  const seatX = (seat: CinemaSeat) =>
    getSeatPosition(seat.number, seatsPerRow, aislesAfter) * 0.82;
  const aisleCenters = getAislesAfter(seatsPerRow, aislesAfter).map((after) =>
    (getSeatPosition(after, seatsPerRow, aislesAfter) +
      getSeatPosition(after + 1, seatsPerRow, aislesAfter)) * 0.41,
  );
  const seatFloor = (seat: CinemaSeat) => (seat.row - 1) * rowRise;
  const rowZ = (row: number) => firstRowZ + (row - 1) * rowPitch;
  const seatZ = (seat: CinemaSeat) => rowZ(seat.row);

  if (renderer.extensions.has("EXT_color_buffer_float")) {
    const environment = new RoomEnvironment();
    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    const environmentTarget = keep(environmentGenerator.fromScene(environment, 0.05));
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.22;
    environment.dispose();
    environmentGenerator.dispose();
  } else {
    scene.add(new THREE.AmbientLight(palette.ambient, 0.25));
  }

  const fabric = keep(
    new THREE.MeshPhysicalMaterial({
      color: palette.fabric,
      roughness: 0.96,
      metalness: 0,
      sheen: 0.72,
      sheenColor: new THREE.Color(palette.sheen),
      sheenRoughness: 0.72,
      specularIntensity: 0.15,
      normalScale: new THREE.Vector2(0.42, 0.42),
    }),
  );
  const shellFabric = keep(fabric.clone());
  shellFabric.color.set(palette.shell);
  const headrestFabric = keep(fabric.clone());
  headrestFabric.color.set(palette.headrest);
  const fabricMaterials = [fabric, shellFabric, headrestFabric];
  if (theme === "blue") {
    // The photographed velvet is red. Retain its weave and folds as neutral
    // luminance before applying blue dye, rather than multiplying red by blue.
    for (const material of fabricMaterials) {
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec4 velvet = texture2D(map, vMapUv);
            float weave = clamp(dot(velvet.rgb, vec3(0.2126, 0.7152, 0.0722)) * 2.8, 0.0, 1.0);
            diffuseColor *= vec4(vec3(weave), velvet.a);
          #endif`,
        );
      };
      material.customProgramCacheKey = () => "cinema-blue-velvet-v1";
    }
  }
  const upholsterySeam = keep(
    new THREE.MeshPhysicalMaterial({
      color: palette.seam,
      roughness: 0.98,
      metalness: 0,
      specularIntensity: 0,
    }),
  );
  const vinyl = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#080607",
      roughness: 0.48,
      metalness: 0.02,
      specularIntensity: 0.25,
    }),
  );
  const metal = keep(
    new THREE.MeshStandardMaterial({
      color: "#080808",
      roughness: 0.65,
      metalness: 0.7,
    }),
  );
  const cupMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: "#080709",
      roughness: 0.38,
      metalness: 0.3,
    }),
  );
  const carpet = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#080708",
      roughness: 1,
      specularIntensity: 0,
      normalScale: new THREE.Vector2(0.12, 0.12),
    }),
  );
  const wallMaterial = keep(
    new THREE.MeshPhysicalMaterial({
      color: palette.wall,
      roughness: 1,
      specularIntensity: 0.015,
    }),
  );
  const acoustic = keep(
    new THREE.MeshPhysicalMaterial({
      color: palette.acoustic,
      roughness: 1,
      specularIntensity: 0.015,
      normalScale: new THREE.Vector2(0.16, 0.16),
    }),
  );
  const ceilingMaterial = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#000000",
      roughness: 1,
      specularIntensity: 0.01,
    }),
  );
  const screenFrameMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#020202", roughness: 0.95 }),
  );
  const screenMaterial = keep(
    new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
      fog: false,
    }),
  );
  const stepLightMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: palette.step,
      emissive: palette.stepLight,
      emissiveIntensity: 0.6,
      roughness: 0.8,
    }),
  );
  const fixtureMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: palette.fixture,
      emissive: palette.fixtureLight,
      emissiveIntensity: 0.7,
      roughness: 0.65,
    }),
  );

  function box(
    width: number,
    height: number,
    length: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(
      keep(new THREE.BoxGeometry(width, height, length)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  box(halfWidth * 2, 0.15, depth + 1.3, carpet, 0, -0.09, depth / 2);
  box(0.15, 7.2, depth + 1, wallMaterial, -halfWidth - 0.08, 3.5, depth / 2);
  box(0.15, 7.2, depth + 1, wallMaterial, halfWidth + 0.08, 3.5, depth / 2);
  box(halfWidth * 2, 0.12, depth + 1, ceilingMaterial, 0, 6.8, depth / 2);
  box(halfWidth * 2 + 0.2, 7, 0.18, ceilingMaterial, 0, 3.4, -0.2);
  box(halfWidth * 2, 7.2, 0.15, wallMaterial, 0, 3.5, depth + 0.2);

  const treadGeometry = keep(new THREE.BoxGeometry(1, 1, 1));
  const treads = keep(new THREE.InstancedMesh(treadGeometry, carpet, rows));
  treads.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let row = 1; row <= rows; row++) {
    const level = (row - 1) * rowRise;
    dummy.position.set(0, level / 2 - 0.025, firstRowZ + (row - 1) * rowPitch);
    dummy.scale.set(halfWidth * 2, level + 0.05, rowPitch);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    treads.setMatrixAt(row - 1, dummy.matrix);
    for (const aisle of aisleCenters) {
      box(
        0.1,
        0.012,
        0.3,
        stepLightMaterial,
        aisle - 0.24,
        level + 0.012,
        rowZ(row) - rowPitch / 2 + 0.04,
      );
    }
  }
  scene.add(treads);

  const panelRibs: THREE.Vector3[] = [];
  for (const side of [-1, 1]) {
    for (let z = 2.2; z < depth - 0.5; z += 2.8) {
      const level = Math.max(0, (z - firstRowZ) / rowPitch) * rowRise;
      const panel = box(
        0.1,
        3.9,
        2.3,
        acoustic,
        side * (halfWidth - 0.06),
        level + 2.2,
        z,
      );
      panel.rotation.y = side * 0.025;
      for (let offset = -1.05; offset <= 1.05; offset += 0.14) {
        panelRibs.push(new THREE.Vector3(side * (halfWidth - 0.125), level + 2.2, z + offset));
      }
      box(
        0.075,
        0.6,
        0.06,
        fixtureMaterial,
        side * (halfWidth - 0.14),
        level + 1.8,
        z + 1.15,
      );
      box(
        0.14, 0.78, 0.14, metal,
        side * (halfWidth - 0.1), level + 1.8, z + 1.15,
      );
    }
  }
  const ribs = keep(new THREE.InstancedMesh(
    keep(new THREE.BoxGeometry(0.025, 3.6, 0.025)), acoustic, panelRibs.length,
  ));
  panelRibs.forEach((position, index) => {
    dummy.position.copy(position);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    ribs.setMatrixAt(index, dummy.matrix);
  });
  ribs.receiveShadow = true;
  scene.add(ribs);

  box(
    screenWidth + 0.22,
    screenHeight + 0.22,
    0.18,
    screenFrameMaterial,
    0,
    screenCenter,
    -0.03,
  );
  const screen = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(screenWidth, screenHeight)),
    screenMaterial,
  );
  screen.position.set(0, screenCenter, 0.075);
  scene.add(screen);

  scene.add(new THREE.HemisphereLight("#efd6bf", "#160408", 0.12));
  const screenLight = new THREE.RectAreaLight(
    "#f1c6a3",
    40,
    screenWidth,
    screenHeight,
  );
  screenLight.position.set(0, screenCenter, 0.12);
  screenLight.lookAt(0, 1, depth);
  scene.add(screenLight);

  const backFill = new THREE.RectAreaLight(
    palette.backFill,
    1.8,
    halfWidth * 1.7,
    2.6,
  );
  backFill.position.set(0, (rows - 1) * rowRise + 2.5, depth + 0.05);
  backFill.lookAt(0, 1, 2);
  scene.add(backFill);
  const ceilingFill = new THREE.RectAreaLight(
    palette.ceilingFill,
    1,
    halfWidth * 1.5,
    1.2,
  );
  ceilingFill.position.set(0, 6.1, depth * 0.6);
  ceilingFill.lookAt(0, 0, depth * 0.6);
  scene.add(ceilingFill);

  const key = new THREE.DirectionalLight(palette.key, 0.65);
  key.position.set(-3, 6.5, depth - 1);
  key.target.position.set(0, 0, depth / 2);
  key.castShadow = true;
  keep(key.shadow);
  const shadowSize = Math.min(coarsePointer ? 2048 : 4096, renderer.capabilities.maxTextureSize);
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.radius = 2.6;
  key.shadow.camera.left = -halfWidth - 1;
  key.shadow.camera.right = halfWidth + 1;
  key.shadow.camera.top = depth / 2 + 2;
  key.shadow.camera.bottom = -depth / 2 - 2;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 35;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(palette.rim, 0.16);
  rim.position.set(0, 5.7, 0.6);
  rim.target.position.set(0, 0, depth / 2);
  scene.add(rim, rim.target);

  function paddedGeometry(
    width: number,
    height: number,
    thickness: number,
    radius: number,
    bulge: number,
    taper = 0,
  ) {
    const virtualDepth = Math.max(thickness, radius * 2 + 0.001);
    const geometry = keep(
      new RoundedBoxGeometry(width, height, virtualDepth, 8, radius),
    );
    geometry.scale(1, 1, thickness / virtualDepth);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const adjustedNormal = new THREE.Vector3();
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const nx = x / (width / 2);
      const ny = y / (height / 2);
      const a = Math.max(0, 1 - nx ** 2);
      const b = Math.max(0, 1 - ny ** 2);
      const side = Math.sign(z);
      const weight = Math.min(1, Math.abs(z) / (thickness * 0.35));
      // Broader shoulders and a narrower lower back give the upholstery its form.
      const widthScale = 1 - taper * ((1 - ny) / 2);
      position.setX(index, x * widthScale);
      position.setZ(index, z + side * bulge * a * b * weight);
      position.setY(index, y + 0.025 * a * Math.max(0, ny));
      const gradientX =
        ((side * bulge * -2 * nx) / (width / 2)) * b * weight;
      const gradientY =
        ((side * bulge * -2 * ny) / (height / 2)) * a * weight;
      adjustedNormal
        .set(
          (normal.getX(index) - gradientX * normal.getZ(index)) / widthScale,
          normal.getY(index) - gradientY * normal.getZ(index) -
            (normal.getX(index) * x * taper) / (height * widthScale),
          normal.getZ(index),
        )
        .normalize();
      normal.setXYZ(
        index,
        adjustedNormal.x,
        adjustedNormal.y,
        adjustedNormal.z,
      );
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
    geometry.computeBoundingSphere();
    return geometry;
  }

  const backGeometry = paddedGeometry(0.68, 0.8, 0.23, 0.17, 0.075, 0.19);
  const frontPanelGeometry = paddedGeometry(0.55, 0.58, 0.105, 0.12, 0.045, 0.13);
  const headrestGeometry = paddedGeometry(0.48, 0.2, 0.095, 0.085, 0.027);
  const lumbarGeometry = paddedGeometry(0.49, 0.19, 0.105, 0.075, 0.025);
  const cushionGeometry = paddedGeometry(0.6, 0.59, 0.2, 0.085, 0.037);
  cushionGeometry.rotateX(-Math.PI / 2);
  const underSeatGeometry = keep(
    new RoundedBoxGeometry(0.57, 0.09, 0.5, 3, 0.035),
  );
  const armGeometry = keep(new RoundedBoxGeometry(0.12, 0.12, 0.65, 5, 0.05));
  const supportGeometry = keep(
    new RoundedBoxGeometry(0.075, 0.4, 0.38, 2, 0.025),
  );
  const pedestalGeometry = keep(
    new THREE.CylinderGeometry(0.036, 0.045, 0.34, 16),
  );
  const footGeometry = keep(
    new RoundedBoxGeometry(0.43, 0.045, 0.38, 2, 0.016),
  );
  const cupRimGeometry = keep(new THREE.TorusGeometry(0.034, 0.0055, 8, 24));
  const cupWellGeometry = keep(
    new THREE.CylinderGeometry(0.03, 0.027, 0.028, 24, 1, false),
  );
  const hingeGeometry = keep(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 20));

  // A narrow sewn welt follows the actual curved back, rather than a flat decal.
  const seamOutline = new THREE.CatmullRomCurve3([
    [-0.15, 0.29], [0.15, 0.29], [0.24, 0.245], [0.255, 0.14],
    [0.238, -0.16], [0.2, -0.29], [0.13, -0.315], [-0.13, -0.315],
    [-0.2, -0.29], [-0.238, -0.16], [-0.255, 0.14], [-0.24, 0.245],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)), true, "centripetal");
  const backSurface = new THREE.Mesh(backGeometry);
  const ray = new THREE.Raycaster();
  const seamPoints = seamOutline.getSpacedPoints(96).slice(0, -1).map((point) => {
    ray.set(new THREE.Vector3(point.x, point.y, 1), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(backSurface)[0];
    return hit ? hit.point.add(new THREE.Vector3(0, 0, 0.0045)) : point;
  });
  const seamGeometry = keep(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(seamPoints, true, "centripetal"),
      96, 0.0025, 6, true,
    ),
  );
  (backSurface.material as THREE.Material).dispose();

  const partMeshes: {
    mesh: THREE.InstancedMesh;
    offsets: number[][];
    rotation: THREE.Euler;
    sharedArms: boolean;
  }[] = [];

  function seatPart(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    offsets: number[][],
    rotation = new THREE.Euler(),
    sharedArms = false,
  ) {
    const mesh = keep(
      new THREE.InstancedMesh(
        geometry,
        material,
        seats.length * offsets.length,
      ),
    );
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    partMeshes.push({ mesh, offsets, rotation, sharedArms });
    return mesh;
  }

  seatPart(
    backGeometry,
    shellFabric,
    [[0, 0.835, 0.065]],
    new THREE.Euler(0.09, 0, 0),
  );
  const stitching = seatPart(
    seamGeometry,
    upholsterySeam,
    [[0, 0.835, 0.065]],
    new THREE.Euler(0.09, 0, 0),
  );
  stitching.castShadow = false;
  stitching.receiveShadow = false;
  seatPart(
    frontPanelGeometry,
    fabric,
    [[0, 0.82, -0.08]],
    new THREE.Euler(0.09, 0, 0),
  );
  seatPart(
    headrestGeometry,
    headrestFabric,
    [[0, 1.115, -0.065]],
    new THREE.Euler(0.09, 0, 0),
  );
  seatPart(
    lumbarGeometry, fabric, [[0, 0.6, -0.155]], new THREE.Euler(0.09, 0, 0),
  );
  seatPart(cushionGeometry, fabric, [[0, 0.46, -0.22]]);
  seatPart(underSeatGeometry, vinyl, [[0, 0.355, -0.21]]);
  seatPart(
    armGeometry,
    vinyl,
    [
      [-0.36, 0.65, -0.18],
      [0.36, 0.65, -0.18],
    ],
    undefined,
    true,
  );
  seatPart(
    supportGeometry,
    metal,
    [
      [-0.36, 0.39, -0.09],
      [0.36, 0.39, -0.09],
    ],
    undefined,
    true,
  );
  seatPart(pedestalGeometry, metal, [
    [-0.19, 0.21, 0.05],
    [0.19, 0.21, 0.05],
  ]);
  seatPart(footGeometry, metal, [[0, 0.045, 0.04]]);
  seatPart(
    cupRimGeometry,
    vinyl,
    [
      [-0.36, 0.716, -0.39],
      [0.36, 0.716, -0.39],
    ],
    new THREE.Euler(-Math.PI / 2, 0, 0),
    true,
  );
  seatPart(
    cupWellGeometry,
    cupMaterial,
    [
      [-0.36, 0.696, -0.39],
      [0.36, 0.696, -0.39],
    ],
    undefined,
    true,
  );
  seatPart(
    hingeGeometry,
    metal,
    [[-0.265, 0.385, 0.035], [0.265, 0.385, 0.035]],
    new THREE.Euler(0, 0, Math.PI / 2),
  );

  function populateSeatInstances() {
    for (const part of partMeshes) {
      physicalSeats.forEach((seat, index) => {
        part.offsets.forEach(([x, y, z], offsetIndex) => {
          dummy.position.set(
            seatX(seat) + x,
            seatFloor(seat) + y,
            seatZ(seat) + z,
          );
          dummy.rotation.copy(part.rotation);
          const sharedWithNext =
            part.sharedArms &&
            offsetIndex === 1 &&
            physicalCoordinates.has(`${seat.row}:${seat.number + 1}`) &&
            Math.abs(
              getSeatPosition(seat.number + 1, seatsPerRow, aislesAfter) -
                getSeatPosition(seat.number, seatsPerRow, aislesAfter),
            ) < 1;
          dummy.scale.setScalar(sharedWithNext ? 0 : 1);
          dummy.updateMatrix();
          part.mesh.setMatrixAt(
            index * part.offsets.length + offsetIndex,
            dummy.matrix,
          );
        });
      });
      part.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  let requestedView = initialView;
  let disposed = false;
  let assetsReady = false;
  let frame = 0;
  let currentZoom = initialView.zoom;
  let aspect = 1;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let transition: {
    started: number;
    duration: number;
    positionFrom: THREE.Vector3;
    positionTo: THREE.Vector3;
    rotationFrom: THREE.Quaternion;
    rotationTo: THREE.Quaternion;
    zoomFrom: number;
    zoomTo: number;
    lift: number;
  } | null = null;

  function destination(seat: CinemaSeat) {
    return new THREE.Vector3(
      seatX(seat),
      seatFloor(seat) + seatedEyeHeight,
      seatZ(seat) - 0.12,
    );
  }
  function viewRotation(position: THREE.Vector3) {
    return new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(position, screenAim, camera.up),
    );
  }
  function updateLens() {
    camera.aspect = aspect;
    const horizontalFov = aspect < 1.2 ? 62 : 70;
    camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(horizontalFov / 2)) /
            currentZoom /
            aspect,
        ),
    );
    camera.updateProjectionMatrix();
  }
  function render(now = performance.now()) {
    frame = 0;
    if (disposed) return;
    if (transition) {
      const progress = transition.duration
        ? Math.min(1, (now - transition.started) / transition.duration)
        : 1;
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(
        transition.positionFrom,
        transition.positionTo,
        eased,
      );
      camera.position.y += Math.sin(progress * Math.PI) * transition.lift;
      camera.quaternion.slerpQuaternions(
        transition.rotationFrom,
        transition.rotationTo,
        eased,
      );
      currentZoom = THREE.MathUtils.lerp(
        transition.zoomFrom,
        transition.zoomTo,
        eased,
      );
      updateLens();
      if (progress >= 1) transition = null;
    }
    output.render();
    if (transition) frame = requestAnimationFrame(render);
    renderer.domElement.dataset.animating = transition ? "true" : "false";
  }
  function invalidate() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }
  function moveTo(view: View, intro = false) {
    requestedView = view;
    if (!assetsReady) return;
    const position = destination(view.seat);
    if (intro && !reducedMotion.matches) {
      camera.position.copy(position).add(new THREE.Vector3(0.35, 1.85, 2.1));
      camera.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          camera.position,
          new THREE.Vector3(
            position.x,
            seatFloor(view.seat) + 0.6,
            seatZ(view.seat) - 1.2,
          ),
          camera.up,
        ),
      );
      currentZoom = view.zoom * 0.88;
    }
    transition = {
      started: performance.now(),
      duration: reducedMotion.matches ? 0 : intro ? 1250 : 650,
      positionFrom: camera.position.clone(),
      positionTo: position,
      rotationFrom: camera.quaternion.clone(),
      rotationTo: viewRotation(position),
      zoomFrom: currentZoom,
      zoomTo: view.zoom,
      lift: !intro && Math.abs(position.z - camera.position.z) > 0.7 ? 0.55 : 0,
    };
    renderer.domElement.dataset.viewRow = String(view.seat.row);
    renderer.domElement.dataset.viewSeat = String(view.seat.number);
    renderer.domElement.dataset.viewZoom = String(view.zoom);
    renderer.domElement.dataset.animating = "true";
    invalidate();
  }

  camera.position.copy(destination(initialView.seat));
  camera.quaternion.copy(viewRotation(camera.position));
  populateSeatInstances();
  const output = keep(createCinemaOutput(
    renderer, scene, camera,
    new THREE.Box3(
      new THREE.Vector3(-halfWidth, -0.1, firstRowZ - rowPitch / 2),
      new THREE.Vector3(halfWidth, (rows - 1) * rowRise + 2.3, depth),
    ),
  ));

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    aspect = width / height;
    renderer.setSize(width, height, false);
    updateLens();
    output.resize(width, height);
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const contextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    onContextLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);

  const loader = new THREE.TextureLoader();
  const load = (url: string) =>
    loader.loadAsync(url).then((texture) => {
      if (disposed) texture.dispose();
      else keep(texture);
      return texture;
    });
  const ready = Promise.all([
    load("/cinema/velvet-color.jpg"),
    load("/cinema/velvet-normal.jpg"),
    load("/cinema/velvet-roughness.jpg"),
    load("/_next/image?url=%2Fcinema%2Fdune-desert.jpg&w=1920&q=75"),
  ]).then(async ([color, normal, roughness, film]) => {
    if (disposed) return;
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    for (const texture of [color, normal, roughness]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.1, 2.8);
      texture.anisotropy = anisotropy;
    }
    color.colorSpace = THREE.SRGBColorSpace;
    for (const material of fabricMaterials) {
      material.map = color;
      material.normalMap = normal;
      material.roughnessMap = roughness;
      material.needsUpdate = true;
    }
    for (const material of [carpet, acoustic]) {
      material.normalMap = normal;
      material.roughnessMap = roughness;
      material.needsUpdate = true;
    }
    film.colorSpace = THREE.SRGBColorSpace;
    film.anisotropy = anisotropy;
    const image = film.image as HTMLImageElement;
    const filmAspect = image.width / image.height;
    const targetAspect = screenWidth / screenHeight;
    film.repeat.set(
      Math.min(1, targetAspect / filmAspect),
      Math.min(1, filmAspect / targetAspect),
    );
    film.offset.set((1 - film.repeat.x) / 2, (1 - film.repeat.y) * 0.76);
    screenMaterial.map = film;
    screenMaterial.needsUpdate = true;
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    assetsReady = true;
    renderer.domElement.dataset.ready = "true";
    moveTo(requestedView, true);
  });

  return {
    ready,
    setView(view) {
      if (!disposed) moveTo(view);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      for (const resource of resources) resource.dispose();
      const context = renderer.getContext();
      const loseContext = context.isContextLost()
        ? null
        : context.getExtension("WEBGL_lose_context");
      renderer.dispose();
      loseContext?.loseContext();
      renderer.domElement.remove();
    },
  };
}
