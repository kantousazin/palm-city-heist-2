[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kantousazin/palm-city-heist-2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kantousazin/palm-city-heist-2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# PALM CITY HEIST

An original open-world crime game for the browser, built for make.fun's gta6-01
"Make GTA 6" bounty. Explore **Palmera City** — a sun-soaked coastal city of four
districts (Downtown, the Neon Mile, the Marina and Palm Heights) — on foot and by
car, as **Ren Solano**, an ex-courier driver pulled into one last chain of jobs.

Everything is original: city, characters, vehicles, story, art and sound are made
for this game. No third-party libraries, no network requests, no asset files —
the whole game is hand-written JavaScript modules and one canvas, with all sound
synthesised live through WebAudio.

## What is in the game

- **A living city**: a road grid with traffic lights, lane-following traffic that
  stops at red lights, honks and avoids you, and pedestrians who stroll the
  sidewalks and flee from danger. Day rolls into sunset and a neon-lit night.
- **Cars to steal and drive**: walk up to any parked car and take it. Arcade
  driving with acceleration, drifting (hold Space), collisions with sparks,
  camera shake and an engine hum that follows your speed.
- **Wanted level and police**: stealing, crashing and shooting raise your stars
  (shown big and blinking red). Patrol cars hunt you down and ram you; break
  line of sight and stay clean to cool the heat, or get busted / wasted and pay.
- **Combat**: mouse-aimed shooting with visible tracers, hostile gang crews who
  shoot back, health bars and rewards for taking them down.
- **Six chained missions with a story**: meet Mara at Cafe Sol, run the Neon
  Pickup, recover the Marina crate, lose the heat, take back the warehouse
  payout, and finish with the Palm City Heist itself — with dialog, rewards and
  a mission banner throughout, then free roam.
- **HUD and minimap**: health, money, wanted stars, the current objective, and a
  live minimap showing traffic, parked cars, police and the mission target.
- **Start screen and save**: title screen, and progress (money, health, mission,
  position) saved to `localStorage` so you can pick up where you left off.
- **Polish**: hand-made particles (collision sparks, tyre smoke, muzzle flashes,
  mission confetti), a smooth look-ahead camera, and synthesised sirens, horns,
  gunshots and jingles.
- **Round-3 improvement pass**: hitstop on bullet hits and crashes with hit
  marks, damage numbers and knockback; drifting leaves fading tyre marks and
  pays style money, as do near misses at speed (risk earns the reward, in the
  same place); a speedometer, a cooling-down meter while you hide from the
  police, and an edge arrow with distance toward the objective; a lived-in
  city — crosswalks and stop lines, road wear and manholes, rooftop furniture,
  palms on the sidewalks (never in buildings), three-lamp traffic lights,
  streetlight pools and headlight cones at night; brake lights, turning front
  wheels, footsteps, drift screech and near-miss whooshes in the synth.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Walk, or drive (accelerate, brake/reverse, steer) |
| E | Enter a nearby car / steal it, or exit your car |
| F | Exit car |
| Mouse | Aim (on foot) |
| Mouse click / hold | Shoot |
| Space (in car) | Handbrake — drift |
| Enter | Start the game, advance dialog |

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game is the static
files under `game/` — any static file server works, and it plays fully offline.

## Handing it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored make.fun
library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the game taken with its deterministic scene
mode (`game/src/main.js`, `?shot=<name>&seed=1`, see `shots.json`).

## Source layout

`game/src/` is split by job: `world-city.js` (city generation and rendering),
`traffic.js`, `pedestrians.js`, `police.js` (wanted system), `vehicles.js`,
`player.js`, `combat.js`, `missions.js`, `story.js`, `hud-minimap.js`,
`audio-synth.js`, `particles.js`, `camera.js`, `save-game.js`, and `main.js`
(the loop and glue).
