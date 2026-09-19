// builder.js
// ---------------------------------------------------------------------------
// THE TRACK BUILDER. A "build mode" where you look down at the ground and click
// to place ramps and stars on a grid, then save it and drive it.
//
// It stores your track as plain data - { ramps: [...], stars: [...] } - which is
// exactly the same shape as a level in levels.js. That means world.js can build
// your custom track with the very same buildLevel() it uses for the real levels,
// and it saves to the browser so your track is still there next time.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { buildLevel } from './world.js';

const CELL = 6; // grid squares are 6 metres (same as a ramp is wide)
const TRACK_KEY = 'stuntDriver.customTrack.v1';
const STAR_Y = 1; // builder stars sit on the ground

// Load / save the custom track from the browser.
export function loadCustomTrack() {
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { ramps: d.ramps || [], stars: d.stars || [] };
    }
  } catch (e) {
    /* storage blocked */
  }
  return { ramps: [], stars: [] };
}
function saveCustomTrack(data) {
  try {
    localStorage.setItem(TRACK_KEY, JSON.stringify(data));
  } catch (e) {
    /* storage blocked */
  }
}

export function createBuilder({ scene, world, camera, canvas, onPlay, onExit }) {
  let active = false;
  let data = loadCustomTrack(); // { ramps:[{x,z,yaw}], stars:[[x,y,z]] }
  let preview = null; // the buildLevel handle showing what you've placed
  let tool = 'ramp'; // 'ramp' | 'star' | 'erase'
  let yaw = 0; // ramp rotation in radians

  // Where the overhead build camera sits and looks.
  const CAM_POS = new THREE.Vector3(0, 78, 34);
  const CAM_LOOK = new THREE.Vector3(0, 0, -34);

  // For turning a mouse click into a spot on the ground.
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();

  // A grid you can see while building.
  const grid = new THREE.GridHelper(96, 16, 0xffffff, 0xffffff);
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  grid.position.set(0, 0.03, -30);
  grid.visible = false;
  scene.add(grid);

  // ---- the build-mode toolbar (hidden until you enter build mode) ----
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    display: none; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center;
    background: rgba(10,20,35,0.8); padding: 10px 14px; border-radius: 12px;
    font-family: system-ui, sans-serif; color: #eaf2ff; user-select: none; max-width: 96vw;`;
  document.body.appendChild(bar);

  function mkBtn(label, onClick, bg) {
    const b = document.createElement('button');
    b.innerHTML = label;
    b.style.cssText = `
      pointer-events: auto; cursor: pointer; padding: 8px 12px; border: 2px solid transparent;
      border-radius: 9px; color: #eaf2ff; background: ${bg || 'rgba(255,255,255,0.12)'};
      font-family: inherit; font-weight: 700; font-size: 14px;`;
    b.addEventListener('click', () => {
      onClick();
      b.blur();
    });
    bar.appendChild(b);
    return b;
  }

  const title = document.createElement('span');
  title.textContent = 'BUILD:';
  title.style.cssText = 'font-weight:800; opacity:.8; letter-spacing:.05em;';
  bar.appendChild(title);

  const rampBtn = mkBtn('&#128260; Ramp', () => setTool('ramp'));
  const starBtn = mkBtn('&#11088; Star', () => setTool('star'));
  const eraseBtn = mkBtn('&#10060; Erase', () => setTool('erase'));
  const rotateBtn = mkBtn('&#8635; Rotate', () => {
    yaw = (yaw + Math.PI / 2) % (Math.PI * 2);
    updateToolHighlights();
  });
  mkBtn('Clear', () => {
    data = { ramps: [], stars: [] };
    rebuild();
  });
  mkBtn('&#128190; Save', () => {
    saveCustomTrack(data);
    flash('Saved!');
  });
  mkBtn('&#9654; Play', () => {
    saveCustomTrack(data); // save whenever you test, so you never lose it
    onPlay({ ramps: data.ramps, stars: data.stars });
  }, '#57d38c');
  mkBtn('&#10006; Exit', () => onExit(), 'rgba(255,60,90,0.5)');

  const hint = document.createElement('span');
  hint.style.cssText = 'width:100%; text-align:center; font-size:12px; opacity:.75; margin-top:2px;';
  hint.textContent = 'Click the ground to place. Pick Ramp/Star/Erase. Rotate turns the next ramp.';
  bar.appendChild(hint);

  // A little "Saved!" pop.
  function flash(msg) {
    hint.textContent = msg;
    setTimeout(() => {
      hint.textContent = 'Click the ground to place. Pick Ramp/Star/Erase. Rotate turns the next ramp.';
    }, 1200);
  }

  function setTool(t) {
    tool = t;
    updateToolHighlights();
  }
  function updateToolHighlights() {
    rampBtn.style.borderColor = tool === 'ramp' ? '#ffd23f' : 'transparent';
    starBtn.style.borderColor = tool === 'star' ? '#ffd23f' : 'transparent';
    eraseBtn.style.borderColor = tool === 'erase' ? '#ffd23f' : 'transparent';
    const deg = Math.round((yaw * 180) / Math.PI);
    rotateBtn.innerHTML = `&#8635; Rotate (${deg}&deg;)`;
  }

  // Rebuild the picture of what you've placed so far.
  function rebuild() {
    if (preview) preview.dispose();
    preview = buildLevel(scene, world, { ramps: data.ramps, stars: data.stars });
  }

  // Find a ramp / star already placed on this grid cell.
  const rampAt = (x, z) => data.ramps.findIndex((r) => r.x === x && r.z === z);
  const starAt = (x, z) => data.stars.findIndex((s) => s[0] === x && s[2] === z);

  function place(x, z) {
    if (tool === 'ramp') {
      const i = rampAt(x, z);
      if (i >= 0) {
        // A ramp is already here: if it's the same way round, remove it;
        // otherwise turn it to the new direction.
        if (data.ramps[i].yaw === yaw) data.ramps.splice(i, 1);
        else data.ramps[i].yaw = yaw;
      } else {
        data.ramps.push({ x, z, yaw });
      }
    } else if (tool === 'star') {
      const i = starAt(x, z);
      if (i >= 0) data.stars.splice(i, 1); // click again to remove
      else data.stars.push([x, STAR_Y, z]);
    } else if (tool === 'erase') {
      const ri = rampAt(x, z);
      if (ri >= 0) data.ramps.splice(ri, 1);
      const si = starAt(x, z);
      if (si >= 0) data.stars.splice(si, 1);
    }
    rebuild();
  }

  // Turn a mouse click into a grid cell and place there.
  function onPointerDown(e) {
    if (!active) return;
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    camera.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;
    const gx = Math.round(hitPoint.x / CELL) * CELL;
    const gz = Math.round(hitPoint.z / CELL) * CELL;
    place(gx, gz);
  }
  canvas.addEventListener('pointerdown', onPointerDown);

  function enter() {
    active = true;
    data = loadCustomTrack(); // start from whatever was saved
    bar.style.display = 'flex';
    grid.visible = true;
    setTool('ramp');
    rebuild();
  }

  function exit() {
    active = false;
    bar.style.display = 'none';
    grid.visible = false;
    if (preview) {
      preview.dispose();
      preview = null;
    }
  }

  // Keep the camera looking down at the build area.
  function update() {
    camera.position.copy(CAM_POS);
    camera.lookAt(CAM_LOOK);
  }

  return { enter, exit, update, isActive: () => active };
}
