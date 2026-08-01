// controls.js
// ---------------------------------------------------------------------------
// Reads the keyboard and turns it into a simple "input" object the car can use.
// It doesn't know anything about the car or the physics - it just answers the
// question "what keys are held down right now?".
//
//   W / Up arrow    - forward   (and front-flip in the air)
//   S / Down arrow  - backward  (and back-flip in the air)
//   A / Left arrow  - steer left  (and spin left in the air)
//   D / Right arrow - steer right (and spin right in the air)
//   Space           - handbrake (slides!)
//   C               - change camera
//   R               - respawn (flip the car back upright at the start)
// ---------------------------------------------------------------------------

export function createControls({ onCamera, onRespawn }) {
  // Which keys are held right now.
  const keys = {};

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // C and R should fire ONCE per press, not every frame, so we handle them
    // here on the key-down moment.
    if (e.code === 'KeyC') onCamera();
    if (e.code === 'KeyR') onRespawn();

    // Stop the arrow keys and space from scrolling the page.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  const held = (a, b) => (keys[a] || keys[b] ? 1 : 0);

  // Build the input object for this frame.
  function getInput() {
    // Forward is +1, backward is -1.
    const throttle = held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown');
    // Left is +1, right is -1. (If your car steers the wrong way, swap these.)
    const steer = held('KeyA', 'ArrowLeft') - held('KeyD', 'ArrowRight');
    const handbrake = !!(keys['Space']);
    // Gently brake when you are not pressing the gas, so the car coasts to a stop.
    const brake = throttle === 0 && !handbrake;

    return { throttle, steer, handbrake, brake };
  }

  return { getInput };
}
