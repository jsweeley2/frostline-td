// carmaker.js
// ---------------------------------------------------------------------------
// "Design Your Car" - a little pop-up where you pick a colour and slide Speed,
// Grip and Size, and it builds a real car out of your choices.
//
// makeCarSpec() turns the simple choices into the same kind of entry cars.js
// uses (mass, engine, grip, suspension, body shape). Everything is SCALED from
// the Race Car - which we know drives and jumps well - so your car always works
// no matter what you pick (it won't explode or get stuck on ramps).
//
// Your choices are saved in the browser, so your car is still there next time.
// ---------------------------------------------------------------------------

const CAR_KEY = 'stuntDriver.customCar.v1';

// Default choices, used the first time before you've designed anything.
const DEFAULTS = { name: 'My Car', color: '#a970ff', speed: 3, grip: 3, size: 3 };

export function loadCustomCarOpts() {
  try {
    const raw = localStorage.getItem(CAR_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    /* storage blocked */
  }
  return null;
}
function saveCustomCarOpts(opts) {
  try {
    localStorage.setItem(CAR_KEY, JSON.stringify(opts));
  } catch (e) {
    /* storage blocked */
  }
}

// "#a970ff" -> 0xa970ff
function hexToNum(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Turn the simple choices into a full car spec. `speed`, `grip`, `size` are 1-5.
export function makeCarSpec(opts) {
  const o = { ...DEFAULTS, ...opts };
  const size = o.size; // 1..5
  const scale = 0.85 + (size - 1) * 0.13; // small (0.85) to big (1.37)
  const mass = 300 + (size - 1) * 170; // bigger = heavier (and tougher)
  const accel = 4 + (o.speed - 1) * 1.5; // how hard it accelerates (m/s^2-ish)
  const engineForce = Math.round((mass * accel) / 4); // shared over 4 wheels
  const frictionSlip = 3.0 + (o.grip - 1) * 0.7; // more grip = less sliding

  return {
    name: o.name || 'My Car',
    unlockedByDefault: true,
    custom: true,
    stats: { speed: o.speed, grip: o.grip, tough: size },
    blurb: 'Your own custom car!',

    mass,
    engineForce,
    maxSteer: 0.5,
    brakeForce: 20,
    handbrakeForce: Math.round(90 * scale),
    suspension: {
      stiffness: 55,
      restLength: 0.5 * scale,
      travel: 0.4 * scale,
      compression: 4.4,
      relaxation: 2.3,
      maxForce: 100000 + mass * 250, // strong enough to hold up a heavier car
    },
    frictionSlip,
    rollInfluence: 0.14,
    body: {
      chassis: { width: 1.8 * scale, height: 0.5 * scale, length: 3.0 * scale },
      cabin: { width: 1.4 * scale, height: 0.45 * scale, length: 1.6 * scale, offsetZ: -0.2 },
      collision: { width: 1.6 * scale, height: 0.4 * scale, length: 2.0 * scale, offsetY: 0.12 * scale + 0.02 },
      color: hexToNum(o.color),
      cabinColor: 0x1a1a26,
    },
    wheel: { radius: 0.45 * scale, width: 0.3 * scale, color: 0x111111 },
    axleWidth: 0.95 * scale,
    frontZ: -1.6 * scale,
    backZ: 1.6 * scale,
    wheelY: -0.25 * scale,
  };
}

// Build the pop-up. onSave gets the finished (spec, opts) when you save.
export function createCarMaker({ onSave }) {
  let open = false;
  let opts = loadCustomCarOpts() || { ...DEFAULTS };

  // Full-screen dim backdrop with a card in the middle.
  const root = document.createElement('div');
  root.style.cssText = `
    position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    background: rgba(8,16,28,0.75); z-index: 40; font-family: system-ui, sans-serif;`;
  document.body.appendChild(root);

  const slider = (id, label, value) => `
    <label style="display:block; margin:14px 0 4px; font-weight:700">${label}:
      <span id="${id}-val" style="color:#ffd23f">${value}</span></label>
    <input id="${id}" type="range" min="1" max="5" step="1" value="${value}"
      style="width:100%; accent-color:#ffd23f; cursor:pointer">`;

  root.innerHTML = `
    <div style="background:rgba(12,22,38,0.98); color:#eaf2ff; padding:26px 30px;
      border-radius:18px; width:340px; max-width:92vw; border:2px solid #a970ff">
      <div style="font-size:26px; font-weight:800; margin-bottom:12px">&#127912; Design Your Car</div>

      <label style="display:block; font-weight:700; margin-bottom:4px">Name</label>
      <input id="cm-name" type="text" maxlength="16" value="${opts.name}"
        style="width:100%; box-sizing:border-box; padding:8px; border-radius:8px; border:none;
        font-family:inherit; font-size:15px">

      <label style="display:flex; align-items:center; gap:10px; font-weight:700; margin-top:14px">
        Colour
        <input id="cm-color" type="color" value="${opts.color}"
          style="width:48px; height:34px; border:none; background:none; cursor:pointer">
      </label>

      ${slider('cm-speed', 'Speed', opts.speed)}
      ${slider('cm-grip', 'Grip', opts.grip)}
      ${slider('cm-size', 'Size', opts.size)}

      <div style="display:flex; gap:10px; margin-top:22px">
        <button id="cm-save" style="flex:1; padding:12px; border:none; border-radius:10px;
          background:#57d38c; color:#08131f; font-size:16px; font-weight:800; cursor:pointer">Save &amp; Drive</button>
        <button id="cm-cancel" style="padding:12px 16px; border:none; border-radius:10px;
          background:rgba(255,255,255,0.15); color:#eaf2ff; font-size:16px; font-weight:700; cursor:pointer">Cancel</button>
      </div>
    </div>`;

  const $ = (id) => root.querySelector(id);
  // Live-update the number next to each slider as you drag it.
  for (const key of ['speed', 'grip', 'size']) {
    const input = $(`#cm-${key}`);
    input.addEventListener('input', () => {
      $(`#cm-${key}-val`).textContent = input.value;
    });
  }

  $('#cm-cancel').addEventListener('click', () => close());
  $('#cm-save').addEventListener('click', () => {
    opts = {
      name: $('#cm-name').value.trim() || 'My Car',
      color: $('#cm-color').value,
      speed: Number($('#cm-speed').value),
      grip: Number($('#cm-grip').value),
      size: Number($('#cm-size').value),
    };
    saveCustomCarOpts(opts);
    onSave(makeCarSpec(opts), opts);
    close();
  });

  function openMaker() {
    // Fill the controls with the latest saved choices before showing.
    opts = loadCustomCarOpts() || { ...DEFAULTS };
    $('#cm-name').value = opts.name;
    $('#cm-color').value = opts.color;
    for (const key of ['speed', 'grip', 'size']) {
      $(`#cm-${key}`).value = opts[key];
      $(`#cm-${key}-val`).textContent = opts[key];
    }
    root.style.display = 'flex';
    open = true;
  }
  function close() {
    root.style.display = 'none';
    open = false;
  }

  return { open: openMaker, isOpen: () => open };
}
