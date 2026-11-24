// The moving background on the welcome page: a small neural network. Lines grow from dot to dot,
// column by column, the dots light up as a line arrives, and the paths fade while new ones start.
// It pauses when the page is hidden or scrolled away, and stays still for anyone who has asked their
// device for less motion.
(function () {
  'use strict';
  var COLS = [4, 6, 7, 6, 4];
  var STEP = 0.75;   // seconds for a line to grow to the next dot (medium pace)
  var HOLD = 1.6;    // seconds a finished path stays lit
  var FADE = 1.2;    // seconds to fade out
  var GAP = 0.55;    // seconds between new signals
  var STILL_AT = 8.5; // the moment shown to people who prefer less motion

  function rnd(i) { var v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); }
  function ease(t) { return t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3); }
  function bez(c, u) {
    var m = 1 - u;
    return [m * m * m * c[0] + 3 * m * m * u * c[2] + 3 * m * u * u * c[4] + u * u * u * c[6],
            m * m * m * c[1] + 3 * m * m * u * c[3] + 3 * m * u * u * c[5] + u * u * u * c[7]];
  }

  // The network itself never changes, only where it is drawn.
  var nodes = [], cols = [], links = [], id = 0;
  COLS.forEach(function (n, l) {
    cols.push([]);
    for (var i = 0; i < n; i++) { var o = { l: l, i: i, n: n, ph: rnd(++id) * 6.28, id: id }; nodes.push(o); cols[l].push(o); }
  });
  nodes.forEach(function (a) { nodes.forEach(function (b) { if (b.l === a.l + 1 && rnd(a.id * 31 + b.id) < 0.55) links.push([a, b]); }); });
  function nextOf(a, seed) {
    var c = links.filter(function (e) { return e[0] === a; }).map(function (e) { return e[1]; });
    return c.length ? c[Math.floor(rnd(seed) * c.length)] : null;
  }
  var signals = {};
  function signal(k) {
    if (signals[k]) return signals[k];
    var n = cols[0][Math.floor(rnd(k * 17 + 3) * cols[0].length)], hops = [], s0 = k * GAP;
    for (var l = 0; l < COLS.length - 1 && n; l++) { var m = nextOf(n, k * 101 + l * 7); if (!m) break; hops.push([n, m, s0 + l * STEP]); n = m; }
    signals[k] = { hops: hops, beige: rnd(k * 5 + 1) < 0.3 };
    if (k > 60) delete signals[k - 60];
    return signals[k];
  }

  function start(canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, narrow = false, raf = 0, visible = true, stopped = false, t0 = performance.now();
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function size() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; narrow = W < 760;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function place(n, t) {
      var x0 = narrow ? W * 0.07 : W * 0.5, x1 = narrow ? W * 0.93 : W * 0.97;
      var y0 = narrow ? H * 0.06 : H * 0.12, y1 = narrow ? H * 0.94 : H * 0.92;
      var bx = x0 + (x1 - x0) * n.l / (COLS.length - 1), by = y0 + (y1 - y0) * (n.i + 0.5) / n.n;
      return [bx + Math.sin(t * 0.35 + n.ph) * 6, by + Math.cos(t * 0.3 + n.ph * 1.3) * 8];
    }
    function path(a, b, t, u) {
      var p = place(a, t), q = place(b, t), mx = (p[0] + q[0]) / 2, c = [p[0], p[1], mx, p[1], mx, q[1], q[0], q[1]];
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      for (var v = 0.04; v < u; v += 0.04) { var s = bez(c, v); ctx.lineTo(s[0], s[1]); }
      var e = bez(c, u); ctx.lineTo(e[0], e[1]);
      return e;
    }
    function colours() {
      var dark = document.documentElement.getAttribute('data-theme') !== 'light';
      var bg = getComputedStyle(document.documentElement).getPropertyValue('--mist').trim() || (dark ? '#05080B' : '#FFFFFF');
      return { dark: dark, blue: dark ? '64,184,200' : '15,110,140', beige: '201,169,106', dot: bg };
    }
    function draw(t) {
      var c = colours(), appear = ease(t / 1.0), glow = new Map();
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(' + c.blue + ',' + (0.08 * appear) + ')';
      links.forEach(function (e) { path(e[0], e[1], t, 1); ctx.stroke(); });
      var life = STEP * (COLS.length - 1) + HOLD + FADE;
      var kFrom = Math.max(0, Math.floor((t - life) / GAP)), kTo = Math.floor(t / GAP);
      for (var k = kFrom; k <= kTo; k++) {
        var sg = signal(k), col = sg.beige ? c.beige : c.blue;
        sg.hops.forEach(function (h) {
          if (t < h[2]) return;
          var g = t - h[2], u = ease(Math.min(g / STEP, 1));
          var fo = g < STEP + HOLD ? 1 : Math.max(0, 1 - (g - STEP - HOLD) / FADE);
          if (fo <= 0) return;
          ctx.strokeStyle = 'rgba(' + col + ',' + (0.75 * fo) + ')'; ctx.lineWidth = 1.6;
          var head = path(h[0], h[1], t, u); ctx.stroke();
          if (u < 1) { ctx.fillStyle = 'rgba(' + col + ',.95)'; ctx.beginPath(); ctx.arc(head[0], head[1], 3, 0, 7); ctx.fill(); }
          glow.set(h[0], Math.max(glow.get(h[0]) || 0, fo));
          if (u >= 1) glow.set(h[1], Math.max(glow.get(h[1]) || 0, fo));
        });
      }
      nodes.forEach(function (n) {
        var p = place(n, t), g = glow.get(n) || 0;
        if (g > 0) { ctx.fillStyle = 'rgba(' + c.blue + ',' + (0.16 * g) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, 7); ctx.fill(); }
        ctx.fillStyle = c.dot;
        ctx.strokeStyle = n.id % 5 === 0 ? 'rgba(' + c.beige + ',' + appear + ')' : 'rgba(' + c.blue + ',' + ((0.45 + 0.45 * g) * appear) + ')';
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p[0], p[1], 4.6, 0, 7); ctx.fill(); ctx.stroke();
      });
    }

    function frame(now) {
      raf = 0;
      if (stopped) return;
      draw((now - t0) / 1000);
      if (visible && !still && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && !stopped && !still && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    size();
    if (still) draw(STILL_AT); else raf = requestAnimationFrame(frame);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; wake(); }) : null;
    if (io) io.observe(canvas);
    function onResize() { size(); if (still) draw(STILL_AT); }
    function onVis() { wake(); }
    function onTheme() { if (still) draw(STILL_AT); }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    var mo = new MutationObserver(onTheme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return function stop() {
      stopped = true; if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect(); mo.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }

  window.Network = { start: start };
})();
