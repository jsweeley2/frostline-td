// ---------------------------------------------------------------------------
// Original sprite art, generated in code and baked into textures.
//
// Every tower and enemy sprite is drawn here with Phaser graphics (layered
// shading, highlights, panels, glowing cores, outlines) and turned into a
// reusable texture. This keeps the art original and license-clean while looking
// like crafted sprites. Call buildGameTextures(scene) once before spawning.
// ---------------------------------------------------------------------------

function bake(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g, w / 2, h / 2, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

const OUTLINE = 0x0a1422;
const ENEMY_OUTLINE = 0x171a22;

// Beveled, shaded metal base platform that tower bodies sit on.
function platform(g, cx, cy) {
  g.fillStyle(0x070b12, 0.35); g.fillEllipse(cx, cy + 15, 36, 11); // ground shadow
  g.fillStyle(0x1a2636, 1); g.fillRoundedRect(cx - 17, cy - 16, 34, 32, 8); // dark body
  g.fillStyle(0x2c3e54, 1); g.fillRoundedRect(cx - 17, cy - 16, 34, 16, 8); // lit top face
  g.fillStyle(0x3a5070, 1); g.fillRoundedRect(cx - 15, cy - 14, 30, 4, 3); // top highlight
  g.lineStyle(1, 0x0c1722, 0.7); g.lineBetween(cx - 16, cy + 1, cx + 16, cy + 1); // seam
  g.lineStyle(2, OUTLINE, 1); g.strokeRoundedRect(cx - 17, cy - 16, 34, 32, 8);
  g.fillStyle(0x55708f, 1);
  const bolts = [[-12, -11], [12, -11], [-12, 11], [12, 11]];
  bolts.forEach(([dx, dy]) => g.fillCircle(cx + dx, cy + dy, 2));
  g.fillStyle(0x9ab6d6, 0.85);
  bolts.forEach(([dx, dy]) => g.fillCircle(cx + dx - 0.6, cy + dy - 0.6, 0.9));
}

export function buildGameTextures(scene) {
  // ===== TOWERS (40x40) =====

  bake(scene, 'tower_sniper', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x24364f, 1); g.fillCircle(cx, cy, 12);
    g.fillStyle(0x3b5b8c, 1); g.fillCircle(cx, cy, 10);
    g.fillStyle(0x6f93c8, 0.9); g.fillCircle(cx - 3, cy - 3, 5);
    g.lineStyle(2, OUTLINE, 1); g.strokeCircle(cx, cy, 10);
    g.fillStyle(OUTLINE, 1); g.fillCircle(cx, cy, 4.2);
    g.fillStyle(0xbcd4ff, 1); g.fillCircle(cx, cy, 2.6);
    g.fillStyle(0xffffff, 0.95); g.fillCircle(cx - 1, cy - 1, 1);
  });
  bake(scene, 'tower_sniper_barrel', 30, 10, (g) => {
    g.fillStyle(0x33455e, 1); g.fillRoundedRect(2, 2, 24, 6, 2);
    g.fillStyle(0x8aa3c6, 1); g.fillRoundedRect(2, 2, 24, 3, 2);
    g.fillStyle(0xcfe0ff, 0.9); g.fillRect(3, 2.4, 22, 1.2);
    g.lineStyle(1, OUTLINE, 1); g.strokeRoundedRect(2, 2, 24, 6, 2);
    g.fillStyle(0x1c2738, 1); g.fillRect(22, 0.5, 7, 9); // muzzle brake
    g.fillStyle(0x46607d, 1); g.fillRect(24, 2.5, 5, 1.2); g.fillRect(24, 6, 5, 1.2);
  });

  bake(scene, 'tower_plasma', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x2a1747, 1); g.fillCircle(cx, cy, 13);
    g.fillStyle(0x4a2a78, 1); g.fillCircle(cx, cy, 11);
    g.fillStyle(0x7a3bd1, 1); g.fillCircle(cx, cy, 8);
    g.fillStyle(0xa56fe8, 0.9); g.fillCircle(cx - 2, cy - 2, 5);
    g.fillStyle(0xe3b8ff, 1); g.fillCircle(cx, cy, 3.5);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(cx - 1, cy - 1, 1.4);
    g.lineStyle(2, OUTLINE, 1); g.strokeCircle(cx, cy, 13);
    // vents
    g.fillStyle(0x1b0f30, 1); g.fillRect(cx - 13, cy - 1, 3, 2); g.fillRect(cx + 10, cy - 1, 3, 2);
  });
  bake(scene, 'tower_plasma_barrel', 28, 14, (g) => {
    g.fillStyle(0x2a1747, 1); g.fillRoundedRect(2, 2, 20, 10, 3);
    g.fillStyle(0x4a2a78, 1); g.fillRoundedRect(2, 2, 20, 5, 3);
    g.lineStyle(1, OUTLINE, 1); g.strokeRoundedRect(2, 2, 20, 10, 3);
    g.fillStyle(0x1b0f30, 1); g.fillCircle(22, 7, 5.5);
    g.fillStyle(0xe3b8ff, 1); g.fillCircle(22, 7, 3.6);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(21, 6, 1.3);
  });

  bake(scene, 'tower_tesla', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x0e2c28, 1); g.fillRoundedRect(cx - 7, cy - 2, 14, 16, 3);
    g.fillStyle(0x1d6157, 1); g.fillRoundedRect(cx - 7, cy - 2, 14, 5, 3);
    // copper coil rings
    g.fillStyle(0x9be8dd, 1);
    for (let i = 0; i < 3; i++) g.fillRoundedRect(cx - (11 - i * 2), cy + 9 - i * 5, (11 - i * 2) * 2, 3, 1);
    // insulator stalk
    g.fillStyle(0x0a1f1c, 1); g.fillRect(cx - 1.5, cy - 12, 3, 8);
    // plasma orb
    g.fillStyle(OUTLINE, 1); g.fillCircle(cx, cy - 12, 8);
    g.fillStyle(0x2f9e8f, 1); g.fillCircle(cx, cy - 12, 6.5);
    g.fillStyle(0xb8fff2, 1); g.fillCircle(cx, cy - 12, 4.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(cx - 1.5, cy - 13, 2);
    g.lineStyle(1, 0xffffff, 0.8);
    g.lineBetween(cx, cy - 12, cx - 5, cy - 6); g.lineBetween(cx, cy - 12, cx + 5, cy - 7);
  });

  bake(scene, 'tower_frost', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x1f5d72, 1); g.fillCircle(cx, cy, 12);
    g.fillStyle(0x4fb6d6, 1); g.fillCircle(cx, cy, 10);
    g.lineStyle(2, OUTLINE, 1); g.strokeCircle(cx, cy, 10);
    // faceted ice shards
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ex = cx + Math.cos(a) * 11, ey = cy + Math.sin(a) * 11;
      g.fillStyle(0xbfeaff, 1);
      g.fillPoints([{ x: cx, y: cy }, { x: cx + Math.cos(a + 0.22) * 4, y: cy + Math.sin(a + 0.22) * 4 }, { x: ex, y: ey }], true);
      g.fillStyle(0xe6fbff, 1);
      g.fillPoints([{ x: cx, y: cy }, { x: cx + Math.cos(a - 0.22) * 4, y: cy + Math.sin(a - 0.22) * 4 }, { x: ex, y: ey }], true);
    }
    g.fillStyle(0xffffff, 1); g.fillCircle(cx, cy, 3);
  });

  bake(scene, 'tower_tripwire', 34, 34, (g, cx, cy) => {
    g.lineStyle(3, 0x4a3208, 1);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.lineBetween(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15);
    }
    const dia = [{ x: cx, y: cy - 12 }, { x: cx + 12, y: cy }, { x: cx, y: cy + 12 }, { x: cx - 12, y: cy }];
    g.fillStyle(0xc99a2a, 1); g.fillPoints(dia, true);
    g.fillStyle(0xf2c14e, 1);
    g.fillPoints([{ x: cx, y: cy - 12 }, { x: cx + 12, y: cy }, { x: cx, y: cy }, { x: cx - 12, y: cy }], true);
    g.lineStyle(2, 0x6e5210, 1); g.strokePoints(dia, true);
    // warning chevrons
    g.fillStyle(0x2a1f06, 0.8);
    g.fillPoints([{ x: cx - 5, y: cy }, { x: cx - 1, y: cy - 4 }, { x: cx - 1, y: cy + 4 }], true);
    g.fillPoints([{ x: cx + 1, y: cy - 4 }, { x: cx + 5, y: cy }, { x: cx + 1, y: cy + 4 }], true);
    // glowing trigger node
    g.fillStyle(0xffe9a8, 1); g.fillCircle(cx, cy, 3);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(cx - 0.6, cy - 0.6, 1);
  });

  // ===== ENEMIES (no baked shadow; the entity adds one) ====================
  // Most face right (the direction of travel toward the base).

  bake(scene, 'enemy_lightScout', 28, 22, (g, cx, cy) => {
    g.fillStyle(0x66f0ff, 0.8); g.fillCircle(cx - 11, cy - 3, 2.5); // thrusters
    g.fillStyle(0x66f0ff, 0.8); g.fillCircle(cx - 11, cy + 3, 2.5);
    g.fillStyle(0xcf7a1f, 1); // fins
    g.fillPoints([{ x: cx - 6, y: cy - 6 }, { x: cx + 2, y: cy - 7 }, { x: cx - 2, y: cy - 2 }], true);
    g.fillPoints([{ x: cx - 6, y: cy + 6 }, { x: cx + 2, y: cy + 7 }, { x: cx - 2, y: cy + 2 }], true);
    const hull = [{ x: cx - 9, y: cy - 6 }, { x: cx - 9, y: cy + 6 }, { x: cx + 12, y: cy }];
    g.fillStyle(0xffb24d, 1); g.fillPoints(hull, true);
    g.fillStyle(0xffd591, 0.95); g.fillPoints([{ x: cx - 9, y: cy - 6 }, { x: cx + 3, y: cy - 2 }, { x: cx - 4, y: cy }], true);
    g.lineStyle(2, ENEMY_OUTLINE, 1); g.strokePoints(hull, true);
    g.fillStyle(0x0a2230, 1); g.fillCircle(cx + 1, cy, 3.4); // canopy
    g.fillStyle(0xbfeaff, 1); g.fillCircle(cx + 1, cy, 2.4);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(cx, cy - 1, 0.9);
  });

  bake(scene, 'enemy_runner', 24, 16, (g, cx, cy) => {
    g.fillStyle(0xff9ad0, 0.85); g.fillCircle(cx - 9, cy, 2.4); // thruster
    const hull = [{ x: cx - 8, y: cy - 5 }, { x: cx - 8, y: cy + 5 }, { x: cx + 10, y: cy }];
    g.fillStyle(0xff5d8f, 1); g.fillPoints(hull, true);
    g.fillStyle(0xff9ab8, 0.9); g.fillPoints([{ x: cx - 8, y: cy - 5 }, { x: cx + 4, y: cy - 1 }, { x: cx - 3, y: cy }], true);
    g.lineStyle(2, ENEMY_OUTLINE, 1); g.strokePoints(hull, true);
    g.fillStyle(0xffe1ec, 1); g.fillRect(cx - 7, cy - 3, 4, 1.6); g.fillRect(cx - 7, cy + 1.4, 4, 1.6); // fins
    g.fillStyle(0xfff0a0, 1); g.fillRect(cx + 1, cy - 1.4, 5, 2.8); // visor slit
  });

  bake(scene, 'enemy_heavyWalker', 38, 36, (g, cx, cy) => {
    // legs with knee joints
    g.fillStyle(0x2b2740, 1);
    const leg = (sx, sy) => {
      g.fillRoundedRect(cx + sx * 11 - 2, cy - 2, 4, 9, 1);
      g.fillRoundedRect(cx + sx * 11 - 4 * (sx > 0 ? 0 : 1), cy + 6, 6, 4, 1);
      g.fillCircle(cx + sx * 11, cy + 6, 2.5);
    };
    leg(-1, 1); leg(1, 1);
    g.fillStyle(0x3a3550, 1);
    g.fillRect(cx - 11, cy + 8, 5, 3); g.fillRect(cx + 6, cy + 8, 5, 3);
    // torso
    g.fillStyle(0x6a608a, 1); g.fillRoundedRect(cx - 13, cy - 13, 26, 24, 6);
    g.fillStyle(0x7a6f9b, 1); g.fillRoundedRect(cx - 13, cy - 13, 26, 12, 6);
    g.fillStyle(0x9a8fbb, 0.8); g.fillRoundedRect(cx - 11, cy - 11, 22, 4, 2);
    g.lineStyle(2, ENEMY_OUTLINE, 1); g.strokeRoundedRect(cx - 13, cy - 13, 26, 24, 6);
    g.lineStyle(1, 0x2b2740, 0.8); g.lineBetween(cx - 13, cy, cx + 13, cy); // panel seam
    // rivets
    g.fillStyle(0x4a4466, 1);
    [[-10, -9], [10, -9], [-10, 8], [10, 8]].forEach(([dx, dy]) => g.fillCircle(cx + dx, cy + dy, 1.4));
    // head cannon + eye
    g.fillStyle(0x4a4466, 1); g.fillRoundedRect(cx + 6, cy - 6, 11, 11, 2);
    g.fillStyle(0x2b2740, 1); g.fillRect(cx + 15, cy - 2, 3, 4);
    g.fillStyle(0xff5a5a, 1); g.fillCircle(cx + 11, cy, 2.6);
    g.fillStyle(0xffd0d0, 0.9); g.fillCircle(cx + 10.4, cy - 0.6, 1);
  });

  bake(scene, 'enemy_disruptor', 30, 30, (g, cx, cy) => {
    // emitter antenna
    g.lineStyle(2, 0x6f53b0, 1); g.lineBetween(cx, cy - 12, cx, cy - 17);
    g.fillStyle(0xfff0ff, 1); g.fillCircle(cx, cy - 17, 2);
    const dia = [{ x: cx, y: cy - 12 }, { x: cx + 12, y: cy }, { x: cx, y: cy + 12 }, { x: cx - 12, y: cy }];
    g.fillStyle(0x7a4fd0, 1); g.fillPoints(dia, true);
    g.fillStyle(0x9b6cff, 1); g.fillPoints([{ x: cx, y: cy - 12 }, { x: cx + 12, y: cy }, { x: cx, y: cy + 12 }], true); // lit right facet
    g.fillStyle(0xb89bff, 0.85); g.fillPoints([{ x: cx, y: cy - 12 }, { x: cx + 7, y: cy - 5 }, { x: cx, y: cy }, { x: cx - 7, y: cy - 5 }], true); // top facet
    g.lineStyle(2, ENEMY_OUTLINE, 1); g.strokePoints(dia, true);
    g.lineBetween(cx, cy - 12, cx, cy + 12); // facet edge
    g.fillStyle(0xfff0ff, 1); g.fillCircle(cx, cy, 4.2); // core
    g.fillStyle(0xffffff, 1); g.fillCircle(cx - 1, cy - 1, 1.6);
  });

  bake(scene, 'enemy_juggernaut', 48, 44, (g, cx, cy) => {
    // treads with wheels
    g.fillStyle(0x14161d, 1);
    g.fillRoundedRect(cx - 20, cy - 15, 8, 30, 3);
    g.fillRoundedRect(cx + 12, cy - 15, 8, 30, 3);
    g.fillStyle(0x33384a, 1);
    [-9, 0, 9].forEach((dy) => { g.fillCircle(cx - 16, cy + dy, 2.4); g.fillCircle(cx + 16, cy + dy, 2.4); });
    // hull (layered armor)
    g.fillStyle(0x363b4c, 1); g.fillRoundedRect(cx - 14, cy - 16, 28, 32, 6);
    g.fillStyle(0x444a5e, 1); g.fillRoundedRect(cx - 14, cy - 16, 28, 16, 6);
    g.fillStyle(0x5a6076, 0.85); g.fillRoundedRect(cx - 11, cy - 13, 22, 4, 2);
    g.lineStyle(3, 0x14161d, 1); g.strokeRoundedRect(cx - 14, cy - 16, 28, 32, 6);
    // central armor plate + bolts
    g.fillStyle(0x636b82, 1); g.fillRoundedRect(cx - 11, cy - 10, 22, 10, 3);
    g.fillStyle(0x2b3040, 1);
    [[-8, -6], [8, -6], [-8, 12], [8, 12]].forEach(([dx, dy]) => g.fillCircle(cx + dx, cy + dy, 1.6));
    // battle scratches
    g.lineStyle(1, 0x8a90a6, 0.5); g.lineBetween(cx - 6, cy - 4, cx + 2, cy - 2);
    // turret cannon
    g.fillStyle(0x2b3040, 1); g.fillRect(cx + 9, cy - 3, 9, 6);
    // glowing eyes
    g.fillStyle(0xff5a5a, 1); g.fillCircle(cx - 5, cy + 6, 3); g.fillCircle(cx + 5, cy + 6, 3);
    g.fillStyle(0xffd0d0, 0.9); g.fillCircle(cx - 5.6, cy + 5.4, 1); g.fillCircle(cx + 4.4, cy + 5.4, 1);
  });
}
