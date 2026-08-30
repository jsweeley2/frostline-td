// hud.js
// ---------------------------------------------------------------------------
// The stuff drawn ON TOP of the game as normal web page bits (not 3D):
//   - your speed
//   - which camera you're in
//   - a little reminder of the keys
//   - a Reset button
// It's just HTML floating over the canvas.
// ---------------------------------------------------------------------------

export function createHud({ onReset }) {
  // A see-through panel in the top-left for the readouts.
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; top: 12px; left: 12px; padding: 12px 16px;
    background: rgba(10, 20, 35, 0.55); color: #eaf2ff; border-radius: 10px;
    font-family: system-ui, sans-serif; line-height: 1.5; user-select: none;
    pointer-events: none;`;
  panel.innerHTML = `
    <div style="font-size:28px;font-weight:700"><span id="hud-speed">0</span> km/h</div>
    <div>Camera: <b id="hud-cam">chase</b> <span style="opacity:.7">(C to change)</span></div>
    <div style="opacity:.7;font-size:13px;margin-top:6px">
      WASD / arrows drive &middot; Space handbrake &middot; R respawn
    </div>`;
  document.body.appendChild(panel);

  // The Reset button in the top-right. It CAN be clicked, so it gets pointer events.
  const button = document.createElement('button');
  button.textContent = 'Reset';
  button.style.cssText = `
    position: fixed; top: 12px; right: 12px; padding: 10px 18px;
    background: #ff3355; color: white; border: none; border-radius: 10px;
    font-size: 16px; font-weight: 700; cursor: pointer;
    font-family: system-ui, sans-serif;`;
  button.addEventListener('click', () => {
    onReset();
    button.blur(); // so pressing keys afterwards doesn't re-click the button
  });
  document.body.appendChild(button);

  // Grab the two numbers we update every frame just once, for speed.
  const speedEl = document.getElementById('hud-speed');
  const camEl = document.getElementById('hud-cam');

  return {
    update(speedKmh, cameraMode) {
      speedEl.textContent = Math.round(speedKmh);
      camEl.textContent = cameraMode;
    },
  };
}
