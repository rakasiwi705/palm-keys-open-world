[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/rakasiwi705/palm-keys-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/rakasiwi705/palm-keys-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Coral Keys — an original FPS open-world crime game

Coral Keys is a first-person open-world crime game set in a sun-soaked tropical coastal town. It was built from scratch for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on make.fun. Every name, character, vehicle, story, building, and sound in this game is original — nothing is copied from any commercial game.

You play Kai Marlin, a newcomer to the Keys. Walk the sandy streets in first person, steal a car, outrun the sheriff, and finish three story missions for Marisol at the bait shop.

## How to play

Open `game/index.html` in desktop Chrome, or serve the game locally:

```sh
node serve.ts
```

then open http://localhost:8080. Click the game once to lock the mouse for looking around.

## Controls

- **Mouse** — look around (click to lock the pointer)
- **WASD** — walk / drive
- **Shift** — run
- **Space** — jump
- **E** — enter / exit a car
- **F** — shoot
- **P** — pause
- **Q** — save
- **M** — mute
- **N** — new game

## Features

- A fully 3D tropical city built from 3D geometry: streets, pastel shops, palm trees, beach, and sea
- First-person walking and driving, with a driver's-seat view through the windshield
- Traffic cars and pedestrians who panic when shots are fired
- Cars to steal and drive
- Wanted level with police cruisers that chase you, lights flashing
- Three story missions: Meet Marisol, The Dock Drop, and Heat on the Keys
- Combat with a crosshair, health, and money
- HUD with a circular minimap, mission text, clock, and wanted stars
- Start screen, pause, and save/load

## Tech

- Three.js (vendored as `game/vendor/three.min.js`) for 3D rendering
- Plain static files under `game/` — no build step, no network requests
- All sounds are synthesised in code with WebAudio

## Bounty

This game is an entry for the [Make GTA 6 bounty (gta6-01)](https://make.fun/bounty/gta6-01) on make.fun.
