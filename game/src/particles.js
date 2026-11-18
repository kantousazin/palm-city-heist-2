// Hand-made particles: collision sparks, tyre smoke, muzzle flashes and mission confetti.

export function createParticleSystem() {
  return { items: [] };
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
}

export function drawParticles(ctx, system, camera, viewW, viewH) {
  for (const p of system.items) {
    const sx = p.x - camera.x + viewW / 2, sy = p.y - camera.y + viewH / 2;
    const alpha = Math.max(0, p.life / p.max);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
    if (p.kind === 'confetti') { ctx.translate(sx, sy); ctx.rotate(p.spin); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
    else if (p.kind === 'smoke') { ctx.beginPath(); ctx.arc(sx, sy, p.size * (1.6 - alpha * 0.6), 0, 6.29); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, 6.29); ctx.fill(); }
    ctx.restore();
  }
}
