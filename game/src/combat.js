// On-foot combat: mouse-aimed shooting with visible tracers, hostile gang members who
// shoot back, and health on both sides. Gang members are drawn at pedestrian scale x1.25.
import { spawnMuzzleFlash } from './particles.js';

export function createGangMembers() {
  const spots = [
    [2860, 1960], [2985, 2085], [2905, 2140], [2380, 760], [2560, 590], [820, 2140],
  ];
  return spots.map(([x, y], i) => ({ x, y, health: 60, facing: Math.PI, shootTimer: 1 + i * 0.4, alive: true, color: '#8e44ad', walkPhase: i }));
}

export function createCombatState() {
  return { bullets: [], enemyBullets: [], fireCooldown: 0, shotsFired: 0 };
}

export function playerShoot(combat, player, audio, particles) {
  if (combat.fireCooldown > 0) return false;
  combat.fireCooldown = 0.13; combat.shotsFired++;
  const angle = player.aimAngle;
  combat.bullets.push({ x: player.x + Math.cos(angle) * 18, y: player.y + Math.sin(angle) * 18, vx: Math.cos(angle) * 880, vy: Math.sin(angle) * 880, life: 0.55, tracer: 26 });
  spawnMuzzleFlash(particles, player.x, player.y, angle);
  if (audio) audio.playGunshot();
  return true;
}

export function stageTracerShots(combat, fromX, fromY, angle, count = 3) {
  // Deterministic tracers for screenshot scenes: bullets already mid-flight.
  for (let i = 0; i < count; i++) {
    combat.bullets.push({ x: fromX + Math.cos(angle) * (30 + i * 34), y: fromY + Math.sin(angle) * (30 + i * 34), vx: Math.cos(angle) * 880, vy: Math.sin(angle) * 880, life: 0.5, tracer: 26 });
  }
}

export function updateCombat(combat, dt, gangs, player, particles, onPlayerHit, onGangDown) {
  combat.fireCooldown = Math.max(0, combat.fireCooldown - dt);
  const stepBullets = (list, isEnemy) => {
    for (const b of list) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (isEnemy) {
        if (Math.hypot(b.x - player.x, b.y - player.y) < 15 && !player.inCar) { b.life = 0; onPlayerHit(7); }
        if (player.inCar && Math.hypot(b.x - player.inCar.x, b.y - player.inCar.y) < 30) { b.life = 0; onPlayerHit(3); }
      } else {
        for (const g of gangs) {
          if (g.alive && Math.hypot(b.x - g.x, b.y - g.y) < 16) {
            b.life = 0; g.health -= 34;
            if (g.health <= 0) { g.alive = false; onGangDown(g); }
            break;
          }
        }
      }
    }
    return list.filter((b) => b.life > 0);
  };
  combat.bullets = stepBullets(combat.bullets, false);
  combat.enemyBullets = stepBullets(combat.enemyBullets, true);
  // Gangs engage when the player is close or has fired nearby.
  for (const g of gangs) {
    if (!g.alive) continue;
    const dist = Math.hypot(g.x - player.x, g.y - player.y);
    g.facing = Math.atan2(player.y - g.y, player.x - g.x);
    if (dist < 300) {
      g.shootTimer -= dt;
      if (dist > 120) { g.x += Math.cos(g.facing) * 42 * dt; g.y += Math.sin(g.facing) * 42 * dt; g.walkPhase += dt * 8; }
      if (g.shootTimer <= 0) {
        g.shootTimer = 0.9 + Math.random() * 0.8;
        const spread = (Math.random() - 0.5) * 0.16;
        const a = g.facing + spread;
        combat.enemyBullets.push({ x: g.x + Math.cos(a) * 16, y: g.y + Math.sin(a) * 16, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.6, tracer: 20 });
      }
    }
  }
}

export function drawCombat(ctx, combat, gangs, camera, viewW, viewH) {
  for (const g of gangs) {
    if (!g.alive) continue;
    const sx = g.x - camera.x + viewW / 2, sy = g.y - camera.y + viewH / 2;
    if (sx < -30 || sx > viewW + 30 || sy < -30 || sy > viewH + 30) continue;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1.25, 1.25);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 9, 8, 3.2, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = g.color; ctx.beginPath(); ctx.roundRect(-6, -6, 12, 10, 4); ctx.fill();
    ctx.fillStyle = '#e8b98d'; ctx.beginPath(); ctx.arc(0, -10, 5.2, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#101018'; ctx.beginPath(); ctx.arc(0, -12.6, 5.2, Math.PI, 6.29); ctx.fill();
    ctx.strokeStyle = '#22262e'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(3 + Math.cos(g.facing) * 13, -2 + Math.sin(g.facing) * 13); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#1c2027'; ctx.fillRect(sx - 14, sy - 30, 28, 5);
    ctx.fillStyle = '#ff5040'; ctx.fillRect(sx - 14, sy - 30, 28 * Math.max(0, g.health / 60), 5);
    ctx.fillStyle = '#ffdf3d'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('GANG', sx, sy - 36);
  }
  const drawTracer = (b, color) => {
    const sx = b.x - camera.x + viewW / 2, sy = b.y - camera.y + viewH / 2;
    const back = Math.atan2(b.vy, b.vx);
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx - Math.cos(back) * b.tracer, sy - Math.sin(back) * b.tracer); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 6.29); ctx.fill();
  };
  for (const b of combat.bullets) drawTracer(b, '#ffd94d');
  for (const b of combat.enemyBullets) drawTracer(b, '#ff7a5c');
}
