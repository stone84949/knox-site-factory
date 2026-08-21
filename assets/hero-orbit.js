/* ============================================================
   HERO ORBIT — Knox Site Factory flagship
   Hand-rolled 3D particle system on canvas 2D. No dependencies.
   A wireframe core with orbiting particle rings and trade-labeled
   site satellites. Honors prefers-reduced-motion with a static
   frame and pauses when off-screen or hidden.
   ============================================================ */

(function () {
  'use strict';

  function init() {
    var canvas = document.querySelector('[data-hero-orbit]');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W = 0;
    var H = 0;
    var DPR = 1;
    var CX = 0;
    var CY = 0;
    var PPU = 1;

    /* ---------- world geometry ---------- */

    var PHI = (1 + Math.sqrt(5)) / 2;

    function normalize(p) {
      var len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
      return [p[0] / len, p[1] / len, p[2] / len];
    }

    var ICO_VERTS = [
      [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
      [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
      [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
    ].map(normalize);

    var ICO_EDGES = (function () {
      var edges = [];
      var min = Infinity;
      var dists = [];
      for (var i = 0; i < ICO_VERTS.length; i++) {
        for (var j = i + 1; j < ICO_VERTS.length; j++) {
          var a = ICO_VERTS[i];
          var b = ICO_VERTS[j];
          var d = Math.sqrt(
            (a[0] - b[0]) * (a[0] - b[0]) +
            (a[1] - b[1]) * (a[1] - b[1]) +
            (a[2] - b[2]) * (a[2] - b[2])
          );
          dists.push([i, j, d]);
          if (d < min) min = d;
        }
      }
      dists.forEach(function (entry) {
        if (entry[2] < min * 1.05) edges.push([entry[0], entry[1]]);
      });
      return edges;
    })();

    var CORE_R = 150;

    function rand(seed) {
      var x = Math.sin(seed * 127.1) * 43758.5453;
      return x - Math.floor(x);
    }

    /* core particle cloud */
    var CORE = [];
    for (var c = 0; c < 110; c++) {
      var u = rand(c + 1) * 2 - 1;
      var theta = rand(c + 50) * Math.PI * 2;
      var r = CORE_R * (0.18 + 0.62 * Math.pow(rand(c + 90), 0.6));
      var s = Math.sqrt(1 - u * u);
      CORE.push({
        p: [r * s * Math.cos(theta), r * s * Math.sin(theta), r * u],
        size: 0.9 + rand(c + 130) * 1.8,
        tone: rand(c + 170),
        tw: 1.5 + rand(c + 210) * 2.5,
        phase: rand(c + 250) * Math.PI * 2
      });
    }

    /* orbit rings */
    function makeRing(radius, tiltX, tiltY, count, speed, emberRatio, yellowRatio) {
      var ring = { radius: radius, tiltX: tiltX, tiltY: tiltY, speed: speed, dots: [] };
      for (var i = 0; i < count; i++) {
        var roll = rand(i * 3 + radius);
        ring.dots.push({
          angle: (i / count) * Math.PI * 2 + rand(i + radius) * 0.5,
          drift: 0.5 + rand(i + radius * 2) * 1.0,
          size: 0.7 + rand(i + radius * 3) * 1.5,
          ember: roll < emberRatio,
          yellow: roll >= emberRatio && roll < emberRatio + yellowRatio,
          tw: 1 + rand(i + radius * 4) * 3,
          phase: rand(i + radius * 5) * Math.PI * 2
        });
      }
      return ring;
    }

    var RINGS = [
      makeRing(250, 0.42, 0.10, 74, 0.16, 0.10, 0.05),
      makeRing(330, -0.28, 0.55, 88, -0.11, 0.14, 0.06),
      makeRing(420, 0.85, -0.35, 104, 0.07, 0.07, 0.04)
    ];

    /* site satellites riding ring 1 */
    var TRADES = ['HVAC', 'SEPTIC', 'GARAGE', 'ROOFING', 'ELECTRIC'];
    var SATS = [];
    for (var s = 0; s < TRADES.length; s++) {
      SATS.push({
        ring: 1,
        angle: (s / TRADES.length) * Math.PI * 2,
        w: 54 + (s % 2) * 10,
        h: 38 + (s % 3) * 6,
        label: TRADES[s],
        spin: (s % 2 ? 1 : -1) * (0.3 + 0.12 * s)
      });
    }

    /* ---------- camera / rotation ---------- */

    var rotY = 0.55;
    var rotX = 0.30;
    var targetRotY = 0.55;
    var targetRotX = 0.30;
    var pointerActive = false;
    var FOCAL = 900;

    function rotate(p, ry, rx) {
      var cy = Math.cos(ry);
      var sy = Math.sin(ry);
      var x1 = p[0] * cy + p[2] * sy;
      var z1 = -p[0] * sy + p[2] * cy;
      var cx = Math.cos(rx);
      var sx = Math.sin(rx);
      var y2 = p[1] * cx - z1 * sx;
      var z2 = p[1] * sx + z1 * cx;
      return [x1, y2, z2];
    }

    function project(p) {
      var safe = Math.max(Math.min(p[2], FOCAL * 0.9), -FOCAL * 0.9);
      var f = FOCAL / (FOCAL - safe);
      return { x: CX + p[0] * f * PPU, y: CY + p[1] * f * PPU, f: f, z: safe };
    }

    function ringPoint(ring, angle) {
      var r = ring.radius;
      var p = [r * Math.cos(angle), 0, r * Math.sin(angle)];
      var cx = Math.cos(ring.tiltX);
      var sx = Math.sin(ring.tiltX);
      var y1 = p[1] * cx - p[2] * sx;
      var z1 = p[1] * sx + p[2] * cx;
      p = [p[0], y1, z1];
      var cy = Math.cos(ring.tiltY);
      var sy = Math.sin(ring.tiltY);
      return [p[0] * cy + p[2] * sy, p[1], -p[0] * sy + p[2] * cy];
    }

    /* ---------- drawing ---------- */

    var TEAL = '159, 214, 191';
    var EMBER = '241, 122, 61';
    var YELLOW = '242, 200, 75';
    var MIST = '237, 244, 241';

    function draw(t) {
      ctx.clearRect(0, 0, W, H);

      var items = [];

      /* faint ring paths */
      RINGS.forEach(function (ring, ri) {
        var pts = [];
        for (var k = 0; k <= 56; k++) {
          var pt = project(rotate(ringPoint(ring, (k / 56) * Math.PI * 2), rotY, rotX));
          pts.push(pt);
        }
        ctx.beginPath();
        pts.forEach(function (pt, k) {
          if (k === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = 'rgba(' + MIST + ', 0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /* core cloud */
      CORE.forEach(function (dot) {
        var pr = project(rotate(dot.p, rotY, rotX));
        var twinkle = 0.55 + 0.45 * Math.sin(t * dot.tw + dot.phase);
        var color = dot.tone < 0.55 ? TEAL : (dot.tone < 0.85 ? EMBER : YELLOW);
        items.push({
          z: pr.z,
          draw: function () {
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, dot.size * pr.f, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color + ',' + (0.28 + 0.5 * twinkle) + ')';
            ctx.fill();
          }
        });
      });

      /* icosa edges */
      ICO_EDGES.forEach(function (edge) {
        var a = project(rotate([
          ICO_VERTS[edge[0]][0] * CORE_R,
          ICO_VERTS[edge[0]][1] * CORE_R,
          ICO_VERTS[edge[0]][2] * CORE_R
        ], rotY, rotX));
        var b = project(rotate([
          ICO_VERTS[edge[1]][0] * CORE_R,
          ICO_VERTS[edge[1]][1] * CORE_R,
          ICO_VERTS[edge[1]][2] * CORE_R
        ], rotY, rotX));
        var depth = (a.f + b.f) / 2;
        items.push({
          z: (a.z + b.z) / 2,
          draw: function () {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(' + TEAL + ',' + (0.16 + 0.3 * (depth - 0.7)) + ')';
            ctx.lineWidth = 1.4 * depth;
            ctx.stroke();
          }
        });
      });

      /* icosa verts */
      ICO_VERTS.forEach(function (v, vi) {
        var pr = project(rotate([v[0] * CORE_R, v[1] * CORE_R, v[2] * CORE_R], rotY, rotX));
        var color = vi % 3 === 0 ? EMBER : TEAL;
        items.push({
          z: pr.z,
          draw: function () {
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, 2.4 * pr.f, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + color + ', 0.9)';
            ctx.shadowColor = 'rgba(' + color + ', 0.8)';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      });

      /* ring particles */
      RINGS.forEach(function (ring) {
        ring.dots.forEach(function (dot) {
          var p = ringPoint(ring, dot.angle + t * ring.speed * dot.drift);
          var pr = project(rotate(p, rotY, rotX));
          var twinkle = 0.5 + 0.5 * Math.sin(t * dot.tw + dot.phase);
          var color = dot.ember ? EMBER : (dot.yellow ? YELLOW : TEAL);
          items.push({
            z: pr.z,
            draw: function () {
              ctx.beginPath();
              ctx.arc(pr.x, pr.y, dot.size * pr.f, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(' + color + ',' + (0.2 + 0.55 * twinkle) + ')';
              ctx.fill();
            }
          });
        });
      });

      /* site satellites */
      SATS.forEach(function (sat) {
        var ring = RINGS[sat.ring];
        var p = ringPoint(ring, sat.angle + t * ring.speed);
        var pr = project(rotate(p, rotY, rotX));
        var w = sat.w * pr.f * PPU * 0.85 + 34;
        var h = sat.h * pr.f * PPU * 0.85 + 24;
        var tilt = Math.sin(t * sat.spin) * 0.06;
        var alpha = 0.35 + 0.55 * Math.min(Math.max((pr.f - 0.6) / 0.8, 0), 1);
        items.push({
          z: pr.z + 10,
          draw: function () {
            ctx.save();
            ctx.translate(pr.x, pr.y);
            ctx.rotate(tilt);
            ctx.fillStyle = 'rgba(14, 21, 18, 0.92)';
            ctx.strokeStyle = 'rgba(' + MIST + ',' + (0.28 + 0.3 * alpha) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(-w / 2, -h / 2, w, h);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(' + EMBER + ', 0.95)';
            ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w * 0.34, 3);
            ctx.fillStyle = 'rgba(' + MIST + ', ' + (0.4 + 0.4 * alpha) + ')';
            ctx.font = '600 ' + Math.max(9, 10 * pr.f) + 'px "IBM Plex Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sat.label.toUpperCase(), 0, h / 2 - 1);
            ctx.restore();
          }
        });
      });

      /* painter's sort: far first */
      items.sort(function (a, b) { return a.z - b.z; });
      items.forEach(function (item) { item.draw(); });
    }

    /* ---------- sizing ---------- */

    function resize() {
      var host = canvas.parentElement;
      var rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (W < 900) {
        CX = W * 0.5;
        CY = H * 0.62;
        PPU = Math.min(W, H) / 1150;
      } else {
        CX = W * 0.66;
        CY = H * 0.52;
        PPU = Math.min(W, H) / 980;
      }
    }

    /* ---------- motion control ---------- */

    var running = false;
    var rafId = 0;
    var last = 0;
    var elapsed = 8;

    function frame(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      if (!pointerActive) {
        targetRotY = 0.55 + 0.3 * Math.sin(elapsed * 0.1);
        targetRotX = 0.3 + 0.12 * Math.sin(elapsed * 0.07 + 1.2);
      }
      rotY += (targetRotY - rotY) * 0.045;
      rotX += (targetRotX - rotX) * 0.045;

      draw(elapsed);
      rafId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      last = window.performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
    }

    resize();

    if (reduced) {
      draw(12);
    } else {
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !document.hidden) start();
            else stop();
          });
        }, { threshold: 0.05 });
        observer.observe(canvas);
      } else {
        start();
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop();
        else {
          var rect = canvas.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) start();
        }
      });

      var hero = canvas.closest('section') || canvas.parentElement;
      hero.addEventListener('pointermove', function (event) {
        var rect = hero.getBoundingClientRect();
        var nx = (event.clientX - rect.left) / rect.width - 0.5;
        var ny = (event.clientY - rect.top) / rect.height - 0.5;
        pointerActive = true;
        targetRotY = 0.55 + nx * 0.55;
        targetRotX = 0.3 + ny * 0.4;
      });
      hero.addEventListener('pointerleave', function () {
        pointerActive = false;
      });
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resize();
        if (reduced) draw(12);
      }, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
