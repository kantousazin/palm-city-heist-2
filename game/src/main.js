// PALM CITY HEIST — main loop and glue for the Palmera City open world.
// Ren Solano explores a four-district city on foot and by car: traffic, pedestrians,
// police chases, gang combat, six chained missions, a HUD with minimap, and a save.
// Screenshot scenes are staged deterministically with ?shot=<name>&seed=1 (see shots.json):
// wanted level is frozen in scenes, stars blink red, and each scene is composed mid-block
// or on a straight so collisions and sparks never cover the hero.
import { buildCity, drawCity, buildingAt, WORLD_WIDTH, WORLD_HEIGHT } from './world-city.js';
import { createCamera, updateCamera, addCameraShake } from './camera.js';
import { createParticleSystem, spawnSparks, spawnSmoke, spawnConfetti, updateParticles, drawParticles } from './particles.js';
import { createAudioSynth } from './audio-synth.js';
import { saveGameState, loadGameState, hasSavedGame } from './save-game.js';
import { INTRO_DIALOG, ENDING_DIALOG, BUSTED_TEXT, WASTED_TEXT } from './story.js';
import { createMissionState, currentMission, checkMissionArrival, completeCurrentMission, missionDialogFor, updateMissionTimers } from './missions.js';
import { createParkedCars, updateVehicleDriving, drawVehicle, findNearestParkedCar, vehicleCorners } from './vehicles.js';
import { createTrafficCars, updateTraffic, drawTraffic } from './traffic.js';
import { createPedestrians, updatePedestrians, startlePedestrians, drawPedestrian } from './pedestrians.js';
import { createWantedSystem, addCrime, setWantedStars, clearWanted, updatePolice, drawPolice } from './police.js';
import { createPlayer, updatePlayerOnFoot, damagePlayer, drawPlayerPerson } from './player.js';
import { createGangMembers, createCombatState, playerShoot, stageTracerShots, updateCombat, drawCombat } from './combat.js';
import { drawHUD } from './hud-minimap.js';

const VIEW_W = 1280, VIEW_H = 800;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W; canvas.height = VIEW_H;
const statusEl = document.getElementById('status');

const city = buildCity(seed);
const audio = createAudioSynth();
const particles = createParticleSystem();
const camera = createCamera(675, 675);
const player = createPlayer(505, 665); // spawns beside a parked car downtown, ready to steal
const parkedCars = createParkedCars(seed);
let trafficCars = createTrafficCars(seed);
const pedestrians = createPedestrians(seed);
const gangs = createGangMembers();
const combat = createCombatState();
const wanted = createWantedSystem();
const missions = createMissionState();
window.__palmCity = { player, missions, wanted, parkedCars, camera };

let screen = 'title';
let elapsed = 0;
let timeOfDay = 0.34; // fraction of a 24h cycle; 0.34 = bright morning
let mouseX = VIEW_W / 2, mouseY = VIEW_H / 2, mouseDown = false;
let messageFlash = '', messageTimer = 0;
let arrestTimer = 0, crashCooldown = 0, saveTimer = 0, dialogWasIntro = true;
const keys = {};

function playerPosition() {
  return player.inCar ? { x: player.inCar.x, y: player.inCar.y } : { x: player.x, y: player.y };
}
function buildingHit(x, y, pad) { return buildingAt(city, x, y, pad); }

function queueDialog(lines, isIntro = false) {
  missions.dialogQueue = [...lines];
  missions.dialogActive = lines.length > 0;
  dialogWasIntro = isIntro;
}
function advanceDialog() {
  missions.dialogQueue.shift();
  if (!missions.dialogQueue.length) {
    missions.dialogActive = false;
    if (dialogWasIntro && screen === 'title') startGame();
  }
}

function startGame() {
  screen = 'play';
  const saved = loadGameState();
  if (saved && !shotName) {
    player.money = saved.money; player.health = saved.health ?? 100;
    missions.index = saved.missionIndex ?? 0;
    player.x = saved.x ?? player.x; player.y = saved.y ?? player.y;
  }
  if (!missions.dialogActive && missions.index === 0) queueDialog(missionDialogFor(0));
  statusEl.textContent = 'Playing Palm City Heist.';
}

function persistSave() {
  const pos = playerPosition();
  saveGameState({ money: player.money, health: Math.round(player.health), missionIndex: missions.index, x: Math.round(pos.x), y: Math.round(pos.y) });
}

function showMessage(text, seconds = 3) { messageFlash = text; messageTimer = seconds; }

function respawnAtHospital(reasonText) {
  showMessage(reasonText, 4);
  audio.playBustedSting();
  player.money = Math.max(0, player.money - 100);
  player.health = 100;
  if (player.inCar) { player.inCar.kind = 'parked'; player.inCar.taken = false; player.inCar = null; }
  player.x = 1575; player.y = 760; player.vx = 0; player.vy = 0;
  clearWanted(wanted); arrestTimer = 0;
  persistSave();
}

function enterNearestCar() {
  const car = findNearestParkedCar(parkedCars.filter((c) => !c.taken), player.x, player.y);
  if (!car) return;
  car.taken = true; car.kind = 'player';
  player.inCar = car;
  addCrime(wanted, 6, elapsed); // stealing a car is a crime
  startlePedestrians(pedestrians, car.x, car.y, 130);
  audio.unlockAudio();
}
function exitCar() {
  const car = player.inCar; if (!car) return;
  car.kind = 'parked'; car.taken = false; car.speed = 0;
  player.x = car.x - Math.sin(car.angle) * 30; player.y = car.y + Math.cos(car.angle) * 30;
  player.inCar = null;
}

function handleCarCollisions(dt) {
  crashCooldown = Math.max(0, crashCooldown - dt);
  const car = player.inCar; if (!car) return;
  const prevX = car.prevX ?? car.x, prevY = car.prevY ?? car.y;
  let crashed = false;
  for (const corner of vehicleCorners(car)) if (buildingHit(corner.x, corner.y, 2)) crashed = true;
  for (const other of [...trafficCars, ...wanted.policeCars]) {
    if (Math.hypot(other.x - car.x, other.y - car.y) < 40) crashed = true;
  }
  if (car.x < 20 || car.x > WORLD_WIDTH - 20 || car.y < 20 || car.y > WORLD_HEIGHT - 20) crashed = true;
  if (crashed) {
    spawnSparks(particles, car.x, car.y, 12);
    if (crashCooldown <= 0) {
      crashCooldown = 0.7; addCrime(wanted, 5, elapsed); audio.playCrash(); addCameraShake(camera, 6);
      car.health -= 8;
    }
    car.x = prevX; car.y = prevY; car.speed *= -0.28;
  }
  car.prevX = car.x; car.prevY = car.y;
}

function update(dt) {
  elapsed += dt;
  timeOfDay = (timeOfDay + dt / 240) % 1;
  updateMissionTimers(missions, dt);
  messageTimer = Math.max(0, messageTimer - dt);
  const pos = playerPosition();
  const dialogBlocksInput = missions.dialogActive;

  if (!dialogBlocksInput) {
    if (player.inCar) {
      const car = player.inCar;
      car.prevX = car.x; car.prevY = car.y;
      updateVehicleDriving(car, { forward: keys.KeyW || keys.ArrowUp, back: keys.KeyS || keys.ArrowDown, left: keys.KeyA || keys.ArrowLeft, right: keys.KeyD || keys.ArrowRight, handbrake: keys.Space }, dt);
      player.x = car.x; player.y = car.y;
      if (Math.abs(car.speed) > 240 && Math.random() < dt * 2) spawnSmoke(particles, car.x, car.y, 1);
      audio.setEngineLevel(car.speed / 430, true);
    } else {
      updatePlayerOnFoot(player, { left: keys.KeyA || keys.ArrowLeft, right: keys.KeyD || keys.ArrowRight, up: keys.KeyW || keys.ArrowUp, down: keys.KeyS || keys.ArrowDown }, dt, buildingHit);
      audio.setEngineLevel(0, false);
      if (mouseDown) {
        if (playerShoot(combat, player, audio, particles)) { addCrime(wanted, 7, elapsed); startlePedestrians(pedestrians, player.x, player.y, 210); }
      }
    }
  }
  player.aimAngle = Math.atan2(mouseY - (player.y - camera.y + VIEW_H / 2), mouseX - (player.x - camera.x + VIEW_W / 2));

  handleCarCollisions(dt);
  updateTraffic(trafficCars, dt, elapsed, pos, audio, particles);
  const dangerSpeed = player.inCar ? Math.abs(player.inCar.speed) : 0;
  updatePedestrians(pedestrians, dt, pos, dangerSpeed);
  const rammed = updatePolice(wanted, dt, elapsed, pos, audio);
  if (rammed) {
    spawnSparks(particles, pos.x, pos.y, 8); addCameraShake(camera, 5); audio.playCrash();
    if (player.inCar) player.inCar.health -= 6;
    else if (damagePlayer(player, 6)) respawnAtHospital(WASTED_TEXT);
  }
  updateCombat(combat, dt, gangs, player, particles,
    (amount) => { if (damagePlayer(player, amount)) respawnAtHospital(WASTED_TEXT); },
    (gang) => { player.money += 40; addCrime(wanted, 9, elapsed); spawnConfetti(particles, gang.x, gang.y, 14); });

  // Arrest: standing still next to police with stars on you ends the run.
  const nearPolice = wanted.policeCars.some((c) => Math.hypot(c.x - pos.x, c.y - pos.y) < 54);
  const mySpeed = player.inCar ? Math.abs(player.inCar.speed) : Math.hypot(player.vx, player.vy);
  if (wanted.stars > 0 && nearPolice && mySpeed < 26) { arrestTimer += dt; if (arrestTimer > 2.6) respawnAtHospital(BUSTED_TEXT); }
  else arrestTimer = Math.max(0, arrestTimer - dt * 2);

  // Mission arrival.
  const arrived = checkMissionArrival(missions, pos.x, pos.y);
  if (arrived && !missions.dialogActive) {
    if (arrived.id === 'lose-the-heat' && wanted.stars > 1) {
      showMessage('Lose the police first! (hide far from patrol cars)', 2.5);
    } else {
      const done = completeCurrentMission(missions);
      player.money += done.reward;
      spawnConfetti(particles, pos.x, pos.y, 80);
      audio.playMissionCompleteJingle();
      if (missions.finishedStory) queueDialog(ENDING_DIALOG);
      else { const next = currentMission(missions); if (next) { setWantedStars(wanted, Math.max(wanted.stars, 0)); queueDialog(missionDialogFor(missions.index)); } }
      persistSave();
    }
  }
  saveTimer += dt; if (saveTimer > 10) { saveTimer = 0; persistSave(); }
  updateParticles(particles, dt);
  const vel = player.inCar ? { x: Math.cos(player.inCar.angle) * player.inCar.speed, y: Math.sin(player.inCar.angle) * player.inCar.speed } : { x: player.vx, y: player.vy };
  updateCamera(camera, pos.x, pos.y, vel.x, vel.y, dt, VIEW_W, VIEW_H);
}

function drawObjectiveBeacon() {
  const mission = currentMission(missions); if (!mission) return;
  const sx = mission.targetX - camera.x + VIEW_W / 2, sy = mission.targetY - camera.y + VIEW_H / 2;
  const pulse = 26 + Math.sin(elapsed * 4) * 6;
  ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(sx, sy, pulse, 0, 6.29); ctx.stroke();
  ctx.fillStyle = 'rgba(255,217,77,0.2)'; ctx.beginPath(); ctx.arc(sx, sy, pulse, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', sx, sy + 10);
}

function render() {
  ctx.save();
  ctx.translate(camera.shakeX, camera.shakeY);
  drawCity(ctx, city, camera, VIEW_W, VIEW_H, timeOfDay, elapsed);
  drawObjectiveBeacon();
  for (const car of parkedCars) if (!car.taken) drawVehicle(ctx, car, camera, VIEW_W, VIEW_H);
  drawTraffic(ctx, trafficCars, camera, VIEW_W, VIEW_H);
  drawPolice(ctx, wanted, camera, VIEW_W, VIEW_H);
  for (const ped of pedestrians) drawPedestrian(ctx, ped, camera, VIEW_W, VIEW_H);
  drawCombat(ctx, combat, gangs, camera, VIEW_W, VIEW_H);
  if (player.inCar) drawVehicle(ctx, player.inCar, camera, VIEW_W, VIEW_H);
  else drawPlayerPerson(ctx, player, camera, VIEW_W, VIEW_H);
  drawParticles(ctx, particles, camera, VIEW_W, VIEW_H);
  ctx.restore();

  const nearCar = !player.inCar ? findNearestParkedCar(parkedCars.filter((c) => !c.taken), player.x, player.y) : null;
  if (screen === 'play') drawHUD(ctx, { player, wanted, missions, elapsed, traffic: trafficCars, parked: parkedCars }, VIEW_W, VIEW_H);
  if (messageTimer > 0) {
    ctx.fillStyle = 'rgba(10,18,28,0.85)'; ctx.beginPath(); ctx.roundRect(VIEW_W / 2 - 360, 96, 720, 46, 9); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText(messageFlash, VIEW_W / 2, 126);
  }
  if (arrestTimer > 0.3 && screen === 'play') {
    ctx.fillStyle = '#ff4040'; ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('THE POLICE ARE CLOSING IN…', VIEW_W / 2, VIEW_H - 170);
  }
  if (screen === 'title') drawTitleScreen();
}

function drawTitleScreen() {
  ctx.fillStyle = 'rgba(8,14,26,0.62)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 84px system-ui';
  ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 26;
  ctx.fillText('PALM CITY HEIST', VIEW_W / 2, 250); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff'; ctx.font = '25px system-ui';
  ctx.fillText('An open-world caper in sun-soaked Palmera City — steal cars, dodge the law, run the jobs.', VIEW_W / 2, 302);
  ctx.font = '21px system-ui'; ctx.fillStyle = '#cfe3f5';
  ctx.fillText('WASD drive / walk · E enter & steal car · F exit · Mouse aim · Click shoot · Space handbrake', VIEW_W / 2, 356);
  ctx.fillText('ENTER — Start' + (hasSavedGame() ? '  (saved game found: progress resumes)' : ''), VIEW_W / 2, 420);
  ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 22px system-ui';
  ctx.fillText('Starring Ren Solano, ex-courier, reluctant getaway legend', VIEW_W / 2, 470);
  if (missions.dialogActive) drawHUD(ctx, { player, wanted, missions, elapsed, traffic: trafficCars, parked: parkedCars }, VIEW_W, VIEW_H);
}

// ---- Input ----
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'Enter') {
    audio.unlockAudio();
    if (missions.dialogActive) advanceDialog();
    else if (screen === 'title') { queueDialog(INTRO_DIALOG, true); advanceDialog(); }
  }
  if (screen === 'play' && !missions.dialogActive) {
    if (event.code === 'KeyE') { if (player.inCar) exitCar(); else enterNearestCar(); }
    if (event.code === 'KeyF' && player.inCar) exitCar();
  }
});
window.addEventListener('keyup', (event) => { keys[event.code] = false; });
window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; mouseDown = false; });
canvas.addEventListener('mousemove', (event) => { const r = canvas.getBoundingClientRect(); mouseX = (event.clientX - r.left) * (VIEW_W / r.width); mouseY = (event.clientY - r.top) * (VIEW_H / r.height); });
canvas.addEventListener('mousedown', () => { mouseDown = true; audio.unlockAudio(); if (missions.dialogActive) advanceDialog(); });
window.addEventListener('mouseup', () => { mouseDown = false; });

// ---- Deterministic screenshot scenes (lessons from build 1 applied) ----
function stageShotScene(name) {
  screen = 'play';
  wanted.frozen = true;
  missions.dialogActive = false; missions.dialogQueue = [];
  const putPlayerInCar = (x, y, angle = 0, color = '#e74c3c') => {
    const car = parkedCars[0]; car.x = x; car.y = y; car.angle = angle; car.color = color; car.taken = true; car.kind = 'player';
    player.inCar = car; player.x = x; player.y = y; camera.x = x; camera.y = y;
  };
  if (name === 'cover') {
    timeOfDay = 0.34; missions.index = 0; setWantedStars(wanted, 2);
    putPlayerInCar(900, 648, 0); // mid-block between two intersections: no crash sparks over the hero
    wanted.policeCars = [{ x: 760, y: 724, angle: 0, speed: 0, color: '#ffffff', kind: 'police', health: 100, driftAngle: 0, steerVisual: 0 }];
    // Staged traffic on the same avenue so the street feels alive in frame.
    trafficCars[0].axis = 'x'; trafficCars[0].laneRoad = 675; trafficCars[0].x = 1180; trafficCars[0].y = 702; trafficCars[0].angle = Math.PI; trafficCars[0].dir = -1;
    trafficCars[1].axis = 'x'; trafficCars[1].laneRoad = 675; trafficCars[1].x = 620; trafficCars[1].y = 648; trafficCars[1].angle = 0; trafficCars[1].dir = 1;
    trafficCars[2].axis = 'y'; trafficCars[2].laneRoad = 1125; trafficCars[2].x = 1152; trafficCars[2].y = 900; trafficCars[2].angle = Math.PI / 2; trafficCars[2].dir = 1;
    pedestrians[0].x = 830; pedestrians[0].y = 590; pedestrians[1].x = 1010; pedestrians[1].y = 716; pedestrians[4].x = 700; pedestrians[4].y = 730;
  } else if (name === 'chase') {
    timeOfDay = 0.46; missions.index = 3; setWantedStars(wanted, 4); // frozen at exactly 4 stars
    putPlayerInCar(2230, 1098, 0); // straight stretch east of the crossing, police in column behind
    wanted.policeCars = [1960, 2055, 2150].map((x) => ({ x, y: 1098, angle: 0, speed: 220, color: '#ffffff', kind: 'police', health: 100, driftAngle: 0, steerVisual: 0 }));
    wanted.policeCars.push({ x: 2010, y: 1172, angle: 0, speed: 220, color: '#ffffff', kind: 'police', health: 100, driftAngle: 0, steerVisual: 0 });
    gangs.forEach((g) => { g.x = 600; g.y = 2400; }); // keep gang labels out of this frame
    trafficCars = trafficCars.slice(0, 5); // light traffic: no pile-up chaos
    trafficCars.forEach((c, i) => { c.axis = 'x'; c.laneRoad = 1575; c.y = 1548; c.x = 1700 + i * 300; c.angle = 0; c.dir = 1; });
  } else if (name === 'combat') {
    timeOfDay = 0.58; missions.index = 4; setWantedStars(wanted, 2);
    player.x = 2800; player.y = 1990; camera.x = 2800; camera.y = 1990;
    gangs[0].x = 2885; gangs[0].y = 1950; gangs[1].x = 2915; gangs[1].y = 2045; gangs[2].x = 2860; gangs[2].y = 2085;
    gangs.slice(3).forEach((g) => { g.x = 500; g.y = 500; });
    player.aimAngle = Math.atan2(gangs[0].y - player.y, gangs[0].x - player.x);
    gangs.forEach((g) => { g.facing = Math.atan2(player.y - g.y, player.x - g.x); });
    stageTracerShots(combat, player.x, player.y, player.aimAngle, 4); // bullets already mid-flight
    combat.enemyBullets.push({ x: 2870, y: 1958, vx: -620, vy: 30, life: 0.5, tracer: 24 });
    pedestrians[2].x = 2690; pedestrians[2].y = 1905; pedestrians[2].panic = 3;
    pedestrians[3].x = 2920; pedestrians[3].y = 1895; pedestrians[3].panic = 3;
  } else if (name === 'night') {
    timeOfDay = 0.93; missions.index = 5; setWantedStars(wanted, 1);
    player.x = 2475; player.y = 880; camera.x = 2475; camera.y = 880; // south of the neon intersection, clear of the banner
    gangs.forEach((g) => { g.x = 600; g.y = 2400; });
    missions.completeFlash = 3; missions.completeText = 'MISSION COMPLETE  +$900';
    player.money = 2390;
  } else {
    timeOfDay = 0.34; putPlayerInCar(900, 648, 0);
  }
  // Shot cameras obey the same world clamp as the live camera.
  camera.x = Math.max(VIEW_W / 2, Math.min(WORLD_WIDTH - VIEW_W / 2, camera.x));
  camera.y = Math.max(VIEW_H / 2, Math.min(WORLD_HEIGHT - VIEW_H / 2, camera.y));
}

if (shotName) {
  stageShotScene(shotName);
  let painted = 0;
  const paintShot = () => {
    if (shotName === 'night' && painted === 0) {
      spawnConfetti(particles, player.x, player.y + 16, 110); // burst at the hero's feet, below the banner
      for (let step = 0; step < 6; step++) updateParticles(particles, 0.05); // pre-spread so it reads at capture size
    }
    updateParticles(particles, 0.05);
    render();
    painted++;
    if (painted < 3) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paintShot);
} else {
  queueDialog(INTRO_DIALOG, true);
  missions.dialogActive = false; missions.dialogQueue = [];
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (screen === 'play') update(dt); else { elapsed += dt; updateParticles(particles, dt); const pos = playerPosition(); updateCamera(camera, pos.x, pos.y, 0, 0, dt, VIEW_W, VIEW_H); }
    render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
