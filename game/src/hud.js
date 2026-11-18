// The HUD of Coral Keys, drawn on the canvas: mission text, clock, cash,
// health, wanted stars, a circular minimap, and the message ticker. The
// minimap shows the whole town at a glance — roads, the sea, Kai, the police
// and the yellow mission marker.
//
// Layout rule, learned the hard way: every element on the right ends at
// HUD_RIGHT (40 px inside the right edge) and is right-aligned to it, and
// the clock, the day, the stars and the cash each get their own row, so
// nothing ever overlaps or runs off the edge. The controls line lives at
// the bottom centre, short enough to fit, and the crate notice is a pill
// under the health bar — never at the right edge.
import { BEACH_TOP, LANDMARKS, PALETTE, SEA_TOP, VIEW, WORLD } from './config.js';
import { currentObjective, missionTitle } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const HUD_RIGHT = VIEW.width - 40;
const MINIMAP = { x: 118, y: 585, radius: 84 };

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function formatClock(seconds) {
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function drawMinimap(ctx, state) {
  const { x, y, radius } = MINIMAP;
  const scale = (radius * 2) / Math.max(WORLD.width, WORLD.height);
  const toMap = (wx, wy) => [x + (wx - WORLD.width / 2) * scale, y + (wy - WORLD.height / 2) * scale];

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  // Ground, beach and sea.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  const [, beachY] = toMap(0, BEACH_TOP);
  const [, seaY] = toMap(0, SEA_TOP);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x - radius, beachY, radius * 2, seaY - beachY);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(x - radius, seaY, radius * 2, y + radius - seaY);

  // Roads.
  ctx.strokeStyle = '#3a3a3f';
  ctx.lineWidth = 3;
  for (const roadY of [400, 900, 1400, 1900]) {
    const [, my] = toMap(0, roadY);
    ctx.beginPath();
    ctx.moveTo(x - radius, my);
    ctx.lineTo(x + radius, my);
    ctx.stroke();
  }
  for (const roadX of [400, 1000, 1600, 2200, 2800]) {
    const [mx] = toMap(roadX, 0);
    ctx.beginPath();
    ctx.moveTo(mx, y - radius);
    ctx.lineTo(mx, y + radius);
    ctx.stroke();
  }

  // Mission marker.
  const objective = currentObjective(state);
  if (objective.marker) {
    const [mx, my] = toMap(objective.marker.x, objective.marker.y);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Police cruisers as blue dots, Kai as a white dot with a dark ring.
  for (const car of state.cars) {
    if (car.driver !== 'police') continue;
    const [mx, my] = toMap(car.x, car.y);
    ctx.fillStyle = '#3d7fd9';
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const [px, py] = toMap(state.player.x, state.player.y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  // Ring and label, like the reference's purple-ringed minimap.
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#b06fd6';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, 'CORAL KEYS', x, y + radius + 18, 15, '#ffffff', 'center', true);
  // North tick.
  text(ctx, 'N', x, y - radius + 16, 14, '#ffffff', 'center', true);
  // Shell counter above the ring, where it never collides with the label.
  if (state.shellsCollected > 0) {
    text(ctx, `Shells ${state.shellsCollected}/10`, x, y - radius - 10, 13, '#ffffff', 'center', true);
  }
}

// Three wanted stars in their own row, right-aligned to HUD_RIGHT.
function drawStars(ctx, wanted) {
  const size = 26;
  const gap = 32;
  const cy = 92;
  for (let i = 0; i < 3; i += 1) {
    const cx = HUD_RIGHT - (2 - i) * gap - size / 2;
    ctx.fillStyle = i < wanted ? '#ffd23e' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let p = 0; p < 10; p += 1) {
      const r = p % 2 === 0 ? size / 2 : size / 5;
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      if (p === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function drawHud(ctx, state) {
  const objective = currentObjective(state);

  // Top-left: mission title and objective.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(16, 14, 470, 78);
  text(ctx, missionTitle(state).toUpperCase(), 28, 40, 17, '#ffd23e', 'left', true);
  text(ctx, objective.text, 28, 64, 19, '#ffffff', 'left');
  text(ctx, objective.hint, 28, 84, 13, '#d8d8d8', 'left');

  // Top-right, one item per row, all ending at HUD_RIGHT: clock, day,
  // wanted stars, then cash. Nothing shares a row with anything else.
  text(ctx, formatClock(state.clock), HUD_RIGHT, 38, 26, '#ffffff', 'right', true);
  text(ctx, `Day ${state.day}`, HUD_RIGHT, 62, 15, '#e8e8e8', 'right');
  drawStars(ctx, state.wanted);
  text(ctx, `$${state.player.cash}`, HUD_RIGHT, 132, 22, '#7dff8a', 'right', true);

  // Health bar, top centre.
  const barW = 220;
  const barX = (VIEW.width - barW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX - 2, 18, barW + 4, 18);
  ctx.fillStyle = state.player.health > 30 ? '#4fd66a' : '#e5534b';
  ctx.fillRect(barX, 20, barW * (state.player.health / 100), 14);
  text(ctx, `HEALTH ${Math.round(state.player.health)}`, barX + barW / 2, 32, 13, '#ffffff', 'center', true);

  // Crate notice: a centred pill under the health bar, far from any edge.
  if (state.hasPackage) {
    const label = 'CARRYING THE CRATE';
    ctx.font = `700 15px ${FONT}`;
    const pillW = ctx.measureText(label).width + 36;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect((VIEW.width - pillW) / 2, 46, pillW, 30);
    text(ctx, label, VIEW.width / 2, 67, 15, '#ffd23e', 'center', true);
  }

  // Minimap, bottom-left.
  drawMinimap(ctx, state);

  // Bottom-right: what Kai is doing, right-aligned to HUD_RIGHT.
  const inCar = state.player.inCar ? state.player.inCar.kind : null;
  text(ctx, inCar ? `Driving: ${inCar}` : 'On foot', HUD_RIGHT, VIEW.height - 58, 16, '#ffffff', 'right', true);

  // Controls: one short centred line at the very bottom, on a dark pill so
  // it stays readable over sand, grass and road alike. Its width is
  // measured, not guessed, and it always fits.
  const controls = 'WASD move/drive · E enter car · F shoot · P pause · Q save · M mute';
  ctx.font = `13px ${FONT}`;
  const controlsW = ctx.measureText(controls).width + 28;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect((VIEW.width - controlsW) / 2, VIEW.height - 28, controlsW, 22);
  text(ctx, controls, VIEW.width / 2, VIEW.height - 14, 13, '#e8e8e8', 'center');

  // Message ticker, centre-bottom, above the controls line.
  if (state.messageTimer > 0 && state.message) {
    ctx.font = `16px ${FONT}`;
    const width = Math.min(900, ctx.measureText(state.message).width + 40);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect((VIEW.width - width) / 2, VIEW.height - 128, width, 34);
    text(ctx, state.message, VIEW.width / 2, VIEW.height - 105, 16, '#ffffff', 'center');
  }
}

export { LANDMARKS };
