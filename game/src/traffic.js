// Civilian traffic AI: lane driving, traffic-light stops, honking and shy avoidance.
import { createSeededRandom, ROAD_XS, ROAD_YS, trafficLightPhase, WORLD_WIDTH, WORLD_HEIGHT } from './world-city.js';
import { makeVehicle, drawVehicle, CAR_COLORS } from './vehicles.js';

export function createTrafficCars(seed, count = 15) {
  const random = createSeededRandom(seed + 31);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = random() < 0.5;
    const dir = random() < 0.5 ? 1 : -1;
    const laneOffset = 27 * dir;
    let car;
    if (vertical) {
      const roadX = ROAD_XS[Math.floor(random() * ROAD_XS.length)];
      car = makeVehicle(roadX + laneOffset, random() * WORLD_HEIGHT, dir > 0 ? Math.PI / 2 : -Math.PI / 2, CAR_COLORS[i % CAR_COLORS.length], 'traffic');
      car.axis = 'y'; car.laneRoad = roadX;
    } else {
      const roadY = ROAD_YS[Math.floor(random() * ROAD_YS.length)];
      car = makeVehicle(random() * WORLD_WIDTH, roadY + laneOffset, dir > 0 ? 0 : Math.PI, CAR_COLORS[i % CAR_COLORS.length], 'traffic');
      car.axis = 'x'; car.laneRoad = roadY;
    }
    car.dir = dir; car.cruiseSpeed = 120 + random() * 90; car.speed = car.cruiseSpeed;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, elapsed, playerPos, audio, particles) {
  const phase = trafficLightPhase(elapsed);
  for (const car of cars) {
    let targetSpeed = car.cruiseSpeed;
    // Stop lines: check the next intersection ahead.
    const ahead = 74;
    const probeX = car.x + Math.cos(car.angle) * ahead, probeY = car.y + Math.sin(car.angle) * ahead;
    const nearIntersection = ROAD_XS.some((rx) => Math.abs(probeX - rx) < 46) && ROAD_YS.some((ry) => Math.abs(probeY - ry) < 46);
    if (nearIntersection) {
      const myGreen = car.axis === 'y' ? phase.startsWith('ns') : phase.startsWith('ew');
      if (!myGreen) targetSpeed = 0;
      else if (phase.endsWith('yellow')) targetSpeed = car.cruiseSpeed * 0.45;
    }
    // Avoid the player and other cars ahead; honk when the player blocks the lane.
    const dx = playerPos.x - car.x, dy = playerPos.y - car.y;
    const distToPlayer = Math.hypot(dx, dy);
    const playerAhead = distToPlayer < 96 && (dx * Math.cos(car.angle) + dy * Math.sin(car.angle)) > 0;
    if (playerAhead) {
      targetSpeed = Math.min(targetSpeed, 20);
      car.honkTimer -= dt;
      if (car.honkTimer <= 0) { car.honkTimer = 1.6 + Math.random() * 2; if (audio) audio.playHorn(); }
    }
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.4);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the city edges so traffic never runs out.
    if (car.x < -60) car.x = WORLD_WIDTH + 50; if (car.x > WORLD_WIDTH + 60) car.x = -50;
    if (car.y < -60) car.y = WORLD_HEIGHT + 50; if (car.y > WORLD_HEIGHT + 60) car.y = -50;
    // Keep exactly on the lane centre line.
    if (car.axis === 'y') car.x = car.laneRoad + 27 * car.dir;
    else car.y = car.laneRoad + 27 * car.dir;
    if (car.isDrifting && particles) particles.spawnSmoke?.(car.x, car.y, 1);
  }
}

export function drawTraffic(ctx, cars, camera, viewW, viewH, night = false) {
  for (const car of cars) drawVehicle(ctx, car, camera, viewW, viewH, night);
}
