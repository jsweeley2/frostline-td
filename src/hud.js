// hud.js
// ---------------------------------------------------------------------------
// Everything drawn ON TOP of the 3D game as normal web page bits:
//   - top-left:   your speed + which camera you're in
//   - top-middle: the level name, how many stars you've got, and level buttons
//   - top-right:  a Reset button
//   - bottom:     the garage - a card for each car (locked ones show a padlock)
//   - middle:     a "Level Complete!" banner when you beat a level
// ---------------------------------------------------------------------------

// Turn a colour number like 0xff3355 into a CSS colour like "#ff3355".
function cssColor(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

export function createHud(opts) {
  const {
    onReset,
    cars,
    levels,
    currentCar,
    onSelectCar,
    onSelectLevel,
    isCarUnlocked,
    isLevelUnlocked,
    onNextLevel,
    onReplayLevel,
    onBuild,
    onPlayCustom,
  } = opts;

  let activeCar = currentCar;
  let activeLevel = 0;

  // ---- top-left: speed + camera ----
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; top: 12px; left: 12px; padding: 12px 16px;
    background: rgba(10, 20, 35, 0.55); color: #eaf2ff; border-radius: 10px;
    font-family: system-ui, sans-serif; line-height: 1.5; user-select: none;
    pointer-events: none;`;
  panel.innerHTML = `
    <div style="font-size:28px;font-weight:700"><span id="hud-speed">0</span> km/h</div>
    <div>Camera: <b id="hud-cam">chase</b> <span style="opacity:.7">(C)</span></div>
    <div style="opacity:.7;font-size:13px;margin-top:6px">
      WASD / arrows drive &middot; Space handbrake &middot; R respawn
    </div>`;
  document.body.appendChild(panel);
  const speedEl = panel.querySelector('#hud-speed');
  const camEl = panel.querySelector('#hud-cam');

  // ---- top-middle: level name, star count, level buttons ----
  const levelBar = document.createElement('div');
  levelBar.style.cssText = `
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    font-family: system-ui, sans-serif; color: #eaf2ff; user-select: none;`;
  levelBar.innerHTML = `
    <div style="background:rgba(10,20,35,0.55);padding:8px 16px;border-radius:10px;text-align:center;pointer-events:none">
      <div style="font-size:13px;opacity:.7;letter-spacing:.05em;text-transform:uppercase">Level <span id="hud-levelnum">1</span></div>
      <div style="font-size:20px;font-weight:700"><span id="hud-levelname">-</span></div>
      <div style="font-size:22px;font-weight:700;margin-top:2px">&#11088; <span id="hud-stars">0 / 0</span></div>
    </div>`;
  const levelBtnRow = document.createElement('div');
  levelBtnRow.style.cssText = 'display:flex; gap:6px;';
  levelBar.appendChild(levelBtnRow);
  document.body.appendChild(levelBar);

  const levelNumEl = levelBar.querySelector('#hud-levelnum');
  const levelNameEl = levelBar.querySelector('#hud-levelname');
  const starsEl = levelBar.querySelector('#hud-stars');

  // One little button per level.
  const levelBtns = levels.map((name, i) => {
    const b = document.createElement('button');
    b.style.cssText = `
      pointer-events: auto; cursor: pointer; min-width: 34px; padding: 6px 8px;
      border: 2px solid transparent; border-radius: 8px; color: #eaf2ff;
      background: rgba(10,20,35,0.6); font-family: inherit; font-weight: 700;`;
    b.addEventListener('click', () => {
      onSelectLevel(i);
      b.blur();
    });
    levelBtnRow.appendChild(b);
    return b;
  });

  // A row for the track builder: build your own track, or play the one you saved.
  const builderRow = document.createElement('div');
  builderRow.style.cssText = 'display:flex; gap:6px;';
  const buildBtn = document.createElement('button');
  buildBtn.innerHTML = '&#128296; Build';
  buildBtn.style.cssText = `
    pointer-events:auto; cursor:pointer; padding:6px 12px; border:none; border-radius:8px;
    background:#3d7dff; color:white; font-family:inherit; font-weight:700; font-size:13px;`;
  buildBtn.addEventListener('click', () => {
    onBuild();
    buildBtn.blur();
  });
  const myTrackBtn = document.createElement('button');
  myTrackBtn.innerHTML = '&#9654; My Track';
  myTrackBtn.style.cssText = `
    pointer-events:auto; cursor:pointer; padding:6px 12px; border:none; border-radius:8px;
    background:rgba(255,255,255,0.15); color:#eaf2ff; font-family:inherit; font-weight:700; font-size:13px;`;
  myTrackBtn.addEventListener('click', () => {
    onPlayCustom();
    myTrackBtn.blur();
  });
  builderRow.appendChild(buildBtn);
  builderRow.appendChild(myTrackBtn);
  levelBar.appendChild(builderRow);

  // ---- top-right: Reset ----
  const button = document.createElement('button');
  button.textContent = 'Reset';
  button.style.cssText = `
    position: fixed; top: 12px; right: 12px; padding: 10px 18px;
    background: #ff3355; color: white; border: none; border-radius: 10px;
    font-size: 16px; font-weight: 700; cursor: pointer; font-family: system-ui, sans-serif;`;
  button.addEventListener('click', () => {
    onReset();
    button.blur();
  });
  document.body.appendChild(button);

  // ---- bottom: the garage (a card per car) ----
  const garage = document.createElement('div');
  garage.style.cssText = `
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 10px; font-family: system-ui, sans-serif; user-select: none;`;
  document.body.appendChild(garage);

  const cardsById = {};
  cars.forEach((carInfo, i) => {
    const card = document.createElement('button');
    card.style.cssText = `
      position: relative; pointer-events: auto; cursor: pointer; width: 120px; padding: 8px;
      border: 2px solid transparent; border-radius: 12px; color: #eaf2ff;
      background: rgba(10, 20, 35, 0.6); text-align: left; font-family: inherit;`;

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
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:16px;height:16px;border-radius:4px;background:${cssColor(carInfo.color)}"></span>
        <b style="font-size:14px">${carInfo.name}</b>
        <span style="margin-left:auto;opacity:.6;font-size:12px">${i + 1}</span>
      </div>` +
      bar('SPD', stats.speed) +
      bar('GRP', stats.grip) +
      bar('TUF', stats.tough) +
      // The padlock overlay, shown only while the car is locked.
      `<div class="lock" style="position:absolute;inset:0;border-radius:12px;
        background:rgba(6,10,18,0.72);display:none;align-items:center;justify-content:center;
        font-size:26px">&#128274;</div>`;

    card.addEventListener('click', () => {
      onSelectCar(carInfo.id); // main.js ignores it if the car is locked
      card.blur();
    });

    garage.appendChild(card);
    cardsById[carInfo.id] = card;
  });

  // ---- middle: the "Level Complete!" banner (hidden until you win) ----
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    font-family: system-ui, sans-serif; pointer-events: none; z-index: 30;`;
  banner.innerHTML = `
    <div style="pointer-events:auto; background:rgba(10,20,35,0.92); color:#eaf2ff;
      padding:32px 40px; border-radius:18px; text-align:center; max-width:440px;
      border:2px solid #ffd23f;">
      <div style="font-size:34px;font-weight:800;color:#ffd23f">&#11088; Level Complete!</div>
      <div id="win-level" style="font-size:18px;margin-top:4px;opacity:.9"></div>
      <div id="win-unlock" style="font-size:18px;margin-top:12px;font-weight:700;color:#57d38c"></div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
        <button id="win-next" style="padding:12px 20px;border:none;border-radius:10px;
          background:#57d38c;color:#08131f;font-size:16px;font-weight:700;cursor:pointer">Next Level &#8594;</button>
        <button id="win-replay" style="padding:12px 20px;border:none;border-radius:10px;
          background:rgba(255,255,255,0.15);color:#eaf2ff;font-size:16px;font-weight:700;cursor:pointer">Replay</button>
        <button id="win-close" style="padding:12px 20px;border:none;border-radius:10px;
          background:rgba(255,255,255,0.15);color:#eaf2ff;font-size:16px;font-weight:700;cursor:pointer">Keep Driving</button>
      </div>
    </div>`;
  document.body.appendChild(banner);
  const winLevelEl = banner.querySelector('#win-level');
  const winUnlockEl = banner.querySelector('#win-unlock');
  const winNextBtn = banner.querySelector('#win-next');
  const winReplayBtn = banner.querySelector('#win-replay');
  const winCloseBtn = banner.querySelector('#win-close');
  winNextBtn.addEventListener('click', () => {
    hideWin();
    onNextLevel();
  });
  winReplayBtn.addEventListener('click', () => {
    hideWin();
    onReplayLevel();
  });
  winCloseBtn.addEventListener('click', () => {
    hideWin();
    document.body.focus();
  });

  // ---- the functions main.js calls ----

  function setActiveCar(id) {
    activeCar = id;
    refresh();
  }

  function setStars(collected, total) {
    starsEl.textContent = `${collected} / ${total}`;
  }

  function setLevel(index, name, total) {
    activeLevel = index; // index < 0 means a custom track (no numbered level highlighted)
    levelNumEl.textContent = index < 0 ? '★' : index + 1; // a star for custom tracks
    levelNameEl.textContent = name;
    setStars(0, total);
    refresh();
  }

  // Hide or show the whole normal HUD (the track builder hides it while you build).
  const hudEls = [
    [panel, 'block'],
    [levelBar, 'flex'],
    [button, 'block'],
    [garage, 'flex'],
  ];
  function setHudVisible(on) {
    for (const [el, disp] of hudEls) el.style.display = on ? disp : 'none';
  }

  // Re-check every lock and highlight, e.g. after you unlock something.
  function refresh() {
    // Cars: dim + padlock the locked ones, gold border on the active one.
    for (const carInfo of cars) {
      const card = cardsById[carInfo.id];
      const unlocked = isCarUnlocked(carInfo.id);
      const active = carInfo.id === activeCar;
      card.querySelector('.lock').style.display = unlocked ? 'none' : 'flex';
      card.style.cursor = unlocked ? 'pointer' : 'not-allowed';
      card.style.opacity = unlocked ? '1' : '0.75';
      card.style.borderColor = active && unlocked ? '#ffd23f' : 'transparent';
      card.style.background =
        active && unlocked ? 'rgba(30, 45, 70, 0.9)' : 'rgba(10, 20, 35, 0.6)';
    }
    // Levels: show a padlock on locked ones, gold border on the current one.
    levelBtns.forEach((b, i) => {
      const unlocked = isLevelUnlocked(i);
      b.innerHTML = unlocked ? String(i + 1) : '&#128274;';
      b.style.cursor = unlocked ? 'pointer' : 'not-allowed';
      b.style.opacity = unlocked ? '1' : '0.6';
      b.style.borderColor = i === activeLevel ? '#ffd23f' : 'transparent';
    });
  }

  function showWin({ levelName, unlockedCarName, hasNext }) {
    winLevelEl.textContent = `You cleared "${levelName}"!`;
    winUnlockEl.textContent = unlockedCarName ? `🔓 New car unlocked: ${unlockedCarName}!` : '';
    winNextBtn.style.display = hasNext ? '' : 'none';
    banner.style.display = 'flex';
  }

  function hideWin() {
    banner.style.display = 'none';
  }

  return {
    update(speedKmh, cameraMode) {
      speedEl.textContent = Math.round(speedKmh);
      camEl.textContent = cameraMode;
    },
    setActiveCar,
    setStars,
    setLevel,
    refresh,
    showWin,
    hideWin,
    setHudVisible,
  };
}
