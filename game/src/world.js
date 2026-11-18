// The town of Coral Keys, built deterministically from a seed: a road grid,
// blocks of pastel shops and houses between the roads, palms along the
// streets and on the beach, and the sea along the south edge. Every name is
// invented; the town is nobody else's map.
import { BEACH_TOP, CAR_COLORS, H_ROADS, LANDMARKS, ROAD_WIDTH, SEA_TOP, SHOP_COLORS, V_ROADS, WORLD } from './config.js';

const SHOP_NAMES = [
  'Coral Bait & Tackle', 'Marina Cafe', 'Palma Grocery', 'Sunset Motel',
  'Tide Laundromat', 'Keys Surf Shop', 'Papaya Juice Bar', 'Anchor Diner',
  'Pelican Books', 'Coral Pharmacy', 'Mango Hardware', 'Seabreeze Hotel',
];
const HOUSE_NAMES = ['Beach Cottage', 'Palm Bungalow', 'Keys Villa', 'Coral House'];

function choose(random, list) {
  return list[Math.floor(random() * list.length)];
}

function roadAt(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const roadY of H_ROADS) if (Math.abs(y - roadY) <= half) return true;
  for (const roadX of V_ROADS) if (Math.abs(x - roadX) <= half) return true;
  return false;
}

function roadAxisAt(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const roadY of H_ROADS) if (Math.abs(y - roadY) <= half) return { axis: 'h', at: roadY };
  for (const roadX of V_ROADS) if (Math.abs(x - roadX) <= half) return { axis: 'v', at: roadX };
  return null;
}

/** The closest road centre line to a point, for snapping walkers to sidewalks. */
function closestRoad(x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const roadY of H_ROADS) {
    const d = Math.abs(y - roadY);
    if (d < bestDistance) { bestDistance = d; best = { axis: 'h', at: roadY }; }
  }
  for (const roadX of V_ROADS) {
    const d = Math.abs(x - roadX);
    if (d < bestDistance) { bestDistance = d; best = { axis: 'v', at: roadX }; }
  }
  return best;
}

function overlapsAny(buildings, x, y, w, h, gap) {
  return buildings.some((b) => x < b.x + b.w + gap && x + w + gap > b.x && y < b.y + b.h + gap && y + h + gap > b.y);
}

export function createCity(random) {
  const buildings = [];
  const palms = [];
  const parkedCars = [];
  const shells = [];

  // Landmark shops first, so missions always find them in the same place.
  const landmarks = [
    { ...LANDMARKS.baitShop, w: 150, h: 90, color: '#7fd1c0', kind: 'shop' },
    { ...LANDMARKS.cafe, w: 140, h: 90, color: '#ffd166', kind: 'shop' },
    { ...LANDMARKS.grocery, w: 160, h: 100, color: '#ff9e8a', kind: 'shop' },
    { ...LANDMARKS.motel, w: 170, h: 110, color: '#a8c8e8', kind: 'shop' },
    { ...LANDMARKS.clinic, w: 150, h: 90, color: '#f2ede0', kind: 'shop' },
    { ...LANDMARKS.hideout, w: 180, h: 120, color: '#b7ad93', kind: 'boatyard' },
  ];
  for (const spot of landmarks) {
    buildings.push({ x: spot.x - spot.w / 2, y: spot.y - spot.h / 2, w: spot.w, h: spot.h, color: spot.color, name: spot.name, kind: spot.kind });
  }

  // Fill the remaining blocks with houses and small shops.
  const colEdges = [0, ...V_ROADS, WORLD.width];
  const rowEdges = [0, ...H_ROADS, WORLD.height];
  for (let row = 0; row < rowEdges.length - 1; row += 1) {
    for (let col = 0; col < colEdges.length - 1; col += 1) {
      const x0 = colEdges[col] + ROAD_WIDTH / 2 + 24;
      const x1 = colEdges[col + 1] - ROAD_WIDTH / 2 - 24;
      const y0 = rowEdges[row] + ROAD_WIDTH / 2 + 24;
      const y1 = rowEdges[row + 1] - ROAD_WIDTH / 2 - 24;
      if (x1 - x0 < 130 || y1 - y0 < 110) continue;
      if (y0 > BEACH_TOP) continue;
      const count = 1 + Math.floor(random() * 2);
      for (let i = 0; i < count; i += 1) {
        const w = 110 + random() * 90;
        const h = 80 + random() * 60;
        const x = x0 + random() * Math.max(1, x1 - x0 - w);
        const y = y0 + random() * Math.max(1, y1 - y0 - h);
        if (overlapsAny(buildings, x, y, w, h, 20)) continue;
        const isShop = random() < 0.35;
        buildings.push({
          x, y, w, h,
          color: isShop ? choose(random, SHOP_COLORS) : choose(random, ['#f2ede0', '#ffe9c9', '#d9e8c9']),
          name: isShop ? choose(random, SHOP_NAMES) : choose(random, HOUSE_NAMES),
          kind: isShop ? 'shop' : 'house',
        });
      }
    }
  }

  // Palms along the roads, and a crowd of them on the beach.
  for (let i = 0; i < 130; i += 1) {
    const road = choose(random, [...H_ROADS, ...V_ROADS]);
    const along = 60 + random() * (WORLD.width - 120);
    let x;
    let y;
    if (H_ROADS.includes(road)) { x = along; y = road + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + 18 + random() * 10); }
    else { x = road + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + 18 + random() * 10); y = along; }
    if (y > BEACH_TOP || roadAt(x, y)) continue;
    if (buildings.some((b) => x > b.x - 20 && x < b.x + b.w + 20 && y > b.y - 20 && y < b.y + b.h + 20)) continue;
    palms.push({ x, y, lean: (random() - 0.5) * 0.5, size: 0.8 + random() * 0.5 });
  }
  for (let i = 0; i < 60; i += 1) {
    palms.push({
      x: 40 + random() * (WORLD.width - 80),
      y: BEACH_TOP + 20 + random() * (SEA_TOP - BEACH_TOP - 40),
      lean: (random() - 0.5) * 0.6,
      size: 0.9 + random() * 0.6,
    });
  }

  // Parked cars along the avenues and near the marina.
  for (let i = 0; i < 16; i += 1) {
    const roadY = choose(random, H_ROADS);
    parkedCars.push({
      x: 150 + random() * (WORLD.width - 300),
      y: roadY + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 - 22),
      angle: random() < 0.5 ? 0 : Math.PI,
      color: choose(random, CAR_COLORS),
      kind: random() < 0.3 ? 'pickup' : 'sedan',
    });
  }

  // Seashells on the beach: a small free-roam collectible, $10 each.
  for (let i = 0; i < 10; i += 1) {
    shells.push({ x: 80 + random() * (WORLD.width - 160), y: BEACH_TOP + 30 + random() * (SEA_TOP - BEACH_TOP - 60), taken: false });
  }

  return { buildings, palms, parkedCars, shells, isOnRoad: roadAt, onRoadAxis: roadAxisAt, nearestRoadPoint: closestRoad };
}

/** Push a circle (walker, car, deputy) out of every building it overlaps. */
export function collideBuildings(city, body) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= body.radius * body.radius) continue;
    if (distSq === 0) { body.x += body.radius; continue; }
    const dist = Math.sqrt(distSq);
    body.x = cx + (dx / dist) * body.radius;
    body.y = cy + (dy / dist) * body.radius;
    if (body.vx !== undefined) {
      // Remove the velocity component that pushed into the wall.
      const dot = body.vx * (dx / dist) + body.vy * (dy / dist);
      if (dot < 0) { body.vx -= (dx / dist) * dot; body.vy -= (dy / dist) * dot; }
    }
  }
}

export function clampToWorld(body, margin) {
  body.x = Math.max(margin, Math.min(WORLD.width - margin, body.x));
  body.y = Math.max(margin, Math.min(WORLD.height - margin, body.y));
}
