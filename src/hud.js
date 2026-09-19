// hud.js
// ---------------------------------------------------------------------------
// The stuff drawn ON TOP of the game as normal web page bits (not 3D):
//   - your speed
//   - which camera you're in
//   - a little reminder of the keys
//   - a Reset button
//   - THE GARAGE: a row of cards at the bottom to pick your car
// It's just HTML floating over the canvas.
// ---------------------------------------------------------------------------

// Turn a colour number like 0xff3355 into a CSS colour like "#ff3355".
function cssColor(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

export function createHud({ onReset, cars, currentCar, onSelectCar }) {
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

  // ---- THE GARAGE: a row of car cards along the bottom ----
  const garage = document.createElement('div');
  garage.style.cssText = `
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 10px; font-family: system-ui, sans-serif; user-select: none;`;
  document.body.appendChild(garage);

  // Remember each car's card so we can highlight the chosen one.
  const cardsById = {};

  cars.forEach((carInfo, i) => {
    const card = document.createElement('button');
    card.style.cssText = `
      pointer-events: auto; cursor: pointer; width: 120px; padding: 8px;
      border: 2px solid transparent; border-radius: 12px; color: #eaf2ff;
      background: rgba(10, 20, 35, 0.6); text-align: left; font-family: inherit;`;

    // A colour strip in the car's colour, plus the number-key hint.
    const strip = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:16px;height:16px;border-radius:4px;background:${cssColor(carInfo.color)}"></span>
        <b style="font-size:14px">${carInfo.name}</b>
        <span style="margin-left:auto;opacity:.6;font-size:12px">${i + 1}</span>
      </div>`;

    // Three little 1-5 stat bars.
    const stats = carInfo.stats || { speed: 3, grip: 3, tough: 3 };
    const bar = (label, value) => `
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;margin-top:2px">
        <span style="width:14px;opacity:.7">${label}</span>
        <span style="flex:1;display:flex;gap:2px">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<span style="flex:1;height:6px;border-radius:2px;background:${
                  n <= value ? '#57d38c' : 'rgba(255,255,255,0.18)'
                }"></span>`
            )
            .join('')}
        </span>
      </div>`;

    card.innerHTML =
      strip + bar('SPD', stats.speed) + bar('GRP', stats.grip) + bar('TUF', stats.tough);

    card.addEventListener('click', () => {
      onSelectCar(carInfo.id);
      card.blur();
    });

    garage.appendChild(card);
    cardsById[carInfo.id] = card;
  });

  // Highlight the chosen car (bright border) and dim the rest.
  function setActiveCar(id) {
    for (const [cardId, card] of Object.entries(cardsById)) {
      const active = cardId === id;
      card.style.borderColor = active ? '#ffd23f' : 'transparent';
      card.style.background = active ? 'rgba(30, 45, 70, 0.9)' : 'rgba(10, 20, 35, 0.6)';
    }
  }
  setActiveCar(currentCar);

  // Grab the two numbers we update every frame just once, for speed.
  const speedEl = document.getElementById('hud-speed');
  const camEl = document.getElementById('hud-cam');

  return {
    update(speedKmh, cameraMode) {
      speedEl.textContent = Math.round(speedKmh);
      camEl.textContent = cameraMode;
    },
    setActiveCar,
  };
}
