// Hand-made particles: collision sparks, tyre smoke, muzzle flashes and mission confetti.

export function createParticleSystem() {
  return { items: [], skidMarks: [], texts: [] };
}

// Tyre marks: the road remembers a drift. Fading dark streaks, capped so a
// long session never grows without bound (motion-repo note: keep particle
// counts small, make each mark carry the information instead).
export function addSkidMark(system, x, y, angle) {
  system.skidMarks.push({ x, y, angle, life: 7, max: 7 });
  if (system.skidMarks.length > 260) system.skidMarks.splice(0, system.skidMarks.length - 260);
}

export function stageSkidTrail(system, x, y, angle, length = 150) {
  for (let d = 18; d < length; d += 15) addSkidMark(system, x - Math.cos(angle) * d, y - Math.sin(angle) * d, angle);
}

// Hit mark (Sakurai effects #130): bright sparks + a dark chip + an expanding
// ring, spawned exactly at the overlap point, gone quickly, readable on both
// bright streets and dark night roads.
export function spawnHitMark(system, x, y, big = false) {
  const n = big ? 14 : 8;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.29, s = 70 + Math.random() * 200;
    pushParticle(system, { kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.28 + Math.random() * 0.2, max: 0.45, size: big ? 3.4 : 2.6, color: i % 3 ? '#ffe27a' : '#2b2f38' });
  }
  pushParticle(system, { kind: 'ring', x, y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: big ? 26 : 17, color: '#ffffff' });
}

export function spawnFloatText(system, x, y, text, color = '#ffd94d') {
  system.texts.push({ x, y, text, color, life: 0.9, max: 0.9 });
  if (system.texts.length > 12) system.texts.shift();
}

function pushParticle(system, p) {
  if (system.items.length < 420) system.items.push(p);
}

export function spawnSparks(system, x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * 6.29, s = 60 + Math.random() * 220;
    pushParticle(system, { kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.32 + Math.random() * 0.25, max: 0.55, size: 2.5, color: '#ffcf4d' });
  }
}

export function spawnSmoke(system, x, y, count = 4) {
  for (let i = 0; i < count; i++) pushParticle(system, { kind: 'smoke', x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 24, vy: -18 - Math.random() * 22, life: 0.8, max: 0.8, size: 7 + Math.random() * 7, color: 'rgba(230,230,230,0.5)' });
}

export function spawnConfetti(system, x, y, count = 70) {
  const colors = ['#ff4f6d', '#ffd94d', '#4fd1ff', '#7fe07a', '#ff4fd8'];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7, s = 130 + Math.random() * 260;
    pushParticle(system, { kind: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.5 + Math.random() * 0.7, max: 2.1, size: 5 + Math.random() * 4, color: colors[i % colors.length], spin: Math.random() * 6.28 });
  }
}

export function spawnMuzzleFlash(system, x, y, angle) {
  pushParticle(system, { kind: 'flash', x: x + Math.cos(angle) * 20, y: y + Math.sin(angle) * 20, vx: 0, vy: 0, life: 0.07, max: 0.07, size: 13, color: '#ffe27a' });
}

export function updateParticles(system, dt) {
  for (const p of system.items) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'confetti') { p.vy += 300 * dt; p.vx *= 0.985; p.spin += dt * 9; }
    if (p.kind === 'spark') { p.vx *= 0.92; p.vy *= 0.92; }
  }
  system.items = system.items.filter((p) => p.life > 0);
  for (const m of system.skidMarks) m.life -= dt;
  system.skidMarks = system.skidMarks.filter((m) => m.life > 0);
  for (const t of system.texts) { t.life -= dt; t.y -= 34 * dt; }
  system.texts = system.texts.filter((t) => t.life > 0);
}

export function drawSkidMarks(ctx, system, camera, viewW, viewH) {
  for (const m of system.skidMarks) {
    const sx = m.x - camera.x + viewW / 2, sy = m.y - camera.y + viewH / 2;
    if (sx < -20 || sx > viewW + 20 || sy < -20 || sy > viewH + 20) continue;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(m.angle);
    ctx.globalAlpha = 0.34 * Math.min(1, m.life / m.max + 0.25);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(-8, -9, 16, 5); ctx.fillRect(-8, 4, 16, 5);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawFloatTexts(ctx, system, camera, viewW, viewH) {
  ctx.save(); ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center';
  for (const t of system.texts) {
    const sx = t.x - camera.x + viewW / 2, sy = t.y - camera.y + viewH / 2;
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 4; ctx.strokeText(t.text, sx, sy);
    ctx.fillStyle = t.color; ctx.fillText(t.text, sx, sy);
  }
  ctx.restore();
}

export function drawParticles(ctx, system, camera, viewW, viewH) {
  for (const p of system.items) {
    const sx = p.x - camera.x + viewW / 2, sy = p.y - camera.y + viewH / 2;
    const alpha = Math.max(0, p.life / p.max);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
    if (p.kind === 'confetti') { ctx.translate(sx, sy); ctx.rotate(p.spin); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
    else if (p.kind === 'ring') { ctx.globalAlpha = alpha * 0.9; ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, p.size * (1.15 - alpha * 0.55), 0, 6.29); ctx.stroke(); }
    else if (p.kind === 'smoke') { ctx.beginPath(); ctx.arc(sx, sy, p.size * (1.6 - alpha * 0.6), 0, 6.29); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, 6.29); ctx.fill(); }
    ctx.restore();
  }
}
