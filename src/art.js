// ---------------------------------------------------------------------------
// Original sprite art, generated in code and baked into textures.
//
// Instead of bundling third-party image files, every tower and enemy sprite is
// drawn here with Phaser graphics (shaded body, highlights, outline, accents)
// and turned into a reusable texture. This keeps the art original and
// license-clean (per the spec) while looking far better than flat shapes.
//
// Call buildGameTextures(scene) once before spawning anything.
// ---------------------------------------------------------------------------

function bake(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g, w / 2, h / 2, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

const OUTLINE = 0x0a1726;
const ENEMY_OUTLINE = 0x20242e;

// Shared metal base platform that tower bodies sit on.
function platform(g, cx, cy) {
  g.fillStyle(0x0a0f18, 0.3);
  g.fillEllipse(cx, cy + 14, 34, 10);
  g.fillStyle(0x223044, 1);
  g.fillRoundedRect(cx - 17, cy - 16, 34, 32, 7);
  g.fillStyle(0x32465e, 1);
  g.fillRoundedRect(cx - 17, cy - 16, 34, 9, 7);
  g.lineStyle(2, OUTLINE, 1);
  g.strokeRoundedRect(cx - 17, cy - 16, 34, 32, 7);
  g.fillStyle(0x46607d, 1);
  [[-12, -11], [12, -11], [-12, 11], [12, 11]].forEach(([dx, dy]) => g.fillCircle(cx + dx, cy + dy, 1.6));
}

export function buildGameTextures(scene) {
  // ===== TOWERS (40x40) =====

  bake(scene, 'tower_sniper', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x3b5b8c, 1); g.fillCircle(cx, cy, 11);
    g.fillStyle(0x6f93c8, 0.9); g.fillCircle(cx - 3, cy - 3, 5);
    g.lineStyle(2, OUTLINE, 1); g.strokeCircle(cx, cy, 11);
    g.fillStyle(0xbcd4ff, 1); g.fillCircle(cx, cy, 3);
  });
  bake(scene, 'tower_sniper_barrel', 30, 10, (g) => {
    g.fillStyle(0x8aa3c6, 1); g.fillRoundedRect(2, 2, 23, 6, 2);
    g.fillStyle(0xcfe0ff, 0.9); g.fillRect(3, 2, 22, 2);
    g.lineStyle(1, OUTLINE, 1); g.strokeRoundedRect(2, 2, 23, 6, 2);
    g.fillStyle(0x2a3a52, 1); g.fillRect(24, 1, 5, 8);
  });

  bake(scene, 'tower_plasma', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x7a3bd1, 1); g.fillCircle(cx, cy, 12);
    g.fillStyle(0xa56fe8, 0.9); g.fillCircle(cx - 3, cy - 4, 6);
    g.lineStyle(2, OUTLINE, 1); g.strokeCircle(cx, cy, 12);
    g.fillStyle(0xe3b8ff, 1); g.fillCircle(cx, cy, 4);
  });
  bake(scene, 'tower_plasma_barrel', 28, 14, (g) => {
    g.fillStyle(0x4a2a78, 1); g.fillRoundedRect(2, 2, 20, 10, 3);
    g.fillStyle(0x6a3fa8, 0.9); g.fillRect(3, 2, 18, 3);
    g.lineStyle(1, OUTLINE, 1); g.strokeRoundedRect(2, 2, 20, 10, 3);
    g.fillStyle(0xe3b8ff, 1); g.fillCircle(22, 7, 4);
  });

  bake(scene, 'tower_tesla', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x2f9e8f, 1); g.fillRoundedRect(cx - 5, cy - 4, 10, 18, 3);
    g.lineStyle(2, OUTLINE, 1); g.strokeRoundedRect(cx - 5, cy - 4, 10, 18, 3);
    // stacked coil rings
    g.fillStyle(0x9be8dd, 1);
    for (let i = 0; i < 3; i++) g.fillRoundedRect(cx - (9 - i * 2), cy + 6 - i * 6, (9 - i * 2) * 2, 3, 1);
    // crowning orb
    g.fillStyle(0x123b36, 1); g.fillCircle(cx, cy - 8, 8);
    g.fillStyle(0xb8fff2, 1); g.fillCircle(cx, cy - 8, 5);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(cx - 1, cy - 9, 2);
  });

  bake(scene, 'tower_frost', 40, 40, (g, cx, cy) => {
    platform(g, cx, cy);
    g.fillStyle(0x4fb6d6, 1); g.fillCircle(cx, cy, 11);
    g.lineStyle(2, OUTLINE, 1); g.strokeCircle(cx, cy, 11);
    // ice crystal star
    g.fillStyle(0xe6fbff, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      g.lineStyle(3, 0xe6fbff, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
    }
    g.fillStyle(0xffffff, 1); g.fillCircle(cx, cy, 2.5);
  });

  bake(scene, 'tower_tripwire', 34, 34, (g, cx, cy) => {
    // hook prongs
    g.lineStyle(2, 0x5c4410, 1);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.lineBetween(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15);
    }
    // diamond plate
    g.fillStyle(0xf2c14e, 1);
    g.fillPoints([{ x: cx, y: cy - 11 }, { x: cx + 11, y: cy }, { x: cx, y: cy + 11 }, { x: cx - 11, y: cy }], true);
    g.lineStyle(2, 0x8a6d1f, 1);
    g.strokePoints([{ x: cx, y: cy - 11 }, { x: cx + 11, y: cy }, { x: cx, y: cy + 11 }, { x: cx - 11, y: cy }], true);
    g.fillStyle(0xffe9a8, 1); g.fillCircle(cx, cy, 3);
  });

  // ===== ENEMIES =====
  // Most face right (the direction of travel toward the base).

  bake(scene, 'enemy_lightScout', 26, 22, (g, cx, cy) => {
    g.fillStyle(0x0a0f18, 0.25); g.fillEllipse(cx, cy + 8, 18, 6);
    g.fillStyle(0xffb24d, 1);
    g.fillPoints([{ x: cx - 9, y: cy - 7 }, { x: cx - 9, y: cy + 7 }, { x: cx + 11, y: cy }], true);
    g.lineStyle(2, ENEMY_OUTLINE, 1);
    g.strokePoints([{ x: cx - 9, y: cy - 7 }, { x: cx - 9, y: cy + 7 }, { x: cx + 11, y: cy }], true);
    g.fillStyle(0xffd591, 0.9); g.fillPoints([{ x: cx - 9, y: cy - 7 }, { x: cx + 2, y: cy - 2 }, { x: cx - 4, y: cy }], true);
    g.fillStyle(0xbfeaff, 1); g.fillCircle(cx + 1, cy, 3);
    g.lineStyle(1, ENEMY_OUTLINE, 1); g.strokeCircle(cx + 1, cy, 3);
  });

  bake(scene, 'enemy_runner', 22, 16, (g, cx, cy) => {
    g.fillStyle(0x0a0f18, 0.22); g.fillEllipse(cx, cy + 6, 14, 4);
    g.fillStyle(0xff5d8f, 1);
    g.fillPoints([{ x: cx - 8, y: cy - 5 }, { x: cx - 8, y: cy + 5 }, { x: cx + 10, y: cy }], true);
    g.lineStyle(2, ENEMY_OUTLINE, 1);
    g.strokePoints([{ x: cx - 8, y: cy - 5 }, { x: cx - 8, y: cy + 5 }, { x: cx + 10, y: cy }], true);
    g.fillStyle(0xffd1e0, 1); g.fillRect(cx - 9, cy - 3, 4, 2); g.fillRect(cx - 9, cy + 1, 4, 2);
  });

  bake(scene, 'enemy_heavyWalker', 36, 34, (g, cx, cy) => {
    g.fillStyle(0x0a0f18, 0.28); g.fillEllipse(cx, cy + 12, 26, 8);
    // legs
    g.fillStyle(0x3a3550, 1);
    [[-9, 9], [9, 9], [-9, -9], [9, -9]].forEach(([dx, dy]) => g.fillRoundedRect(cx + dx - 3, cy + dy - 2, 6, 11, 2));
    // body
    g.fillStyle(0x7a6f9b, 1); g.fillRoundedRect(cx - 13, cy - 12, 26, 24, 6);
    g.fillStyle(0x9a8fbb, 0.8); g.fillRoundedRect(cx - 13, cy - 12, 26, 8, 6);
    g.lineStyle(2, ENEMY_OUTLINE, 1); g.strokeRoundedRect(cx - 13, cy - 12, 26, 24, 6);
    // cannon + sensor
    g.fillStyle(0x4a4466, 1); g.fillRoundedRect(cx + 6, cy - 5, 10, 10, 2);
    g.fillStyle(0xff5a5a, 1); g.fillCircle(cx + 11, cy, 2.5);
  });

  bake(scene, 'enemy_disruptor', 30, 30, (g, cx, cy) => {
    g.fillStyle(0x0a0f18, 0.22); g.fillEllipse(cx, cy + 11, 18, 5);
    const dia = [{ x: cx, y: cy - 12 }, { x: cx + 12, y: cy }, { x: cx, y: cy + 12 }, { x: cx - 12, y: cy }];
    g.fillStyle(0x9b6cff, 1); g.fillPoints(dia, true);
    g.fillStyle(0xb89bff, 0.8); g.fillPoints([{ x: cx, y: cy - 12 }, { x: cx + 12, y: cy }, { x: cx, y: cy }], true);
    g.lineStyle(2, ENEMY_OUTLINE, 1); g.strokePoints(dia, true);
    g.fillStyle(0xfff0ff, 1); g.fillCircle(cx, cy, 4);
  });

  bake(scene, 'enemy_juggernaut', 46, 42, (g, cx, cy) => {
    g.fillStyle(0x0a0f18, 0.3); g.fillEllipse(cx, cy + 16, 34, 9);
    // treads
    g.fillStyle(0x20242e, 1);
    g.fillRoundedRect(cx - 19, cy - 14, 7, 28, 3);
    g.fillRoundedRect(cx + 12, cy - 14, 7, 28, 3);
    // hull
    g.fillStyle(0x444a5e, 1); g.fillRoundedRect(cx - 14, cy - 15, 28, 30, 6);
    g.fillStyle(0x5a6076, 0.8); g.fillRoundedRect(cx - 14, cy - 15, 28, 9, 6);
    g.lineStyle(3, 0x14161d, 1); g.strokeRoundedRect(cx - 14, cy - 15, 28, 30, 6);
    // armor plate + eyes
    g.fillStyle(0x636b82, 1); g.fillRoundedRect(cx - 11, cy - 11, 22, 9, 3);
    g.fillStyle(0xff5a5a, 1); g.fillCircle(cx - 5, cy + 6, 3); g.fillCircle(cx + 5, cy + 6, 3);
  });
}
