// Palmera City generation: a sun-soaked coastal grid of roads, blocks and four districts.
// The city is deterministic (seeded) so screenshot scenes and traffic always line up.

export const WORLD_WIDTH = 3600;
export const WORLD_HEIGHT = 2700;
export const ROAD_WIDTH = 112;
export const ROAD_SPACING = 450;
export const ROAD_XS = [225, 675, 1125, 1575, 2025, 2475, 2925, 3375];
export const ROAD_YS = [225, 675, 1125, 1575, 2025, 2475];

export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function districtAt(worldX, worldY) {
  if (worldX < 1800 && worldY < 1350) return 'downtown';
  if (worldX >= 1800 && worldY < 1350) return 'neon';
  if (worldX < 1800 && worldY >= 1350) return 'marina';
  return 'residential';
}

export const DISTRICT_STYLE = {
  downtown: { name: 'Downtown', roofs: ['#7fb2d9', '#5d8fb8', '#93c4e3', '#4f7fa8'], wall: '#dfe9f2', tall: true },
  neon: { name: 'Neon Mile', roofs: ['#b388e6', '#e67fb1', '#7f6fd9', '#d95f9e'], wall: '#f2e4f7', tall: false },
  marina: { name: 'Marina', roofs: ['#7fd0c9', '#4fa8a0', '#a8ddd8', '#5fb8ad'], wall: '#eef7f2', tall: false },
  residential: { name: 'Palm Heights', roofs: ['#e6a87f', '#d98f5f', '#eec39a', '#c97f4f'], wall: '#f7ecdd', tall: false },
};

export function isOnRoad(worldX, worldY) {
  const nearVertical = ROAD_XS.some((rx) => Math.abs(worldX - rx) < ROAD_WIDTH / 2);
  const nearHorizontal = ROAD_YS.some((ry) => Math.abs(worldY - ry) < ROAD_WIDTH / 2);
  return nearVertical || nearHorizontal;
}

export function nearestRoadPoint(worldX, worldY) {
  let best = { x: worldX, y: worldY, distance: Infinity };
  for (const rx of ROAD_XS) {
    const d = Math.abs(worldX - rx);
    if (d < best.distance) best = { x: rx, y: worldY, distance: d };
  }
  for (const ry of ROAD_YS) {
    const d = Math.abs(worldY - ry);
    if (d < best.distance) best = { x: worldX, y: ry, distance: d };
  }
  return best;
}

/** Traffic lights share one city-wide rhythm: 0-3.4s NS green, 3.4-4 yellow, 4-7.4 EW green, 7.4-8 yellow. */
export function trafficLightPhase(elapsedSeconds) {
  const t = elapsedSeconds % 8;
  if (t < 3.4) return 'ns-green';
  if (t < 4) return 'ns-yellow';
  if (t < 7.4) return 'ew-green';
  return 'ew-yellow';
}

export function buildCity(seed) {
  const random = createSeededRandom(seed);
  const buildings = [];
  const palms = [];
  const landmarks = [
    { name: 'Cafe Sol', x: 1125, y: 675, color: '#ffb347' },
    { name: 'Palmera Bank', x: 1575, y: 1125, color: '#ffd94d' },
    { name: 'Neon Arcade', x: 2475, y: 675, color: '#ff4fd8' },
    { name: 'Marina Docks', x: 675, y: 2025, color: '#39c2d7' },
    { name: 'Old Warehouse', x: 2925, y: 2025, color: '#c96f4a' },
    { name: 'Safehouse', x: 1125, y: 1575, color: '#7fe07a' },
  ];
  for (let bx = 0; bx < ROAD_XS.length - 1; bx++) {
    for (let by = 0; by < ROAD_YS.length - 1; by++) {
      const x0 = ROAD_XS[bx] + ROAD_WIDTH / 2 + 14;
      const y0 = ROAD_YS[by] + ROAD_WIDTH / 2 + 14;
      const blockW = ROAD_SPACING - ROAD_WIDTH - 28;
      const blockH = ROAD_SPACING - ROAD_WIDTH - 28;
      const district = districtAt(x0 + blockW / 2, y0 + blockH / 2);
      const style = DISTRICT_STYLE[district];
      const cols = style.tall ? 2 : 3;
      const rows = 2;
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const w = blockW / cols - 12;
          const h = blockH / rows - 12;
          buildings.push({
            x: x0 + cx * (blockW / cols) + 6, y: y0 + cy * (blockH / rows) + 6, w, h,
            color: style.roofs[Math.floor(random() * style.roofs.length)],
            wall: style.wall, district,
            floors: style.tall ? 4 + Math.floor(random() * 5) : 1 + Math.floor(random() * 3),
            neonSign: district === 'neon' && random() < 0.55,
            signHue: Math.floor(random() * 360),
          });
        }
      }
      for (let p = 0; p < 3; p++) {
        palms.push({ x: x0 + random() * blockW, y: y0 + random() * blockH, sway: random() * 6.28 });
      }
    }
  }
  return { buildings, palms, landmarks };
}

export function buildingAt(city, worldX, worldY, pad = 0) {
  for (const b of city.buildings) {
    if (worldX > b.x - pad && worldX < b.x + b.w + pad && worldY > b.y - pad && worldY < b.y + b.h + pad) return b;
  }
  return null;
}

export function drawCity(ctx, city, camera, viewW, viewH, timeOfDay, elapsed) {
  const night = timeOfDay > 0.78 || timeOfDay < 0.06;
  const sunset = timeOfDay > 0.6 && timeOfDay <= 0.78;
  ctx.fillStyle = night ? '#20304a' : sunset ? '#7ec8a9' : '#8fd6a2';
  ctx.fillRect(0, 0, viewW, viewH);
  const left = camera.x - viewW / 2 - 80, top = camera.y - viewH / 2 - 80;
  const right = camera.x + viewW / 2 + 80, bottom = camera.y + viewH / 2 + 80;
  // Marina water strip along the south-west edge blocks.
  ctx.fillStyle = night ? '#14425e' : '#2fa8c9';
  ctx.fillRect(-camera.x + viewW / 2, 2560 - camera.y + viewH / 2, WORLD_WIDTH, 140);
  // Roads.
  ctx.fillStyle = night ? '#2b2f38' : '#454a55';
  for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_WIDTH / 2 - camera.x + viewW / 2, -camera.y + viewH / 2, ROAD_WIDTH, WORLD_HEIGHT);
  for (const ry of ROAD_YS) ctx.fillRect(-camera.x + viewW / 2, ry - ROAD_WIDTH / 2 - camera.y + viewH / 2, WORLD_WIDTH, ROAD_WIDTH);
  // Lane dashes and sidewalks.
  ctx.strokeStyle = night ? '#8a8f5a' : '#f5d76e';
  ctx.lineWidth = 4; ctx.setLineDash([26, 22]);
  ctx.beginPath();
  for (const rx of ROAD_XS) { ctx.moveTo(rx - camera.x + viewW / 2, -camera.y + viewH / 2); ctx.lineTo(rx - camera.x + viewW / 2, WORLD_HEIGHT - camera.y + viewH / 2); }
  for (const ry of ROAD_YS) { ctx.moveTo(-camera.x + viewW / 2, ry - camera.y + viewH / 2); ctx.lineTo(WORLD_WIDTH - camera.x + viewW / 2, ry - camera.y + viewH / 2); }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = night ? '#4a4f58' : '#cfd6cf';
  for (const rx of ROAD_XS) { ctx.fillRect(rx - ROAD_WIDTH / 2 - 12 - camera.x + viewW / 2, -camera.y + viewH / 2, 12, WORLD_HEIGHT); ctx.fillRect(rx + ROAD_WIDTH / 2 - camera.x + viewW / 2, -camera.y + viewH / 2, 12, WORLD_HEIGHT); }
  // Buildings with simple shadow and lit windows at night.
  for (const b of city.buildings) {
    if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bottom) continue;
    const sx = b.x - camera.x + viewW / 2, sy = b.y - camera.y + viewH / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(sx + 7, sy + 9, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(sx, sy, b.w, b.h);
    ctx.fillStyle = b.wall; ctx.fillRect(sx + 5, sy + 5, b.w - 10, 10);
    ctx.fillStyle = night ? '#ffd94d' : 'rgba(255,255,255,0.35)';
    const win = 16;
    for (let wx = sx + 10; wx < sx + b.w - 10; wx += win) for (let wy = sy + 24; wy < sy + b.h - 8; wy += win) if (((wx * 7 + wy * 13) % 5) < (night ? 3 : 1)) ctx.fillRect(wx, wy, 7, 9);
    if (b.neonSign) {
      ctx.save(); ctx.shadowColor = `hsl(${b.signHue} 100% 65%)`; ctx.shadowBlur = night ? 22 : 10;
      ctx.fillStyle = `hsl(${b.signHue} 100% ${night ? 72 : 55}%)`; ctx.fillRect(sx + 8, sy + b.h / 2 - 5, Math.min(64, b.w - 16), 10); ctx.restore();
    }
  }
  // Palms.
  ctx.strokeStyle = night ? '#1d5c38' : '#2e8b57'; ctx.lineWidth = 4;
  ctx.fillStyle = night ? '#237a47' : '#35a862';
  for (const p of city.palms) {
    if (p.x < left || p.x > right || p.y < top || p.y > bottom) continue;
    const sx = p.x - camera.x + viewW / 2, sy = p.y - camera.y + viewH / 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(elapsed + p.sway) * 3, sy - 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx + Math.sin(elapsed + p.sway) * 3, sy - 19, 9, 0, 6.29); ctx.fill();
  }
  // Landmark markers painted on the ground.
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const lm of city.landmarks) {
    const sx = lm.x - camera.x + viewW / 2, sy = lm.y - camera.y + viewH / 2;
    if (sx < -80 || sx > viewW + 80 || sy < -40 || sy > viewH + 40) continue;
    ctx.fillStyle = lm.color; ctx.beginPath(); ctx.arc(sx, sy - 64, 13, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#14202e'; ctx.fillText('★', sx, sy - 59);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3;
    ctx.strokeText(lm.name, sx, sy - 84); ctx.fillText(lm.name, sx, sy - 84);
  }
  // Traffic lights at intersections.
  const phase = trafficLightPhase(elapsed);
  for (const rx of ROAD_XS) for (const ry of ROAD_YS) {
    const sx = rx - camera.x + viewW / 2, sy = ry - camera.y + viewH / 2;
    if (sx < -30 || sx > viewW + 30 || sy < -30 || sy > viewH + 30) continue;
    ctx.fillStyle = '#1c2027'; ctx.fillRect(sx + ROAD_WIDTH / 2 - 4, sy - ROAD_WIDTH / 2 - 4, 14, 14);
    ctx.fillStyle = phase.startsWith('ns') ? '#3dff6e' : '#ff4040';
    ctx.beginPath(); ctx.arc(sx + ROAD_WIDTH / 2 + 3, sy - ROAD_WIDTH / 2 + 3, 5, 0, 6.29); ctx.fill();
  }
  if (night) { ctx.fillStyle = 'rgba(8,12,40,0.34)'; ctx.fillRect(0, 0, viewW, viewH); }
  else if (sunset) { ctx.fillStyle = 'rgba(255,120,40,0.13)'; ctx.fillRect(0, 0, viewW, viewH); }
}
