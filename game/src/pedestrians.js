// Pedestrians stroll the sidewalks and flee from gunfire, crashes and speeding cars.
// People are drawn at 1.3x so they stay readable when screenshots are shrunk.
import { createSeededRandom, ROAD_XS, ROAD_YS } from './world-city.js';

export const PERSON_DRAW_SCALE = 1.3;
const SHIRT_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#f368e0', '#ff9f43', '#c8d6e5', '#fd79a8'];

export function createPedestrians(seed, count = 30) {
  const random = createSeededRandom(seed + 53);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const vertical = random() < 0.5;
    const side = random() < 0.5 ? -68 : 68;
    let ped;
    if (vertical) {
      const roadX = ROAD_XS[Math.floor(random() * ROAD_XS.length)];
      ped = { x: roadX + side, y: random() * 2600 + 50, axis: 'y', lane: roadX + side };
    } else {
      const roadY = ROAD_YS[Math.floor(random() * ROAD_YS.length)];
      ped = { x: random() * 3500 + 50, y: roadY + side, axis: 'x', lane: roadY + side };
    }
    ped.dir = random() < 0.5 ? 1 : -1;
    ped.speed = 34 + random() * 30;
    ped.color = SHIRT_COLORS[i % SHIRT_COLORS.length];
    ped.panic = 0; ped.walkPhase = random() * 6.28;
    peds.push(ped);
  }
  return peds;
}

export function startlePedestrians(peds, x, y, radius = 190) {
  for (const ped of peds) if (Math.hypot(ped.x - x, ped.y - y) < radius) ped.panic = 2.6;
}

export function updatePedestrians(peds, dt, dangerPos, dangerSpeed) {
  for (const ped of peds) {
    const distDanger = dangerPos ? Math.hypot(ped.x - dangerPos.x, ped.y - dangerPos.y) : 9999;
    if (distDanger < 110 && dangerSpeed > 130) ped.panic = Math.max(ped.panic, 1.4);
    ped.panic = Math.max(0, ped.panic - dt);
    const speed = ped.panic > 0 ? ped.speed * 3.1 : ped.speed;
    if (ped.panic > 0 && dangerPos) {
      const away = Math.atan2(ped.y - dangerPos.y, ped.x - dangerPos.x);
      ped.x += Math.cos(away) * speed * dt; ped.y += Math.sin(away) * speed * dt;
      ped.facing = away;
    } else if (ped.axis === 'y') {
      ped.y += ped.dir * speed * dt; ped.facing = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (ped.y < 40 || ped.y > 2660) ped.dir *= -1;
    } else {
      ped.x += ped.dir * speed * dt; ped.facing = ped.dir > 0 ? 0 : Math.PI;
      if (ped.x < 40 || ped.x > 3560) ped.dir *= -1;
    }
    ped.walkPhase += dt * (ped.panic > 0 ? 13 : 7);
  }
}

export function drawPedestrian(ctx, ped, camera, viewW, viewH) {
  const sx = ped.x - camera.x + viewW / 2, sy = ped.y - camera.y + viewH / 2;
  if (sx < -30 || sx > viewW + 30 || sy < -30 || sy > viewH + 30) return;
  const s = PERSON_DRAW_SCALE;
  const bob = Math.sin(ped.walkPhase) * 1.6;
  ctx.save(); ctx.translate(sx, sy + bob * 0.3); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 9, 8, 3.4, 0, 0, 6.29); ctx.fill();
  ctx.strokeStyle = '#26324a'; ctx.lineWidth = 3.4;
  const legSwing = Math.sin(ped.walkPhase) * 5;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-legSwing, 10); ctx.moveTo(0, 2); ctx.lineTo(legSwing, 10); ctx.stroke();
  ctx.fillStyle = ped.color; ctx.beginPath(); ctx.roundRect(-6, -6, 12, 10, 4); ctx.fill();
  ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(0, -10, 5.2, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(0, -12.4, 5.2, Math.PI, 6.29); ctx.fill();
  ctx.restore();
  if (ped.panic > 0) {
    ctx.fillStyle = '#ffdf3d'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
    ctx.strokeText('!', sx, sy - 24); ctx.fillText('!', sx, sy - 24);
  }
}
