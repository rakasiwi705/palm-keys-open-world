// Coral Keys — FPS open-world crime game.
// Shared constants, palette and city layout. Written fresh for this entry.
var CK = window.CK || {};
CK.config = {
  title: 'CORAL KEYS',
  city: 'Coral Keys',
  // City spans x in [-200, 200], z in [-200, 200]. Beach and sea at z > 150.
  cityHalf: 200,
  roadGap: 80,
  roadWidth: 14,
  sidewalkWidth: 4,
  eyeHeight: 1.7,
  walkSpeed: 7,
  runSpeed: 12,
  driveAccel: 22,
  driveMaxSpeed: 42,
  driveBrake: 30,
  driveTurn: 1.9,
  playerRadius: 0.6,
  gravity: 22,
  jumpSpeed: 8,
  fov: 72,
  dayLengthSec: 480,
  startHour: 13,
  startMoney: 25,
  palette: {
    sky: 0x87c5e8,
    sun: 0xfff2c8,
    sand: 0xe8d3a0,
    grass: 0x7fbf5a,
    road: 0x3d3d46,
    roadLine: 0xf5d76e,
    sidewalk: 0xcfc4ae,
    sea: 0x2f9dc4,
    seaDeep: 0x1e7fa8,
    palmTrunk: 0x8a6a45,
    palmLeaf: 0x2e9e4f,
    shopPastel: [0xf7b6c2, 0x9fd8c9, 0xf9e29c, 0xa8c8f0, 0xe8b4d9, 0xbfe3a8],
    wall: 0xf2e8d8,
    roof: 0xc96f4a,
    carColors: [0xd23c2e, 0x2e6fd2, 0xf2c230, 0x3fae6a, 0xeeeeee, 0x222222, 0x8a5fd0],
    police: 0xf2f2f2,
    policeLight: 0xff2a2a
  },
  // Named places, all original.
  places: {
    baitShop: { name: 'Coral Bait & Tackle', x: -40, z: -40 },
    motel: { name: 'Sunset Motel', x: 120, z: 40 },
    pier: { name: 'Marina Pier', x: 0, z: 168 },
    boatyard: { name: 'Old Boatyard', x: -120, z: 120 },
    diner: { name: 'Anchor Diner', x: 40, z: -120 },
    grocery: { name: 'Palma Grocery', x: -120, z: -120 },
    juiceBar: { name: 'Papaya Juice Bar', x: 120, z: -40 }
  },
  // Roads run along these coordinates (grid lines).
  roadLines: [-160, -80, 0, 80, 160]
};
