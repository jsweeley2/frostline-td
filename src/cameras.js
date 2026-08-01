// cameras.js
// ---------------------------------------------------------------------------
// The three camera modes. Press C to cycle: chase -> front -> cockpit -> chase.
//
//   chase   - floats above and behind the car. It LAGS behind and swings wide
//             in corners, which is the trick that makes speed feel fast.
//   front   - out in front, looking back at the car driving towards you.
//   cockpit - inside the car, looking over the dashboard and steering wheel.
//
// This file only moves the one camera around. It never changes the car.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

const MODES = ['chase', 'front', 'cockpit'];

export function createCameras(camera, car, dashboard) {
  let modeIndex = 0;

  // A remembered, smoothed position so the chase cam can lag behind instead of
  // being glued to the car.
  const smoothedPos = new THREE.Vector3();
  const smoothedLook = new THREE.Vector3();
  let firstFrame = true;

  // Reused scratch vectors so we don't make new ones every frame (that's slow).
  const carPos = new THREE.Vector3();
  const carForward = new THREE.Vector3();
  const desiredPos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function next() {
    modeIndex = (modeIndex + 1) % MODES.length;
    // Only show the cockpit dashboard when we're actually in the cockpit.
    dashboard.setVisible(getMode() === 'cockpit');
  }

  function getMode() {
    return MODES[modeIndex];
  }

  // Work out which way the car is heading, flattened so rolling or jumping
  // doesn't tip the camera over. Points along the car's forward (-z) direction.
  function updateCarHeading() {
    car.chassisMesh.getWorldPosition(carPos);
    carForward.set(0, 0, -1).applyQuaternion(car.chassisMesh.quaternion);
    carForward.y = 0;
    if (carForward.lengthSq() < 0.001) carForward.set(0, 0, -1); // stopped: face forward
    carForward.normalize();
  }

  // How quickly a lagging camera catches up. This turns a "catch up speed" into
  // a smooth amount for this frame, so it feels the same on any computer.
  function catchUp(delta, speed) {
    return 1 - Math.exp(-speed * delta);
  }

  function update(delta) {
    const mode = getMode();
    if (mode === 'cockpit') {
      updateCockpit();
      firstFrame = true; // so chase/front re-snap cleanly next time
      return;
    }
    if (mode === 'chase') {
      updateFollow(delta, /*behind*/ 8, /*height*/ 4, /*lag*/ 4);
    } else {
      updateFollow(delta, /*infront*/ -9, /*height*/ 3, /*lag*/ 8);
    }
  }

  // Shared code for chase and front. A NEGATIVE distance puts the camera in
  // front of the car (that's the "front" mode).
  function updateFollow(delta, distance, height, lag) {
    updateCarHeading();

    // Start behind (or in front of) the car and lift up.
    desiredPos.copy(carPos).addScaledVector(carForward, -distance).addScaledVector(up, height);

    if (firstFrame) {
      smoothedPos.copy(desiredPos);
      smoothedLook.copy(carPos);
      firstFrame = false;
    } else {
      // Ease towards where we want to be. Because we lag behind, the camera
      // naturally swings wide when the car turns - exactly the feel we want.
      smoothedPos.lerp(desiredPos, catchUp(delta, lag));
      smoothedLook.lerp(carPos, catchUp(delta, lag * 2));
    }

    camera.position.copy(smoothedPos);
    camera.lookAt(smoothedLook);
  }

  // A small downward tilt so the cockpit looks at the road ahead, not the sky.
  const cockpitPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.13);

  // Cockpit: sit the camera inside the car and point it wherever the car points.
  // No lag here - being rigidly attached is what makes it feel like you ARE the car.
  function updateCockpit() {
    // The driver's eye position, in the car's own space. We sit ABOVE the cabin
    // roof and a little back, so the solid car body doesn't block the view and
    // we look out over the dashboard.
    const eye = new THREE.Vector3(0, 0.95, -0.35);
    car.chassisMesh.localToWorld(eye);
    camera.position.copy(eye);
    // Face the same way the car faces (its front is -z, same as the camera's),
    // then tilt down a touch to see the road and the dashboard.
    camera.quaternion.copy(car.chassisMesh.quaternion).multiply(cockpitPitch);
  }

  // Set the very first frame up.
  dashboard.setVisible(false);

  return { next, update, getMode };
}
