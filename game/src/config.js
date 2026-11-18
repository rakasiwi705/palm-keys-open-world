// Coral Keys — the numbers the whole game agrees on.
// One tropical coastal town, invented for this entry: sandy streets, palm
// trees, pastel shopfronts and a warm afternoon sky. Nothing here borrows a
// name, a place or a look from any commercial game.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;

// The road grid: wide avenues with sidewalks, a sandy beach and the sea
// along the southern edge of the town.
export const ROAD_WIDTH = 150;
export const H_ROADS = [400, 900, 1400, 1900];
export const V_ROADS = [400, 1000, 1600, 2200, 2800];
export const BEACH_TOP = 2100;
export const SEA_TOP = 2280;

// Kai on foot: quick enough to cross a street, slow enough that a car
// always feels like the better idea.
export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  accel: 1600,
  friction: 1400,
  maxHealth: 100,
};

// Cars: long enough to read at a glance, with a turning circle that makes
// a chase through the grid feel tight but fair.
export const CAR = {
  length: 64,
  width: 30,
  radius: 20,
  accel: 420,
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 160,
  turnRate: 2.6,
  offroadFactor: 0.45,
};

// The sheriff: cruisers a touch faster than anything Kai can steal, so a
// chase has to be won with corners, not a straight line.
export const POLICE = {
  accel: 480,
  maxSpeed: 560,
  turnRate: 3.0,
  spawnDistance: 900,
  maxCars: 4,
};

// Sun-soaked palette: lawn green, pale sand, turquoise sea, grey tarmac.
export const PALETTE = {
  grass: '#82b25c',
  grassDark: '#719f4e',
  sand: '#e9d6a5',
  sandDark: '#ddc78f',
  sea: '#2fa8c9',
  seaDeep: '#1d7ea3',
  road: '#5b5b60',
  roadLine: '#e8d96a',
  sidewalk: '#c9c2ae',
  buildingRoof: '#f2ede0',
  plaza: '#b7ad93',
};

// Pastel shopfronts, the colours of the tropical street in the reference.
export const SHOP_COLORS = ['#ff9e8a', '#7fd1c0', '#ffd166', '#a8c8e8', '#f4a7c3', '#9ed69a', '#f7c873'];
export const CAR_COLORS = ['#d94f3d', '#3d7fd9', '#e8c832', '#7a5fd0', '#e8e4da', '#3aa655', '#e07b39'];
export const PED_SHIRTS = ['#e8e4da', '#3d7fd9', '#d94f3d', '#e8c832', '#7fd1c0', '#f4a7c3'];

// Fixed landmarks, in world coordinates. Missions and screenshot scenes
// both navigate to these, so they never move between runs.
export const LANDMARKS = {
  baitShop: { x: 1000, y: 830, name: 'Coral Bait & Tackle' },
  marina: { x: 2950, y: 1900, name: 'Marina Pier' },
  motel: { x: 300, y: 1400, name: 'Sunset Motel' },
  hideout: { x: 250, y: 300, name: 'Old Boatyard' },
  clinic: { x: 1600, y: 330, name: 'Keys Clinic' },
  cafe: { x: 1600, y: 830, name: 'Marina Cafe' },
  grocery: { x: 2200, y: 830, name: 'Palma Grocery' },
};

export const MISSION_REWARDS = [50, 150, 300];
export const SAVE_KEY = 'coralKeysSaveV1';
