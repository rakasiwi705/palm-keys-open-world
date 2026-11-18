// Coral Keys — world builder.
// EVERYTHING in the world is 3D geometry (box, cylinder, cone, sphere,
// plane) with colours and 3D materials. No 2D images, no sprites, no flat
// billboards, no downloaded pictures. The only textures are procedural
// canvases painted in code and applied to 3D mesh surfaces (road markings,
// building windows, shop signs). The minimap is HUD UI, not the world.
var CK = window.CK || {};
CK.world = (function () {
  var cfg = CK.config;
  var pal = cfg.palette;

  var colliders = []; // {minX,maxX,minZ,maxZ}
  var buildings = []; // {x,z,w,d,h,name}
  var palms = [];
  var carSpawns = [];
  var pedSpawns = [];
  var scene = null;

  function addCollider(x, z, w, d) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  // Procedural canvas texture: asphalt with a dashed centre line.
  function roadTexture() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#3d3d46'; g.fillRect(0, 0, 128, 256);
    g.fillStyle = '#34343c';
    for (var i = 0; i < 200; i++) {
      g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
    }
    g.fillStyle = '#f5d76e';
    g.fillRect(62, 0, 4, 40); g.fillRect(62, 96, 4, 40); g.fillRect(62, 192, 4, 40);
    g.fillStyle = '#e8e8e8';
    g.fillRect(4, 0, 3, 256); g.fillRect(121, 0, 3, 256);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // Procedural canvas texture: building facade with windows.
  function facadeTexture(base, floors, cols) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, 128, 6);
    for (var f = 0; f < floors; f++) {
      for (var w = 0; w < cols; w++) {
        var x = 10 + w * (108 / cols);
        var y = 14 + f * (104 / floors);
        g.fillStyle = '#20242e';
        g.fillRect(x, y, 108 / cols - 8, 104 / floors - 10);
        g.fillStyle = Math.random() < 0.35 ? '#ffe9a8' : '#9fc8e8';
        g.fillRect(x + 2, y + 2, 108 / cols - 12, 104 / floors - 14);
      }
    }
    return new THREE.CanvasTexture(c);
  }

  // Procedural canvas texture: shop sign board (text painted on a 3D box).
  function signTexture(text, bg) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#ffffff';
    g.font = 'bold 44px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 50);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 6;
    g.strokeRect(3, 3, 506, 90);
    return new THREE.CanvasTexture(c);
  }

  function lambert(color) {
    return new THREE.MeshLambertMaterial({ color: color });
  }

  function box(w, h, d, material, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function addBuilding(x, z, w, d, h, color, name, signBg) {
    var g = new THREE.Group();
    var facade = facadeTexture(color, Math.max(1, Math.round(h / 6)), Math.max(2, Math.round(w / 6)));
    var walls = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ map: facade })
    );
    walls.position.y = h / 2;
    walls.castShadow = true; walls.receiveShadow = true;
    g.add(walls);
    var roof = box(w + 0.6, 0.5, d + 0.6, lambert(pal.roof), 0, h + 0.25, 0);
    g.add(roof);
    if (name) {
      var sign = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(w * 0.9, 14), 1.6, 0.4),
        new THREE.MeshLambertMaterial({ map: signTexture(name, signBg || '#2e6f5e') })
      );
      sign.position.set(0, Math.min(h - 1.2, 6.5), d / 2 + 0.25);
      g.add(sign);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    buildings.push({ x: x, z: z, w: w, d: d, h: h, name: name || '' });
    addCollider(x, z, w, d);
    return g;
  }

  function addPalm(x, z, scale) {
    scale = scale || 1;
    var g = new THREE.Group();
    var trunkH = 7 * scale;
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * scale, 0.45 * scale, trunkH, 7),
      lambert(pal.palmTrunk)
    );
    trunk.position.y = trunkH / 2;
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    g.add(trunk);
    // Leaves: 3D flattened cones fanning out from the crown.
    for (var i = 0; i < 7; i++) {
      var leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.7 * scale, 4.2 * scale, 4),
        lambert(pal.palmLeaf)
      );
      var a = (i / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.5 * scale, trunkH + 0.4 * scale, Math.sin(a) * 1.5 * scale);
      leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      leaf.scale.set(1, 1, 0.22);
      leaf.castShadow = true;
      g.add(leaf);
    }
    // Coconuts: small 3D spheres under the crown.
    for (var j = 0; j < 3; j++) {
      var nut = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 8, 6), lambert(0x6b4a2a));
      nut.position.set((j - 1) * 0.4 * scale, trunkH - 0.2 * scale, 0.3 * scale);
      g.add(nut);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    palms.push({ x: x, z: z });
    addCollider(x, z, 1, 1);
  }

  function addLamp(x, z) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), lambert(0x2c2c34));
    pole.position.y = 3;
    g.add(pole);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8 }));
    bulb.position.y = 6.1;
    g.add(bulb);
    g.position.set(x, 0, z);
    scene.add(g);
    addCollider(x, z, 0.6, 0.6);
  }

  function addCloud(x, y, z, s) {
    var g = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    var parts = [[0, 0, 0, 6], [5, -1, 0, 4.5], [-5, -0.5, 1, 4], [2, 1.5, -1, 4]];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var m = new THREE.Mesh(new THREE.SphereGeometry(p[3], 10, 8), mat);
      m.position.set(p[0], p[1], p[2]);
      m.scale.y = 0.45;
      g.add(m);
    }
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    scene.add(g);
  }

  function build(s) {
    scene = s;
    scene.background = new THREE.Color(pal.sky);
    scene.fog = new THREE.Fog(pal.sky, 180, 520);

    // Sun: a real 3D sphere in the sky, plus directional light.
    var sun = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12),
      new THREE.MeshBasicMaterial({ color: pal.sun }));
    sun.position.set(-180, 160, -260);
    scene.add(sun);
    var sunLight = new THREE.DirectionalLight(0xfff2d8, 1.15);
    sunLight.position.set(-120, 180, -80);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -220; sunLight.shadow.camera.right = 220;
    sunLight.shadow.camera.top = 220; sunLight.shadow.camera.bottom = -220;
    sunLight.shadow.mapSize.set(2048, 2048);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xbfd9e8, 0.55));

    // Clouds: clusters of 3D spheres.
    addCloud(-120, 90, -140, 1.4); addCloud(60, 105, -180, 1.8);
    addCloud(160, 85, 60, 1.2); addCloud(-40, 100, 140, 1.5);
    addCloud(120, 95, -60, 1.0);

    // Ground: grass plane, sand beach strip, sea plane (all 3D planes).
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), lambert(pal.grass));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -60);
    ground.receiveShadow = true;
    scene.add(ground);
    var beach = new THREE.Mesh(new THREE.PlaneGeometry(700, 90), lambert(pal.sand));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.03, 195);
    beach.receiveShadow = true;
    scene.add(beach);
    var sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 160),
      new THREE.MeshLambertMaterial({ color: pal.sea, transparent: true, opacity: 0.94 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, 320);
    scene.add(sea);
    var seaDeep = new THREE.Mesh(new THREE.PlaneGeometry(700, 200),
      lambert(pal.seaDeep));
    seaDeep.rotation.x = -Math.PI / 2; seaDeep.position.set(0, -0.7, 480);
    scene.add(seaDeep);

    // Roads: 3D planes with a procedural asphalt texture.
    var rt = roadTexture();
    var roadMat = new THREE.MeshLambertMaterial({ map: rt });
    cfg.roadLines.forEach(function (c) {
      var v = new THREE.Mesh(new THREE.PlaneGeometry(cfg.roadWidth, 420), roadMat.clone());
      v.material.map = rt.clone();
      v.material.map.repeat.set(1, 3);
      v.material.map.needsUpdate = true;
      v.rotation.x = -Math.PI / 2; v.position.set(c, 0.02, 0);
      v.receiveShadow = true;
      scene.add(v);
      var h = new THREE.Mesh(new THREE.PlaneGeometry(420, cfg.roadWidth), roadMat.clone());
      h.material.map = rt.clone();
      h.material.map.repeat.set(1, 3);
      h.material.map.needsUpdate = true;
      h.rotation.x = -Math.PI / 2; h.rotation.z = Math.PI / 2; h.position.set(0, 0.02, c);
      h.receiveShadow = true;
      scene.add(h);
      // Sidewalks: raised 3D slabs along both sides of each road.
      [-1, 1].forEach(function (side) {
        var sw1 = box(cfg.sidewalkWidth, 0.18, 420, lambert(pal.sidewalk),
          c + side * (cfg.roadWidth / 2 + cfg.sidewalkWidth / 2), 0.09, 0);
        sw1.receiveShadow = true;
        scene.add(sw1);
        var sw2 = box(420, 0.18, cfg.sidewalkWidth, lambert(pal.sidewalk),
          0, 0.09, c + side * (cfg.roadWidth / 2 + cfg.sidewalkWidth / 2));
        sw2.receiveShadow = true;
        scene.add(sw2);
      });
    });

    // Buildings: pastel 3D boxes with shop signs, arranged in blocks.
    var pastel = pal.shopPastel;
    var blocks = [
      { x: -40, z: -40, w: 34, d: 26, h: 9, name: 'Coral Bait & Tackle', bg: '#2e6f5e' },
      { x: 40, z: -40, w: 30, d: 24, h: 12, name: 'Coral House', bg: '#7a4a8a' },
      { x: -120, z: -40, w: 28, d: 22, h: 8, name: 'Palma Grocery', bg: '#4a7a2e' },
      { x: 120, z: -40, w: 32, d: 24, h: 10, name: 'Papaya Juice Bar', bg: '#c96f2e' },
      { x: -40, z: 40, w: 30, d: 26, h: 11, name: 'Palm Bungalow', bg: '#2e5f8a' },
      { x: 40, z: 40, w: 28, d: 22, h: 8, name: 'Coral Cafe', bg: '#8a2e4a' },
      { x: 120, z: 40, w: 36, d: 26, h: 9, name: 'Sunset Motel', bg: '#c94f6e' },
      { x: -120, z: 40, w: 30, d: 24, h: 12, name: 'Keys Surf Shop', bg: '#2e8a7a' },
      { x: -40, z: -120, w: 32, d: 24, h: 10, name: 'Marina Market', bg: '#5e7a2e' },
      { x: 40, z: -120, w: 30, d: 26, h: 9, name: 'Anchor Diner', bg: '#8a5a2e' },
      { x: -120, z: -120, w: 28, d: 22, h: 8, name: 'Palma Grocery', bg: '#4a7a2e' },
      { x: 120, z: -120, w: 30, d: 24, h: 11, name: 'Coral Inn', bg: '#6a4a8a' },
      { x: -40, z: 120, w: 28, d: 22, h: 8, name: 'Old Boatyard', bg: '#6e6e6e' },
      { x: -120, z: 120, w: 34, d: 26, h: 9, name: 'Old Boatyard', bg: '#5e5e5e' },
      { x: 40, z: 120, w: 30, d: 24, h: 10, name: 'Beach House', bg: '#2e7a8a' },
      { x: 120, z: 120, w: 28, d: 22, h: 8, name: 'Seabreeze Hotel', bg: '#8a6e2e' }
    ];
    blocks.forEach(function (b, i) {
      var colorHex = pastel[i % pastel.length];
      addBuilding(b.x, b.z, b.w, b.d, b.h,
        '#' + new THREE.Color(colorHex).getHexString(), b.name, b.bg);
    });

    // Marina pier: 3D wooden planks jutting into the sea.
    var pierGroup = new THREE.Group();
    for (var pi = 0; pi < 14; pi++) {
      var plank = box(3, 0.3, 6, lambert(0x9a7a52), 0, 0.6, 168 + pi * 5.4);
      pierGroup.add(plank);
    }
    [-1.6, 1.6].forEach(function (off) {
      var rail = box(0.25, 1, 76, lambert(0x7a5c38), off, 1.2, 205);
      pierGroup.add(rail);
    });
    scene.add(pierGroup);
    addCollider(0, 205, 4, 78);

    // Palms along the streets and the beach.
    var palmSpots = [];
    cfg.roadLines.forEach(function (c) {
      [-170, -110, -50, 10, 70, 130, 170].forEach(function (t) {
        palmSpots.push([c + 11, t]); palmSpots.push([t, c + 11]);
      });
    });
    for (var p = 0; p < 26; p++) {
      palmSpots.push([-190 + p * 15, 158 + (p % 2) * 6]);
    }
    palmSpots.forEach(function (pt) {
      addPalm(pt[0], pt[1], 0.9 + Math.random() * 0.5);
    });

    // Beach umbrellas: cone + cylinder, fully 3D.
    [[-60, 175], [-20, 182], [30, 176], [80, 184], [140, 178]].forEach(function (pt) {
      var um = new THREE.Group();
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 8), lambert(0xeeeeee));
      pole.position.y = 1.5;
      um.add(pole);
      var top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 10),
        lambert(0xe85d5d));
      top.position.y = 3.3;
      top.castShadow = true;
      um.add(top);
      um.position.set(pt[0], 0, pt[1]);
      scene.add(um);
      addCollider(pt[0], pt[1], 0.6, 0.6);
    });

    // Street lamps at intersections.
    [-80, 0, 80].forEach(function (c) {
      [-80, 0, 80].forEach(function (d) {
        addLamp(c + 10, d + 10);
      });
    });

    // Car spawn points on roads (used by vehicles / traffic).
    // Push into the module arrays (never reassign them: the returned
    // object holds references to these same arrays).
    [
      { x: -160, z: -20, yaw: 0 }, { x: -80, z: 30, yaw: Math.PI },
      { x: 0, z: -60, yaw: 0 }, { x: 80, z: 10, yaw: Math.PI },
      { x: 160, z: -40, yaw: 0 }, { x: -40, z: 80, yaw: Math.PI / 2 },
      { x: 40, z: 160, yaw: -Math.PI / 2 }, { x: -120, z: 120, yaw: 0 }
    ].forEach(function (s) { carSpawns.push(s); });
    [
      { x: -35, z: -28 }, { x: 45, z: -30 }, { x: -115, z: 55 },
      { x: 115, z: -55 }, { x: -75, z: 5 }, { x: 75, z: 85 },
      { x: 5, z: -115 }, { x: -5, z: 125 }, { x: 125, z: 125 },
      { x: -165, z: -75 }, { x: 165, z: 45 }, { x: 25, z: 175 }
    ].forEach(function (s) { pedSpawns.push(s); });
  }

  function collideCircle(x, z, r) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var nx = Math.max(c.minX, Math.min(x, c.maxX));
      var nz = Math.max(c.minZ, Math.min(z, c.maxZ));
      var dx = x - nx, dz = z - nz;
      if (dx * dx + dz * dz < r * r) return { nx: nx, nz: nz, c: c };
    }
    return null;
  }

  function clampToCity(x, z) {
    return {
      x: Math.max(-195, Math.min(195, x)),
      z: Math.max(-195, Math.min(245, z))
    };
  }

  return {
    build: build,
    colliders: colliders,
    buildings: buildings,
    palms: palms,
    carSpawns: carSpawns,
    pedSpawns: pedSpawns,
    collideCircle: collideCircle,
    clampToCity: clampToCity,
    playerSpawn: { x: 0, z: -30, yaw: Math.PI }
  };
})();
