(function () {
  var canvas = document.getElementById("scanfield");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tick = 0;
  var raf = 0;
  var width = 0;
  var height = 0;

  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function along(a, b, n, rand, jitter) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var u = n === 1 ? 0 : i / (n - 1);
      pts.push({
        x: a[0] + (b[0] - a[0]) * u + (rand() - 0.5) * jitter,
        y: a[1] + (b[1] - a[1]) * u + (rand() - 0.5) * jitter,
        z: a[2] + (b[2] - a[2]) * u + (rand() - 0.5) * jitter
      });
    }
    return pts;
  }

  function scaffold(rand, variant) {
    var poles = [
      [-0.55, 0, -0.35],
      [-0.18, 0, -0.35],
      [0.18, 0, -0.35],
      [0.55, 0, -0.35],
      [-0.55, 0, 0.32],
      [-0.18, 0, 0.32],
      [0.18, 0, 0.32],
      [0.55, 0, 0.32]
    ];
    if (variant === "b") {
      poles.splice(2, 1);
      poles.push([0.82, 0, -0.02]);
    }

    var pts = [];
    var h = 1.08;
    poles.forEach(function (p) {
      pts.push.apply(pts, along([p[0], 0, p[2]], [p[0], h, p[2]], 24, rand, 0.012));
    });

    [0.34, 0.76].forEach(function (y) {
      var front = poles.filter(function (p) { return p[2] < 0; }).sort(function (a, b) { return a[0] - b[0]; });
      var back = poles.filter(function (p) { return p[2] >= 0; }).sort(function (a, b) { return a[0] - b[0]; });
      for (var i = 0; i < front.length - 1; i++) {
        pts.push.apply(pts, along([front[i][0], y, front[i][2]], [front[i + 1][0], y, front[i + 1][2]], 16, rand, 0.01));
      }
      for (var j = 0; j < back.length - 1; j++) {
        pts.push.apply(pts, along([back[j][0], y, back[j][2]], [back[j + 1][0], y, back[j + 1][2]], 16, rand, 0.01));
      }
      front.forEach(function (f) {
        for (var k = 0; k < back.length; k++) {
          if (Math.abs(back[k][0] - f[0]) < 0.06) {
            pts.push.apply(pts, along([f[0], y, f[2]], [back[k][0], y, back[k][2]], 14, rand, 0.01));
          }
        }
      });
    });
    return pts;
  }

  function farFrom(p, cloud, thresh) {
    var t2 = thresh * thresh;
    for (var i = 0; i < cloud.length; i++) {
      var q = cloud[i];
      var dx = p.x - q.x;
      var dy = p.y - q.y;
      var dz = p.z - q.z;
      if (dx * dx + dy * dy + dz * dz < t2) return false;
    }
    return true;
  }

  function project(p) {
    return {
      x: (p.x - p.z) * 0.8,
      y: (p.x + p.z) * 0.3 - p.y * 0.92
    };
  }

  var scanA = scaffold(rng(7), "a");
  var scanB = scaffold(rng(11), "b").map(function (p) {
    return { x: p.x + 0.014, y: p.y, z: p.z - 0.01 };
  });
  var deltaA = scanA.filter(function (p) { return farFrom(p, scanB, 0.085); });
  var deltaB = scanB.filter(function (p) { return farFrom(p, scanA, 0.085); });
  var stableB = scanB.filter(function (p) { return !farFrom(p, scanA, 0.085); });

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawCloud(cloud, color, size, alpha) {
    var s = Math.min(width, height) * 0.44;
    var cx = width * 0.5;
    var cy = height * 0.6;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (var i = 0; i < cloud.length; i++) {
      var q = project(cloud[i]);
      ctx.fillRect(cx + q.x * s, cy + q.y * s, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);
    drawCloud(scanA, cssVar("--scan-a"), 1.2, 0.32);
    drawCloud(stableB, cssVar("--scan-b"), 1.35, 0.58);
    drawCloud(deltaA, cssVar("--accent"), 1.8, 0.92);
    drawCloud(deltaB, cssVar("--accent"), 1.9, 1);

    if (!reduced) {
      var y = ((tick * 0.45) % (height + 36)) - 18;
      var accent = cssVar("--accent");
      var g = ctx.createLinearGradient(0, y - 16, 0, y + 16);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, accent);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 16, width, 32);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = accent;
      ctx.fillRect(0, y, width, 1);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = cssVar("--muted");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 8, height / 2);
    ctx.lineTo(width / 2 + 8, height / 2);
    ctx.moveTo(width / 2, height / 2 - 8);
    ctx.lineTo(width / 2, height / 2 + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (!reduced) {
      tick += 1;
      raf = requestAnimationFrame(paint);
    }
  }

  function start() {
    cancelAnimationFrame(raf);
    resize();
    tick = 0;
    paint();
  }

  window.addEventListener("resize", start);
  window.addEventListener("themechange", start);
  start();
})();
