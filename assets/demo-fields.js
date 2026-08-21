/* ============================================================
   DEMO FIELDS — shared ambient canvas for concept demos
   Modes: data-field-canvas="air" (HVAC streamlines)
          data-field-canvas="contour" (septic topography)
   Zero dependencies. Static single frame under
   prefers-reduced-motion. Pauses off-screen / hidden tab.
   ============================================================ */

(function () {
  'use strict';

  function init() {
    var canvas = document.querySelector('[data-field-canvas]');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var mode = canvas.getAttribute('data-field-canvas');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W = 0, H = 0, DPR = 1;
    var ICE = '238, 244, 250';
    var AIR = '156, 195, 232';
    var EMBER = '224, 129, 79';
    var MOSS = '157, 184, 122';

    function rand(seed) {
      var x = Math.sin(seed * 127.1) * 43758.5453;
      return x - Math.floor(x);
    }

    /* ---------- air mode: flowing streamlines ---------- */

    var STREAMS = [];
    function buildAir() {
      STREAMS = [];
      var count = W < 700 ? 16 : 26;
      for (var i = 0; i < count; i++) {
        STREAMS.push({
          y0: (i / count) + (rand(i + 3) - 0.5) * (0.7 / count),
          amp: 0.02 + rand(i + 11) * 0.06,
          freq: 1.2 + rand(i + 21) * 2.6,
          speed: 0.45 + rand(i + 31) * 0.75,
          phase: rand(i + 41) * Math.PI * 2,
          width: 0.8 + rand(i + 51) * 1.4,
          warm: rand(i + 61) > 0.86,
          alpha: 0.16 + rand(i + 71) * 0.22
        });
      }
    }

    function drawAir(t) {
      ctx.clearRect(0, 0, W, H);
      STREAMS.forEach(function (s) {
        ctx.beginPath();
        for (var x = -20; x <= W + 20; x += 14) {
          var drift = Math.sin((x / W) * s.freq * Math.PI * 2 + t * s.speed + s.phase);
          var y = H * s.y0 + drift * H * s.amp;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        var color = s.warm ? EMBER : AIR;
        ctx.strokeStyle = 'rgba(' + color + ',' + s.alpha + ')';
        ctx.lineWidth = s.width;
        ctx.stroke();
      });
    }

    /* ---------- contour mode: drifting topography ---------- */

    var LAYERS = [];
    function buildContour() {
      LAYERS = [];
      var count = W < 700 ? 9 : 14;
      for (var i = 0; i < count; i++) {
        LAYERS.push({
          y0: 0.12 + (i / count) * 0.82,
          amp: 0.035 + rand(i + 5) * 0.075,
          freq: 1.6 + rand(i + 15) * 2.8,
          speed: 0.12 + rand(i + 25) * 0.3,
          phase: rand(i + 35) * Math.PI * 2,
          mossy: rand(i + 45) > 0.55,
          alpha: 0.10 + rand(i + 55) * 0.16
        });
      }
    }

    var SPECKS = [];
    function buildSpecks() {
      SPECKS = [];
      for (var i = 0; i < 26; i++) {
        SPECKS.push({
          x: rand(i + 7),
          y: rand(i + 17),
          rise: 0.35 + rand(i + 27) * 0.8,
          size: 0.8 + rand(i + 37) * 1.5,
          warm: rand(i + 47) > 0.6
        });
      }
    }

    function drawContour(t) {
      ctx.clearRect(0, 0, W, H);
      LAYERS.forEach(function (l) {
        ctx.beginPath();
        for (var x = -20; x <= W + 20; x += 16) {
          var y = H * l.y0
            + Math.sin((x / W) * l.freq * Math.PI * 2 + t * l.speed + l.phase) * H * l.amp
            + Math.sin((x / W) * l.freq * 2.4 * Math.PI * 2 + t * l.speed * 0.6) * H * l.amp * 0.4;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(' + (l.mossy ? MOSS : EMBER) + ',' + l.alpha + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      SPECKS.forEach(function (p) {
        var py = (p.y - ((t * p.rise * 0.05) % 1) + 1) % 1;
        var px = (p.x + Math.sin(t * 0.3 + p.y * 9) * 0.01 + 1) % 1;
        ctx.beginPath();
        ctx.arc(px * W, py * H, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (p.warm ? EMBER : ICE) + ', 0.28)';
        ctx.fill();
      });
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
      if (mode === 'air') buildAir();
      else buildContour();
      if (builtSpecks === false) { buildSpecks(); builtSpecks = true; }
    }

    var builtSpecks = false;

    /* ---------- loop control ---------- */

    var running = false;
    var rafId = 0;
    var last = 0;
    var elapsed = 4;

    function frame(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      if (mode === 'air') drawAir(elapsed);
      else drawContour(elapsed);
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
      if (mode === 'air') drawAir(3); else drawContour(3);
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
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resize();
        if (reduced) {
          if (mode === 'air') drawAir(3); else drawContour(3);
        }
      }, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
