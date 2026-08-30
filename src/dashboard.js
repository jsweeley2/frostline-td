// dashboard.js
// ---------------------------------------------------------------------------
// The cockpit steering wheel and dashboard you see in cockpit view.
// It is a little group of 3D shapes that we attach to the car, so it rides
// along inside the car. We hide it in the other camera modes.
//
// The steering wheel really turns: setSteer() spins it left and right to match
// how much you are steering.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

export function createDashboard(car) {
  // Everything lives in one group that we attach to the car body.
  const root = new THREE.Group();
  car.chassisMesh.add(root);

  // The dashboard panel: a dark block across the front you look over.
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x181820 })
  );
  panel.position.set(0, 0.5, -1.35);
  root.add(panel);

  // The steering column tilt: real steering wheels lean back towards you.
  const mount = new THREE.Group();
  mount.position.set(0, 0.55, -1.05);
  mount.rotation.x = -0.5; // lean the wheel back a bit
  root.add(mount);

  // The "spinner" is the part that actually rotates when you steer. Everything
  // that spins goes inside it.
  const spinner = new THREE.Group();
  mount.add(spinner);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111114 });

  // The round rim of the wheel (a torus is a doughnut/ring shape).
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 12, 32), wheelMaterial);
  spinner.add(rim);

  // Three spokes joining the rim to the middle.
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.02), wheelMaterial);
    spoke.rotation.z = (i / 3) * Math.PI * 2; // spread them evenly around
    spinner.add(spoke);
  }

  // The middle hub.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), wheelMaterial);
  hub.rotation.x = Math.PI / 2;
  spinner.add(hub);

  root.visible = false; // hidden until we switch to cockpit view

  return {
    // Turn the wheel. `value` is -1 (full right) to 1 (full left).
    // We spin it about 2.6 radians (~150 degrees) at full lock.
    setSteer(value) {
      spinner.rotation.z = value * 2.6;
    },
    // Show or hide the whole cockpit (called by cameras.js).
    setVisible(on) {
      root.visible = on;
    },
  };
}
