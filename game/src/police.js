// Wanted level and police response: crime raises stars, patrol cars chase and ram,
// hiding long enough cools the heat back down. In screenshot scenes the level can be frozen.
import { makeVehicle, drawVehicle } from './vehicles.js';

export function createWantedSystem() {
  return {
    crime: 0, stars: 0, frozen: false, escapeTimer: 0, lastCrimeAt: -99,
    policeCars: [], sirenStep: 0, sirenTimer: 0, ramCooldown: 0,
  };
}

export function wantedStarsForCrime(crime) {
  if (crime >= 90) return 5;
  if (crime >= 55) return 4;
  if (crime >= 32) return 3;
  if (crime >= 16) return 2;
  if (crime >= 5) return 1;
  return 0;
}

export function addCrime(wanted, amount, elapsed) {
  if (wanted.frozen) return;
  wanted.crime = Math.min(120, wanted.crime + amount);
  wanted.lastCrimeAt = elapsed;
  wanted.escapeTimer = 0;
  wanted.stars = wantedStarsForCrime(wanted.crime);
}

export function setWantedStars(wanted, stars) {
  wanted.stars = stars;
  wanted.crime = [0, 5, 16, 32, 55, 90][stars] || 0;
}

export function clearWanted(wanted) {
  wanted.crime = 0; wanted.stars = 0; wanted.escapeTimer = 0; wanted.policeCars = [];
}

export function updatePolice(wanted, dt, elapsed, player, audio) {
  wanted.stars = wanted.frozen ? wanted.stars : wantedStarsForCrime(wanted.crime);
  // Escape: no fresh crime and some distance from every patrol car cools one star at a time.
  const nearest = wanted.policeCars.reduce((m, c) => Math.min(m, Math.hypot(c.x - player.x, c.y - player.y)), 9999);
  if (!wanted.frozen && wanted.stars > 0 && elapsed - wanted.lastCrimeAt > 7 && nearest > 430) {
    wanted.escapeTimer += dt;
    wanted.cooling = Math.min(1, wanted.escapeTimer / 5);
    if (wanted.escapeTimer > 5) { wanted.crime = Math.max(0, wanted.crime - 17); wanted.escapeTimer = 0; wanted.stars = wantedStarsForCrime(wanted.crime); }
  } else { wanted.escapeTimer = 0; wanted.cooling = 0; }

  const desired = wanted.stars === 0 ? 0 : Math.min(5, wanted.stars + (wanted.stars >= 3 ? 1 : 0));
  while (wanted.policeCars.length < desired) {
    const a = Math.random() * 6.29;
    const dist = 560 + Math.random() * 160;
    const car = makeVehicle(player.x + Math.cos(a) * dist, player.y + Math.sin(a) * dist, a + Math.PI, '#ffffff', 'police');
    car.speed = 0; wanted.policeCars.push(car);
  }
  if (wanted.policeCars.length > desired) wanted.policeCars.length = desired;

  wanted.ramCooldown = Math.max(0, wanted.ramCooldown - dt);
  let rammedPlayer = false;
  for (const car of wanted.policeCars) {
    const dx = player.x - car.x, dy = player.y - car.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= 6.283; while (diff < -Math.PI) diff += 6.283;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const topSpeed = 300 + wanted.stars * 26;
    car.speed += ((dist > 60 ? topSpeed : topSpeed * 0.4) - car.speed) * Math.min(1, dt * 1.6);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (dist < 42 && wanted.ramCooldown <= 0) { rammedPlayer = true; wanted.ramCooldown = 0.9; }
  }
  if (wanted.stars > 0 && audio) {
    wanted.sirenTimer -= dt;
    if (wanted.sirenTimer <= 0) { wanted.sirenTimer = 0.34; wanted.sirenStep++; audio.playSirenStep(wanted.sirenStep); }
  }
  return rammedPlayer;
}

export function drawPolice(ctx, wanted, camera, viewW, viewH, night = false) {
  for (const car of wanted.policeCars) drawVehicle(ctx, car, camera, viewW, viewH, night);
}
