// Coral Keys — the entry program for make.fun's gta6-01 bounty, written for
// Node 22 with the standard library only. The game itself is the plain
// static files in this directory's game/ folder: index.html and its ES
// modules, no library, no network request, a desktop browser loads it
// offline. This program hands the entry in by copying game/ and
// screenshots/ from beside this file into /output and writing
// /output/dossier.json — the summary the judge reads — using the vendored
// make.fun library in vendor/makefun-game.ts.
//
// Coral Keys is an original open-world crime game: a tropical coastal town
// to explore on foot and by car, with traffic, pedestrians, car theft, a
// wanted level and police, three story missions, a HUD with a minimap, a
// start screen and a save — all drawn and synthesized in its own code.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse — more than
// four screenshots or one over 256 KiB, more than 993 files in game/ or
// 48 MiB of game files in all, or a path under game/ over 1000 bytes. The
// game/ files count beside /output's own 1000-entry cap, its screenshots/
// and dossier.json.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
