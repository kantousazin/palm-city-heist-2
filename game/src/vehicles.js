// Vehicle models, parked-car placement and arcade driving physics with a drift feel.
import { createSeededRandom, ROAD_XS, ROAD_YS } from './world-city.js';

export const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#ecf0f1', '#9b59b6', '#1abc9c'];
export const CAR_LENGTH = 46;
export const CAR_WIDTH = 24;

export function makeVehicle(x, y, angle, color, kind = 'civilian') {
  return { x, y, angle, speed: 0, steerVisual: 0, color, kind, health: 100, driftAngle: 0, honkTimer: 0 };
}

export function createParkedCars(seed) {
  const random = createSeededRandom(seed + 77);
  const cars = [];
  const spots = [
    [470, 640], [900, 710], [1330, 640], [1830, 710], [2280, 640], [2700, 710], [3150, 640],
    [470, 1090], [900, 1160], [1830, 1090], [2700, 1160], [470, 1540], [1330, 1610],
    [1830, 1540], [2280, 1610], [900, 1990], [1330, 2090], [2280, 1990], [3150, 2090], [640, 470],
  ];
  spots.forEach(([x, y], i) => {
    const horizontal = y % 450 < 300;
    cars.push(makeVehicle(x, y, horizontal ? 0 : Math.PI / 2, CAR_COLORS[Math.floor(random() * CAR_COLORS.length)], 'parked'));
    cars[i].id = `parked-${i}`;
  });
  return cars;
}

export function updateVehicleDriving(vehicle, input, dt) {
  const accel = 340, maxSpeed = 430, maxReverse = -150;
  if (input.forward) vehicle.speed += accel * dt * (vehicle.speed < 0 ? 2.2 : 1);
  else if (input.back) vehicle.speed -= accel * dt * (vehicle.speed > 0 ? 2.4 : 1);
  else vehicle.speed -= vehicle.speed * 1.6 * dt;
  if (input.handbrake) vehicle.speed -= vehicle.speed * 2.6 * dt;
  vehicle.speed = Math.max(maxReverse, Math.min(maxSpeed, vehicle.speed));
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  vehicle.steerVisual += (steer - vehicle.steerVisual) * Math.min(1, dt * 10);
  const grip = input.handbrake ? 1.9 : 3.4;
  if (Math.abs(vehicle.speed) > 4) {
    vehicle.angle += steer * grip * dt * Math.sign(vehicle.speed) * Math.min(1, Math.abs(vehicle.speed) / 190);
  }
  // Drift: the nose leads, the velocity direction lags behind it when sliding.
  const targetDrift = input.handbrake ? steer * 0.5 : steer * Math.min(0.16, Math.abs(vehicle.speed) / 2600);
  vehicle.driftAngle += (targetDrift - vehicle.driftAngle) * Math.min(1, dt * 5);
  const moveAngle = vehicle.angle + vehicle.driftAngle;
  vehicle.x += Math.cos(moveAngle) * vehicle.speed * dt;
  vehicle.y += Math.sin(moveAngle) * vehicle.speed * dt;
  vehicle.isDrifting = Math.abs(vehicle.driftAngle) > 0.22 && Math.abs(vehicle.speed) > 140;
  return vehicle;
}

export function vehicleCorners(vehicle) {
  const c = Math.cos(vehicle.angle), s = Math.sin(vehicle.angle);
  const hl = CAR_LENGTH / 2, hw = CAR_WIDTH / 2;
  return [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]].map(([lx, ly]) => ({ x: vehicle.x + lx * c - ly * s, y: vehicle.y + lx * s + ly * c }));
}

export function drawVehicle(ctx, vehicle, camera, viewW, viewH) {
  const sx = vehicle.x - camera.x + viewW / 2, sy = vehicle.y - camera.y + viewH / 2;
  if (sx < -70 || sx > viewW + 70 || sy < -70 || sy > viewH + 70) return;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(vehicle.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-CAR_LENGTH / 2 + 3, -CAR_WIDTH / 2 + 5, CAR_LENGTH, CAR_WIDTH);
  ctx.fillStyle = vehicle.color;
  ctx.beginPath(); ctx.roundRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 7); ctx.fill();
  ctx.fillStyle = vehicle.kind === 'police' ? '#18222e' : 'rgba(20,30,45,0.85)';
  ctx.fillRect(-8, -CAR_WIDTH / 2 + 3, 17, CAR_WIDTH - 6);
  ctx.fillStyle = '#bfe8ff'; ctx.fillRect(2, -CAR_WIDTH / 2 + 4, 6, CAR_WIDTH - 8);
  if (vehicle.kind === 'police') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-CAR_LENGTH / 2 + 2, -CAR_WIDTH / 2 + 2, CAR_LENGTH - 4, CAR_WIDTH - 4);
    ctx.fillStyle = '#2456c8'; ctx.fillRect(-CAR_LENGTH / 2 + 2, -5, CAR_LENGTH - 4, 10);
    ctx.fillStyle = (Math.floor(performance.now() / 280) % 2) ? '#ff3030' : '#3060ff';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#14202e'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, 3);
  }
  if (vehicle.kind === 'player') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 - 2, CAR_LENGTH + 4, CAR_WIDTH + 4, 8); ctx.stroke(); }
  ctx.fillStyle = '#16181d';
  const wy = CAR_WIDTH / 2 - 2;
  ctx.fillRect(-CAR_LENGTH / 2 + 5, -wy - 3, 11, 6); ctx.fillRect(-CAR_LENGTH / 2 + 5, wy - 3, 11, 6);
  ctx.fillRect(CAR_LENGTH / 2 - 16, -wy - 3, 11, 6); ctx.fillRect(CAR_LENGTH / 2 - 16, wy - 3, 11, 6);
  ctx.restore();
}

export function findNearestParkedCar(cars, x, y, maxDistance = 52) {
  let best = null, bestD = maxDistance;
  for (const car of cars) { const d = Math.hypot(car.x - x, car.y - y); if (d < bestD) { bestD = d; best = car; } }
  return best;
}

export { ROAD_XS, ROAD_YS };
