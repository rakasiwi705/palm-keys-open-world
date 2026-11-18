// Drawing only: the game state and the current screen in, pixels out. The
// camera follows Kai through the 3200x2400 town; the 1280x720 view is scaled
// to fit the window. All art is drawn with canvas shapes — no images, no
// network, nothing borrowed.
import { BEACH_TOP, H_ROADS, PALETTE, ROAD_WIDTH, SEA_TOP, V_ROADS, VIEW, WORLD } from './config.js';
import { currentObjective } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_COMPLETE = 'complete';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  // Size the backing store from the canvas's own CSS box, so the 1280x720
  // view is always fully inside the visible area, whatever the window is.
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function drawGround(state) {
    // Grass with a faint checker so the ground reads as lawns, not flat colour.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = PALETTE.grassDark;
    const tile = 160;
    for (let ty = 0; ty < WORLD.height / tile; ty += 1) {
      for (let tx = 0; tx < WORLD.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // Beach and sea along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, BEACH_TOP, WORLD.width, SEA_TOP - BEACH_TOP);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, SEA_TOP, WORLD.width, WORLD.height - SEA_TOP);
    ctx.fillStyle = PALETTE.seaDeep;
    for (let x = 0; x < WORLD.width; x += 90) {
      ctx.fillRect(x + ((state.elapsed * 20) % 90), SEA_TOP + 30 + ((x / 90) % 3) * 40, 46, 5);
    }
    // Marina pier on the east side.
    ctx.fillStyle = '#8a6f4d';
    ctx.fillRect(2920, 1900, 220, 26);
    ctx.fillStyle = '#6f5a3c';
    for (let x = 2930; x < 3140; x += 24) ctx.fillRect(x, 1900, 4, 26);
  }

  function drawRoads() {
    for (const roadY of H_ROADS) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(0, roadY - ROAD_WIDTH / 2 - 14, WORLD.width, ROAD_WIDTH + 28);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(0, roadY - ROAD_WIDTH / 2, WORLD.width, ROAD_WIDTH);
      ctx.fillStyle = PALETTE.roadLine;
      for (let x = 0; x < WORLD.width; x += 80) ctx.fillRect(x, roadY - 3, 44, 6);
    }
    for (const roadX of V_ROADS) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(roadX - ROAD_WIDTH / 2 - 14, 0, ROAD_WIDTH + 28, WORLD.height);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(roadX - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
      ctx.fillStyle = PALETTE.roadLine;
      for (let y = 0; y < WORLD.height; y += 80) ctx.fillRect(roadX - 3, y, 6, 44);
    }
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.buildingRoof;
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      if (b.kind === 'shop') {
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(b.x + 14, b.y + b.h - 26, b.w - 28, 18);
        if (b.w > 120) text(ctx, b.name, b.x + b.w / 2, b.y + b.h - 12, 12, '#ffffff', 'center', true);
      } else if (b.name) {
        text(ctx, b.name, b.x + b.w / 2, b.y + 18, 12, 'rgba(0,0,0,0.55)', 'center');
      }
    }
  }

  function drawPalm(palm) {
    ctx.save();
    ctx.translate(palm.x, palm.y);
    ctx.rotate(palm.lean);
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 5 * palm.size;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -26 * palm.size);
    ctx.stroke();
    ctx.fillStyle = '#2e7d32';
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 14 * palm.size, -26 * palm.size + Math.sin(a) * 8 * palm.size, 16 * palm.size, 5 * palm.size, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCar(car, now) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const length = car.kind === 'pickup' ? 72 : 62;
    const width = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-length / 2 + 4, -width / 2 + 5, length, width);
    ctx.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
    ctx.beginPath();
    ctx.roundRect(-length / 2, -width / 2, length, width, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-length / 2 + 12, -width / 2 + 5, 14, width - 10);
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    ctx.fillRect(-6, -width / 2 + 4, 16, width - 8);
    if (car.kind === 'pickup') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(length / 2 - 20, -width / 2 + 4, 14, width - 8);
    }
    if (car.kind === 'police') {
      const blink = Math.floor(now * 4) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3b30' : '#3d7fd9';
      ctx.fillRect(-4, -width / 2 - 4, 8, 6);
      ctx.fillStyle = blink ? '#3d7fd9' : '#ff3b30';
      ctx.fillRect(4, -width / 2 - 4, 8, 6);
      text(ctx, 'SHERIFF', 0, -width / 2 - 10, 10, '#ffffff', 'center', true);
    }
    ctx.restore();
  }

  function drawPerson(p, isPlayer, now) {
    const bob = Math.sin(p.walkCycle || 0) * 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.down > 0) {
      // Knocked down: lying flat.
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = p.shirt;
      ctx.fillRect(-12, -7, 24, 14);
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs, swinging as the person walks.
    ctx.strokeStyle = '#2b2b3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-4 + bob, 12);
    ctx.moveTo(0, 2);
    ctx.lineTo(4 - bob, 12);
    ctx.stroke();
    // Torso and head.
    ctx.fillStyle = isPlayer ? '#e8e4da' : p.shirt;
    ctx.beginPath();
    ctx.roundRect(-8, -10, 16, 14, 5);
    ctx.fill();
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(0, -15, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(0, -17, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    if (isPlayer) {
      // A facing tick so the player reads at a glance.
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(Math.cos(p.facing) * 14, -15 + Math.sin(p.facing) * 14);
      ctx.stroke();
    }
    if (p.officer) {
      text(ctx, '★', 0, -26, 12, '#ffd23e', 'center', true);
    }
    ctx.restore();
  }

  function drawMarker(state, now) {
    const objective = currentObjective(state);
    if (!objective.marker) return;
    const pulse = 1 + 0.15 * Math.sin(now * 4);
    ctx.save();
    ctx.translate(objective.marker.x, objective.marker.y);
    ctx.fillStyle = 'rgba(255,210,62,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    // A floating diamond above the marker.
    const bobY = -46 + Math.sin(now * 3) * 6;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(0, bobY - 12);
    ctx.lineTo(10, bobY);
    ctx.lineTo(0, bobY + 12);
    ctx.lineTo(-10, bobY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(state) {
    const cam = state.camera;
    ctx.save();
    ctx.translate(-cam.x + VIEW.width / 2, -cam.y + VIEW.height / 2);
    drawGround(state);
    drawRoads();
    drawBuildings(state);
    for (const palm of state.city.palms) drawPalm(palm);
    // Seashells glint on the sand.
    for (const shell of state.city.shells) {
      if (shell.taken) continue;
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d9a05a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    drawMarker(state, state.elapsed);
    for (const car of state.cars) drawCar(car, state.elapsed);
    for (const ped of state.peds) drawPerson(ped, false, state.elapsed);
    for (const officer of state.officers) drawPerson(officer, false, state.elapsed);
    for (const bullet of state.bullets) {
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!state.player.inCar) drawPerson(state.player, true, state.elapsed);
    ctx.restore();
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const lineHeight = 32;
    const height = 150 + lines.length * lineHeight + 70;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    ctx.fillStyle = 'rgba(16,24,32,0.88)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    text(ctx, title, VIEW.width / 2, y + 72, 46, '#ffd23e', 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(ctx, lines[i], VIEW.width / 2, y + 130 + i * lineHeight, 19, '#eef1f5', 'center');
    }
    text(ctx, prompt, VIEW.width / 2, y + height - 30, 20, '#7dff8a', 'center', true);
  }

  /** Paint one frame: the town, then the HUD or a panel for the screen. */
  function draw(state, screen, extra) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1a24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWorld(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('CORAL KEYS', [
        'An original open-world crime story in a tropical coastal town.',
        'Walk with WASD. Steal a car with E. Shoot with F. Pause with P.',
        'Three missions from Marisol. Lose the heat. Own the Keys.',
        extra && extra.best ? `Best cash banked: $${extra.best}` : '',
      ], 'Press Space or click to start');
      return;
    }
    // The HUD is drawn by hud.js through the hook below.
    if (draw.onHud) draw.onHud(ctx, state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The Keys will wait for you.', 'Q saves your game. M mutes the music.'], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      drawPanel('BUSTED', ['The sheriff caught up with you.', `You lost $${extra ? extra.lost : 0}. The clinic patched you up.`], 'Press Space to get back out there');
    } else if (screen === SCREEN_COMPLETE) {
      drawPanel('CORAL KEYS IS YOURS', ['All three missions done. Marisol owes you a drink.', 'Free roam: collect shells on the beach, $10 each.'], 'Press Space to keep playing');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  return { draw };
}
