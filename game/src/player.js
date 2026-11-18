// Ren Solano on foot: WASD movement, building collision, mouse aim. Drawn at 1.3x like
// every pedestrian so the hero reads clearly in shrunk screenshots.
import { PERSON_DRAW_SCALE } from './pedestrians.js';

export function createPlayer(startX, startY) {
  return {
    x: startX, y: startY, vx: 0, vy: 0, facing: 0, aimAngle: 0,
    health: 100, maxHealth: 100, money: 120, inCar: null, walkPhase: 0, hurtFlash: 0,
  };
}

export function updatePlayerOnFoot(player, input, dt, buildingAtFn) {
  const accel = 1500, maxSpeed = 215;
  let ax = 0, ay = 0;
  if (input.left) ax -= 1; if (input.right) ax += 1;
  if (input.up) ay -= 1; if (input.down) ay += 1;
  const len = Math.hypot(ax, ay) || 1;
  player.vx += (ax / len) * accel * dt; player.vy += (ay / len) * accel * dt;
  if (!ax) player.vx -= player.vx * Math.min(1, dt * 9);
  if (!ay) player.vy -= player.vy * Math.min(1, dt * 9);
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > maxSpeed) { player.vx = player.vx / speed * maxSpeed; player.vy = player.vy / speed * maxSpeed; }
  const nextX = player.x + player.vx * dt;
  const nextY = player.y + player.vy * dt;
  if (!buildingAtFn(nextX, player.y, 11)) player.x = nextX;
  if (!buildingAtFn(player.x, nextY, 11)) player.y = nextY;
  if (speed > 12) { player.facing = Math.atan2(player.vy, player.vx); player.walkPhase += dt * 11; }
  player.hurtFlash = Math.max(0, player.hurtFlash - dt);
  return speed;
}

export function damagePlayer(player, amount) {
  player.health -= amount;
  player.hurtFlash = 0.35;
  return player.health <= 0;
}

export function drawPlayerPerson(ctx, player, camera, viewW, viewH) {
  const sx = player.x - camera.x + viewW / 2, sy = player.y - camera.y + viewH / 2;
  const s = PERSON_DRAW_SCALE;
  const bob = Math.sin(player.walkPhase) * 1.7;
  ctx.save(); ctx.translate(sx, sy + bob * 0.3); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 10, 9, 3.6, 0, 0, 6.29); ctx.fill();
  ctx.strokeStyle = '#1d2739'; ctx.lineWidth = 3.6;
  const legSwing = Math.sin(player.walkPhase) * 5.5;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-legSwing, 11); ctx.moveTo(0, 2); ctx.lineTo(legSwing, 11); ctx.stroke();
  // Ren's teal jacket.
  ctx.fillStyle = player.hurtFlash > 0 ? '#ff5040' : '#0e9aa7';
  ctx.beginPath(); ctx.roundRect(-6.5, -6, 13, 11, 4); ctx.fill();
  ctx.fillStyle = '#ffd94d'; ctx.fillRect(-6.5, 1, 13, 3);
  ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(0, -10.5, 5.4, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(0, -13, 5.4, Math.PI, 6.29); ctx.fill();
  // Gun arm toward the mouse aim.
  ctx.strokeStyle = '#f2c79b'; ctx.lineWidth = 3.2;
  const gx = Math.cos(player.aimAngle) * 11, gy = Math.sin(player.aimAngle) * 11;
  ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(gx, gy); ctx.stroke();
  ctx.strokeStyle = '#22262e'; ctx.lineWidth = 3.6;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(player.aimAngle) * 7, gy + Math.sin(player.aimAngle) * 7); ctx.stroke();
  ctx.restore();
  // Hero ring so the player is unmistakable at a glance.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(sx, sy + 2, 17, 0, 6.29); ctx.stroke();
}
