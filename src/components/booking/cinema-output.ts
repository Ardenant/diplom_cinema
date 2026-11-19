import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/** Antialiased HDR output with short-range, denoised contact shadows. */
export function createCinemaOutput(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  seatingBounds: THREE.Box3,
) {
  // Preserve a usable seat preview on WebGL devices without float render targets.
  if (!renderer.extensions.has("EXT_color_buffer_float")) {
    renderer.domElement.dataset.renderQuality = "standard";
    return {
      resize() {},
      render() { renderer.render(scene, camera); },
      dispose() {},
    };
  }

  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(renderer.getPixelRatio() > 1.5 ? 2 : 4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, target);
  const scenePass = new RenderPass(scene, camera);
  const contactShadows = new GTAOPass(scene, camera, 1, 1);
  contactShadows.output = GTAOPass.OUTPUT.Default;
  contactShadows.blendIntensity = 0.6;
  contactShadows.updateGtaoMaterial({
    radius: 0.42,
    thickness: 0.3,
    distanceExponent: 1.1,
    distanceFallOff: 1.2,
    scale: 0.8,
    samples: 12,
  });
  contactShadows.updatePdMaterial({
    radius: 5,
    samples: 12,
    depthPhi: 3,
    normalPhi: 5,
    lumaPhi: 8,
  });
  contactShadows.setSceneClipBox(seatingBounds);
  const outputPass = new OutputPass();
  composer.addPass(scenePass);
  composer.addPass(contactShadows);
  composer.addPass(outputPass);
  renderer.domElement.dataset.renderQuality = "cinematic";

  return {
    resize(width: number, height: number) {
      composer.setSize(width, height);
      const ratio = renderer.getPixelRatio();
      // The scene stays crisp; lower-frequency occlusion is denoised separately.
      const scale = window.matchMedia("(pointer: coarse)").matches ? 0.55 : 0.75;
      contactShadows.setSize(
        Math.max(1, Math.round(width * ratio * scale)),
        Math.max(1, Math.round(height * ratio * scale)),
      );
    },
    render() {
      composer.render();
    },
    dispose() {
      scenePass.dispose();
      contactShadows.dispose();
      // These two materials are not disposed by GTAOPass in Three r187.
      contactShadows.gtaoMaterial.dispose();
      contactShadows.blendMaterial.dispose();
      contactShadows.depthTexture.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
}
