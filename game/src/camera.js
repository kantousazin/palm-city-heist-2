// Smooth follow camera with velocity lookahead, clamped to the city bounds.
import { WORLD_WIDTH, WORLD_HEIGHT } from './world-city.js';

export function createCamera(startX, startY) {
  return { x: startX, y: startY, shake: 0, shakeX: 0, shakeY: 0 };
}

export function addCameraShake(camera, amount) {
  camera.shake = Math.min(14, camera.shake + amount);
}

export function updateCamera(camera, targetX, targetY, velX, velY, dt, viewW, viewH) {
  const lookX = targetX + velX * 0.42;
  const lookY = targetY + velY * 0.42;
  const stiffness = 1 - Math.pow(0.0015, dt);
  camera.x += (lookX - camera.x) * stiffness;
  camera.y += (lookY - camera.y) * stiffness;
  camera.x = Math.max(viewW / 2, Math.min(WORLD_WIDTH - viewW / 2, camera.x));
  camera.y = Math.max(viewH / 2, Math.min(WORLD_HEIGHT - viewH / 2, camera.y));
  camera.shake = Math.max(0, camera.shake - dt * 26);
  camera.shakeX = (Math.random() - 0.5) * camera.shake;
  camera.shakeY = (Math.random() - 0.5) * camera.shake;
}

export function worldToScreen(camera, worldX, worldY, viewW, viewH) {
  return { x: worldX - camera.x + viewW / 2 + camera.shakeX, y: worldY - camera.y + viewH / 2 + camera.shakeY };
}
