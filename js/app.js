// The site itself: a small router plus the pages
// (start screen, path, SQL lab, review and quiz, glossary, settings).
(function () {
  var view = document.getElementById('view');
  var engineReady = null;   // promise for the SQL engine
  var editor = null;        // CodeMirror instance on the current page
  var timerId = null;       // explain-out-loud countdown
  var session = null;      // current review or quiz session
  var xlate = { target: 'pg', open: false }; // the lab's "Translate to" choice, remembered between exercises
  var QUIZ_SIZE = 8;
  var SETTINGS_KEY = 'data-learning-settings';
  var TEXT_SIZES = [['standard', 'Standard'], ['large', 'Large'], ['larger', 'Larger']];
  var TIMERS = [30, 60, 90, 120];

  // ---------- settings (text size and speaking timer), saved in this browser ----------
  function getSettings() {
    var s = { text: 'standard', timer: 60, byte: true, theme: 'device' };
    try {
      var raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');
      if (TEXT_SIZES.some(function (t) { return t[0] === raw.text; })) s.text = raw.text;
      if (TIMERS.indexOf(raw.timer) !== -1) s.timer = raw.timer;
      if (raw.byte === false) s.byte = false;
      if (raw.theme === 'light' || raw.theme === 'dark') s.theme = raw.theme;
    } catch (e) { /* ignore */ }
    return s;
  }
  function applyText(t) {
    if (t === 'standard') document.documentElement.removeAttribute('data-text');
    else document.documentElement.setAttribute('data-text', t);
  }
  function saveSettings(s) {
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    applyText(s.text);
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  // Byte speaks after a short pause, but only if the learner is still on the same page.
  function byteLater(fn, ms) { var at = window.location.hash; setTimeout(function () { if (window.location.hash === at) fn(); }, ms); }
  function clockText(sec) { return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60); }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function topicOf(id) { return byId(window.TOPICS, id); }
  function exercisesIn(topicId) { return window.EXERCISES.filter(function (e) { return e.topic === topicId; }); }
  function nextUndone() {
    for (var i = 0; i < window.EXERCISES.length; i++) {
      if (!Progress.isDone(window.EXERCISES[i].id)) return window.EXERCISES[i];
    }
    return null;
  }
  function doneCount() { return window.EXERCISES.filter(function (e) { return Progress.isDone(e.id); }).length; }
  function dueList() { return window.EXERCISES.filter(function (e) { return Progress.isDue(e.id); }); }
  function weakList() { return window.EXERCISES.filter(function (e) { return Progress.isWeak(e.id) && !Progress.reviewsFinished(e.id); }); }
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function loadEngine() {
    if (!engineReady) {
      // sql.js can fail without ever settling its own promise (for example when the page is opened as a file),
      // so a failure it reports as an unhandled error, or no answer after 30 seconds, counts as failed.
      engineReady = new Promise(function (resolve, reject) {
        function onRejection(ev) {
          var m = String((ev.reason && ev.reason.message) || ev.reason || '');
          if (/wasm|Aborted/i.test(m)) { window.removeEventListener('unhandledrejection', onRejection); reject(ev.reason); }
        }
        window.addEventListener('unhandledrejection', onRejection);
        var slow = setTimeout(function () { window.removeEventListener('unhandledrejection', onRejection); reject(new Error('The SQL engine took too long to start.')); }, 30000);
        LabDB.init(window.initSqlJs, function (file) { return 'vendor/' + file; }).then(function (lib) {
          clearTimeout(slow); window.removeEventListener('unhandledrejection', onRejection); resolve(lib);
        }, function (e) { clearTimeout(slow); reject(e); });
      });
      engineReady.catch(function () { engineReady = null; });
    }
    return engineReady;
  }
  // Removes the editor and any running timer before the page changes.
  var stopNetwork = null;
  function teardown() {
    if (stopNetwork) { stopNetwork(); stopNetwork = null; }
    if (editor) { try { editor.toTextArea(); } catch (e) { /* page already replaced */ } editor = null; }
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  // ---------- result tables ----------
  function tableHtml(columns, rows, max) {
    var shown = rows.slice(0, max);
    return '<div class="table-wrap"><table><thead><tr>' +
      columns.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      shown.map(function (r) {
        return '<tr>' + r.map(function (v) {
          return v === null ? '<td class="null">NULL</td>' : '<td>' + esc(v) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function resultTable(res) {
    if (!res.columns.length) return '<p class="empty">The query ran and returned no rows.</p>';
    var max = 200;
    return tableHtml(res.columns, res.rows, max) +
      '<p class="row-note">' + plural(res.rows.length, 'row', 'rows') +
      (res.rows.length > max ? ', showing the first ' + max : '') + '</p>';
  }
  // Shows only what differs between the learner's result and the expected one.
  function diffPanel(v) {
    var d = v.diff;
    if (!d || v.expected.columns.length !== v.actual.columns.length) return '';
    var html = '<section class="compare"><h2>Where your result differs</h2>';
    if (d.orderOnly) {
      html += '<p>You have the right rows, in the wrong order. First rows of each:</p><div class="cmp-grid">' +
        '<div><h3>Yours</h3>' + tableHtml(v.actual.columns, v.actual.rows, 6) + '</div>' +
        '<div><h3>Expected</h3>' + tableHtml(v.expected.columns, v.expected.rows, 6) + '</div></div>';
    } else {
      html += '<div class="cmp-grid">';
      html += '<div><h3>In your result but not expected (' + d.extra.length + ')</h3>' +
        (d.extra.length ? tableHtml(v.actual.columns, d.extra, 5) + (d.extra.length > 5 ? '<p class="row-note">Showing 5 of ' + d.extra.length + '.</p>' : '')
                        : '<p class="empty">None.</p>') + '</div>';
      html += '<div><h3>Expected but missing from yours (' + d.missing.length + ')</h3>' +
        (d.missing.length ? tableHtml(v.expected.columns, d.missing, 5) + (d.missing.length > 5 ? '<p class="row-note">Showing 5 of ' + d.missing.length + '.</p>' : '')
                          : '<p class="empty">None.</p>') + '</div>';
      html += '</div>';
    }
    return html + '</section>';
  }

  // ---------- routes ----------
  function currentRoute() { return byId(window.ROUTES, Progress.getRoute()) || null; }
  function firstIn(topicId) {
    var list = exercisesIn(topicId);
    return list.filter(function (e) { return !Progress.isDone(e.id); })[0] || list[0];
  }
  function stepHref(step) {
    if (step.href) return step.href;
    if (step.topic) { var e = firstIn(step.topic); return e ? '#/lab/' + e.id : '#/home'; }
    var n = nextUndone();
    return n ? '#/lab/' + n.id : '#/home';
  }
  // The single best thing to do next for this route.
  function nextAction(route) {
    var rid = route ? route.id : 'explore';
    var due = dueList().length, weak = weakList().length;
    if ((rid === 'interview' || rid === 'gaps') && (due || weak)) {
      return { label: due ? 'Review ' + plural(due, 'exercise', 'exercises') + ' due' : 'Revisit ' + plural(weak, 'weak spot', 'weak spots'), href: '#/review' };
    }
    if (rid === 'interview') {
      var unsaid = window.EXERCISES.filter(function (e) { return Progress.isDone(e.id) && !Progress.isAloud(e.id) && (window.ALOUD || {})[e.id]; })[0];
      if (unsaid) return { label: 'Say it out loud: ' + unsaid.title, href: '#/lab/' + unsaid.id };
    }
    if (rid === 'engineering') {
      var pick = ['join', 'cte', 'window'].map(function (t) {
        return exercisesIn(t).filter(function (e) { return !Progress.isDone(e.id); })[0];
      }).filter(Boolean)[0];
      if (pick) return { label: (doneCount() ? 'Continue with ' : 'Start with ') + pick.title, href: '#/lab/' + pick.id };
    }
    var next = nextUndone();
    if (next) return { label: (doneCount() ? 'Continue with ' : 'Start with ') + next.title, href: '#/lab/' + next.id };
    return null;
  }

  // ---------- view: start (choose a route) ----------
  function renderStart() {
    teardown();
    var cur = currentRoute();
    // First visit: the welcome section with the moving network, then the routes below it.
    var hero = cur ? '' : '<section class="hero-home" aria-labelledby="hero-h">' +
      '<canvas class="net-bg" aria-hidden="true"></canvas>' +
      '<div class="hero-copy">' +
      '<p class="hero-tag">Free, no sign-up</p>' +
      '<h1 id="hero-h">Practise data skills, <span>piece by piece.</span></h1>' +
      '<p class="hero-blurb">Every part of the data journey, joined up. Write SQL in your browser, learn the terms data teams use, and build projects that go from messy files to tested pipelines and real business answers.</p>' +
      '<div class="picks">' +
      '<a class="pick main" href="#routes-h" id="pick-route"><b>Choose a route</b><span>A step-by-step path for where you are now.</span></a>' +
      '<a class="pick" href="#/projects"><b>Start a project</b><span>A real business brief, worked end to end.</span></a>' +
      '<button type="button" class="pick pick-beige" data-route="explore"><b>Just explore</b><span>Open everything and look around.</span></button>' +
      '</div></div></section>';
    view.innerHTML = hero + '<section class="start' + (cur ? '' : ' start-below') + '"' + (cur ? '' : ' id="route-choice" hidden') + '>' +
            (cur ? '<h1>Change your route</h1>' : '<h2 id="routes-h" tabindex="-1">Where are you starting?</h2>') +
      '<p class="lede">Everything stays open, and you can change your route at any time.</p>' +
      '<div class="route-grid" role="group" aria-label="Choose a route">' + window.ROUTES.map(function (r, ri) {
        var on = cur && cur.id === r.id;
        return '<button type="button" class="route-card' + (on ? ' on' : '') + '" data-accent="' + (ri + 1) + '" data-route="' + r.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<span class="rc-name">' + esc(r.name) + (on ? '<span class="sr"> (your current route)</span>' : '') + '</span>' +
          '<span class="rc-blurb">' + esc(r.blurb) + '</span></button>';
      }).join('') + '</div>' +
      (cur ? '<p class="start-skip"><a href="#/home">Keep my current route</a></p>' : '') +
      '</section>';
    if (!cur) {
      var canvas = view.querySelector('.net-bg');
      if (canvas && window.Network) stopNetwork = Network.start(canvas);
      var pr = view.querySelector('#pick-route');
      pr.setAttribute('aria-expanded', 'false'); pr.setAttribute('aria-controls', 'route-choice');
      if (pr) pr.addEventListener('click', function (e) {
        e.preventDefault();
        var box = view.querySelector('#route-choice'), first = box.hidden;
        box.hidden = false; pr.setAttribute('aria-expanded', 'true');
        if (first && window.Byte) byteLater(function () { Byte.say('idle', 'Hi, I\'m Byte. I live in code, so I know where the bugs hide. Pick a route and I\'ll tag along.', null, 9000); }, 700);
        var h2 = view.querySelector('#routes-h');
        var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        h2.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
        h2.focus({ preventScroll: true });
      });
    }
    Array.prototype.forEach.call(view.querySelectorAll('[data-route]'), function (b) {
      b.addEventListener('click', function () {
        Progress.setRoute(b.getAttribute('data-route'));
        if (window.location.hash === '#/home') route(); else window.location.hash = '#/home';
      });
    });
    var h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  // ---------- home page building blocks ----------
  function pathRows(topics) {
    return '<ol class="path">' + topics.map(function (t) {
      var list = exercisesIn(t.id);
      var d = list.filter(function (e) { return Progress.isDone(e.id); }).length;
      return '<li class="path-row' + (d === list.length ? ' complete' : '') + '" data-topic="' + t.id + '">' +
        '<div class="clause">' + esc(t.clause) + '</div>' +
        '<div class="path-body">' +
        '<h3>' + esc(t.name) + '<span class="tally">' + d + ' of ' + list.length + '</span></h3>' +
        '<ul class="ex-list">' + list.map(function (e) {
          var isDone = Progress.isDone(e.id), isDue = Progress.isDue(e.id);
          return '<li><a href="#/lab/' + e.id + '" class="' + (isDone ? 'done' : '') + '">' +
            '<span class="mark" aria-hidden="true"></span>' + esc(e.title) +
            (isDone ? '<span class="sr"> (done)</span>' : '') +
            (isDue ? '<span class="due">Review due</span>' : '') + '</a></li>';
        }).join('') + '</ul></div></li>';
    }).join('') + '</ol>';
  }
  function termCount(group) { return window.GLOSSARY.filter(function (g) { return g.group === group; }).length; }
  // A step counts as reached when its work is done, or (for pages with nothing to finish) once it has been opened.
  function stepKey(rt, i) { return rt.id + ':' + i; }
  function stepDone(rt, st, i) {
    if (st.topic) { var l = exercisesIn(st.topic); return l.length > 0 && l.every(function (e) { return Progress.isDone(e.id); }); }
    if (st.next) return window.EXERCISES.some(function (e) { return Progress.isAloud(e.id); });
    var h = st.href || '';
    if (h.indexOf('#/lab/') === 0) return Progress.isDone(h.slice(6));
    if (h === '#/review') return Progress.quizHistory().length > 0;
    return Progress.isVisited(stepKey(rt, i));
  }
  function routeMap(rt) {
    var states = rt.steps.map(function (st, i) { return stepDone(rt, st, i); });
    var here = states.indexOf(false);
    var reached = states.filter(Boolean).length;
    return '<section class="route-steps" aria-labelledby="steps-h"><h2 id="steps-h">Your route map</h2>' +
      '<p class="map-sum">' + (reached === states.length ? 'Every checkpoint reached. Keep practising below.' : reached + ' of ' + states.length + ' checkpoints reached') + '</p>' +
      '<ol class="map" style="--n:' + rt.steps.length + '">' + rt.steps.map(function (st, i) {
        var cls = states[i] ? 'done' : (i === here ? 'here' : 'ahead');
        var word = states[i] ? 'Done' : (i === here ? 'You are here' : 'Coming up');
        return '<li class="cp ' + cls + '"' + (i === here ? ' aria-current="step"' : '') + '>' +
          '<a href="' + stepHref(st) + '" data-step="' + i + '">' +
          '<span class="cp-dot" aria-hidden="true">' + (states[i] ? '&#10003;' : (i + 1)) + (i === here && window.Byte && Byte.enabled() ? '<span class="cp-byte">' + Byte.mini('idle', 42) + '</span>' : '') + '</span>' +
          '<span class="cp-state">' + word + '</span>' +
          '<span class="st-label">' + esc(st.label) + '</span>' +
          '<span class="st-text">' + esc(st.text) + '</span></a></li>';
      }).join('') + '</ol></section>';
  }

  // Interview route: solved exercises still waiting for a spoken answer.
  function aloudQueue() {
    var solved = window.EXERCISES.filter(function (e) { return Progress.isDone(e.id) && (window.ALOUD || {})[e.id]; });
    var waiting = solved.filter(function (e) { return !Progress.isAloud(e.id); });
    return '<section class="queue" aria-labelledby="queue-h"><h2 id="queue-h" class="section-h">Say it out loud</h2>' +
      (waiting.length
        ? '<p>' + plural(waiting.length, 'solved exercise is', 'solved exercises are') + ' waiting for you to explain it aloud.</p><ul class="plain">' +
          waiting.slice(0, 5).map(function (e) { return '<li><a href="#/lab/' + e.id + '">' + esc(e.title) + '</a><span class="meta">' + esc(topicOf(e.topic).clause) + '</span></li>'; }).join('') + '</ul>'
        : '<p>' + (solved.length ? 'You have explained every solved exercise aloud. Solve another to add to the list.' : 'Solve an exercise and its three-sentence model answer unlocks here.') + '</p>') +
      '</section>';
  }

  // ---------- view: progress ----------
  function renderProgress() {
    teardown();
    view.innerHTML = '<section class="progress-page"><h1>Your progress</h1>' + progressBody() + '</section>';
    wireTips();
    var h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  // ---------- view: path (home) ----------
  function renderHome() {
    teardown();
    var rt = currentRoute() || byId(window.ROUTES, 'explore');
    var total = window.EXERCISES.length, done = doneCount();
    var due = dueList().length, weak = weakList().length;

    var html = '<p class="route-bar">Your route: <strong>' + esc(rt.name) + '</strong> <a href="#/start">Change route</a></p>' +
      '<section class="intro">' +
      '<h1>' + esc(rt.headline) + '</h1>' +
      '<p class="lede">' + esc(rt.lede) + '</p>' +
      (rt.note ? '<p class="route-note">' + esc(rt.note) + ' <a href="#/roadmap">See the roadmap</a>.</p>' : '') +
      '</section>';

    if (due || weak) {
      html += '<p class="today-line">' + [due ? plural(due, 'review', 'reviews') + ' due' : '', weak ? plural(weak, 'weak spot', 'weak spots') : ''].filter(Boolean).join(' and ') +
        '. <a href="#/quizzes/review">Go to review</a></p>';
    }

    if (rt.steps && rt.steps.length) html += routeMap(rt);

    if (rt.id === 'interview') html += aloudQueue();

    html += '<section class="home-progress" id="your-progress" aria-labelledby="prog-h">' +
      '<h2 id="prog-h" class="section-h">Your progress</h2>' +
      '<p class="prog-line">' + done + ' of ' + plural(total, 'exercise', 'exercises') + ' solved. <a href="#/progress">See all your progress</a></p>' +
      activityPanel() + '<div class="tip" id="dash-tip" role="tooltip" hidden></div></section>';
    view.innerHTML = html;
    wireTips();
    if (window.Byte) {
      if (due) byteLater(function () { Byte.say('idle', plural(due, 'review is', 'reviews are') + ' waiting. Little and often keeps the bugs away.', { label: 'Start reviewing', run: function () { window.location.hash = '#/review'; } }); }, 700);
      else if (!done) byteLater(function () { Byte.say('idle', 'Good choice. Your first step is marked on the route map. I\'ll pop up if I spot a bug.'); }, 700);
      else if (done === total) byteLater(function () { Byte.happy(); }, 700);
    }
    Array.prototype.forEach.call(view.querySelectorAll('.map a[data-step]'), function (a) {
      a.addEventListener('click', function () { Progress.markVisited(stepKey(rt, Number(a.getAttribute('data-step')))); });
    });
  }

  // ---------- the exercise workspace (used by practice, review and quiz) ----------
  var SCHEMA = [
    { name: 'customers', cols: 'customer_id, customer_city, customer_state' },
    { name: 'sellers', cols: 'seller_id, seller_city, seller_state' },
    { name: 'products', cols: 'product_id, product_category, product_weight_g' },
    { name: 'orders', cols: 'order_id, customer_id, order_status, order_purchase_date, order_delivered_date, order_estimated_delivery_date' },
    { name: 'order_items', cols: 'order_id, order_item_id, product_id, seller_id, price, freight_value' },
    { name: 'order_payments', cols: 'order_id, payment_sequential, payment_type, payment_installments, payment_value' }
  ];

  // A small diagram of how the practice tables link together.
  function schemaDiagram() {
    var box = function (x, y, name, keys) {
      return '<g class="sd-box"><rect x="' + x + '" y="' + y + '" width="150" height="' + (30 + keys.length * 18) + '" rx="6"/>' +
        '<text class="sd-name" x="' + (x + 12) + '" y="' + (y + 20) + '">' + name + '</text>' +
        keys.map(function (k, i) { return '<text class="sd-key" x="' + (x + 12) + '" y="' + (y + 42 + i * 18) + '">' + k + '</text>'; }).join('') + '</g>';
    };
    var line = function (x1, y1, x2, y2, label, lx, ly) {
      return '<line class="sd-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
        '<text class="sd-label" x="' + lx + '" y="' + ly + '">' + label + '</text>';
    };
    return '<figure class="schema-diagram"><svg viewBox="0 0 520 250" role="img" aria-labelledby="sd-t sd-d">' +
      '<title id="sd-t">How the practice tables link</title>' +
      '<desc id="sd-d">Orders link to customers by customer_id and to order_payments and order_items by order_id. Order_items link to products by product_id and to sellers by seller_id.</desc>' +
      line(160, 40, 185, 40, '', 0, 0) +
      line(335, 40, 360, 40, '', 0, 0) +
      line(260, 76, 260, 150, 'order_id', 268, 118) +
      line(185, 175, 160, 175, '', 0, 0) +
      line(335, 175, 360, 175, '', 0, 0) +
      box(10, 10, 'customers', ['customer_id']) +
      box(185, 10, 'orders', ['order_id', 'customer_id']) +
      box(360, 10, 'order_payments', ['order_id']) +
      box(185, 150, 'order_items', ['order_id', 'product_id', 'seller_id']) +
      box(10, 150, 'products', ['product_id']) +
      box(360, 150, 'sellers', ['seller_id']) +
      '</svg><figcaption>Lines show the shared key you join on.</figcaption></figure>';
  }

  function aloudPanel(ex) {
    var model = (window.ALOUD || {})[ex.id];
    if (!model) return '';
    return '<section class="aloud" id="aloud"' + (Progress.isDone(ex.id) ? '' : ' hidden') + ' aria-labelledby="aloud-h">' +
      '<h2 id="aloud-h">Explain it out loud</h2>' +
      '<p>Read your query, then say what it does in three sentences, using this frame:</p>' +
      '<ol class="frame">' +
        '<li><strong>What it answers.</strong> The question, in plain words.<span class="starter">Start with: "This query finds..."</span></li>' +
        '<li><strong>How it works.</strong> The main clauses, in the order they run.<span class="starter">Start with: "It starts from the ... table, then ..."</span></li>' +
        '<li><strong>What to watch.</strong> One thing that could go wrong or change the result.<span class="starter">Start with: "One thing to watch is ..., because ..."</span></li>' +
      '</ol>' +
      '<p class="starter-tip">Pausing is fine. Read the starter, take a breath, then finish the sentence in your own words.</p>' +
      '<div class="timer"><span class="clock" id="t-display" aria-hidden="true">' + clockText(getSettings().timer) + '</span>' +
        '<button type="button" class="btn" id="t-start">Start ' + getSettings().timer + ' seconds</button>' +
        '<span id="t-status" class="sr" role="status"></span></div>' +
      '<div class="actions"><button type="button" class="btn" id="aloud-reveal" aria-expanded="false">Show a model explanation</button></div>' +
      '<ol class="model-say" id="aloud-model" hidden>' + model.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<div class="actions"><button type="button" class="btn primary" id="aloud-done"' + (Progress.isAloud(ex.id) ? ' hidden' : '') + '>I said it out loud</button>' +
        '<span id="aloud-marked" class="marked"' + (Progress.isAloud(ex.id) ? '' : ' hidden') + '>Marked as spoken</span></div>' +
      '</section>';
  }

  function wireAloud(ex) {
    var panel = document.getElementById('aloud');
    if (!panel) return;
    var display = document.getElementById('t-display'), start = document.getElementById('t-start');
    var status = document.getElementById('t-status');
    var full = getSettings().timer, left = full, label = 'Start ' + full + ' seconds';
    function paint() { display.textContent = clockText(left); }
    start.addEventListener('click', function () {
      if (timerId) { clearInterval(timerId); timerId = null; left = full; paint(); start.textContent = label; status.textContent = ''; return; }
      left = full; paint(); start.textContent = 'Stop'; status.textContent = 'Timer started.';
      if (window.Byte) Byte.say('idle', 'Take a breath. Start with the first sentence. Pauses are fine, I\'m only a beetle.', null, 7000);
      timerId = setInterval(function () {
        left -= 1; paint();
        if (left <= 0) {
          clearInterval(timerId); timerId = null; start.textContent = label;
          status.textContent = 'Time is up. Compare what you said with the model explanation.';
          left = full;
        }
      }, 1000);
    });
    var reveal = document.getElementById('aloud-reveal'), model = document.getElementById('aloud-model');
    reveal.addEventListener('click', function () {
      model.hidden = !model.hidden;
      reveal.textContent = model.hidden ? 'Show a model explanation' : 'Hide the model explanation';
      reveal.setAttribute('aria-expanded', String(!model.hidden));
    });
    document.getElementById('aloud-done').addEventListener('click', function () {
      Progress.markAloud(ex.id);
      this.hidden = true; document.getElementById('aloud-marked').hidden = false;
    });
  }

  // ---------- lab on small screens: one flowing page (task, then query, then result) ----------
  // showPane() used to switch tabs. Now it gently scrolls to that part of the page on a phone.
  var smallScreen = window.matchMedia ? window.matchMedia('(max-width: 860px)') : { matches: false, addListener: function () {} };
  var calmMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function showPane(name) {
    if (!smallScreen.matches) return;
    var el = document.getElementById('pane-' + name);
    if (el) el.scrollIntoView({ behavior: calmMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function onScreenChange() { if (editor) editor.refresh(); }
  if (smallScreen.addEventListener) smallScreen.addEventListener('change', onScreenChange); else smallScreen.addListener(onScreenChange);
  // The tables list opens as a panel from the bottom on a phone.
  function wireTables() {
    var det = view.querySelector('details.tables'), btn = document.getElementById('tables-btn');
    if (!det || !btn) return;
    function sync() { btn.setAttribute('aria-expanded', String(det.open)); }
    det.addEventListener('toggle', sync);
    btn.addEventListener('click', function () {
      det.open = !det.open;
      if (det.open) det.querySelector('summary').focus();
    });
    view.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && det.open && smallScreen.matches) { det.open = false; btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!smallScreen.matches || !det.open || !document.body.contains(det)) return;
      if (!det.contains(e.target) && e.target !== btn) det.open = false;
    });
    sync();
  }

  // o: { mode: 'practice' | 'session', crumb, footer, onResult(r), onNext(), isLast }
  function workspace(ex, o) {
    teardown();
    var topic = topicOf(ex.topic);
    var inSession = o.mode === 'session';
    var wrongHere = 0, answered = false;

    view.innerHTML =
      '<div class="lab">' +
      '<section class="task pane pane-task" id="pane-task" aria-label="Task">' + o.crumb +
        '<h1>' + esc(ex.title) + (!inSession && Progress.isDone(ex.id) ? ' <span class="badge">Done</span>' : '') + '</h1>' +
        '<p class="prompt">' + esc(ex.prompt) + '</p>' +
        '<details class="hint"><summary>Show a hint</summary><p>' + esc(ex.hint) + '</p></details>' +
        '<details class="tables"' + (window.innerWidth > 860 ? ' open' : '') + '><summary>Tables in the practice database</summary>' +
        schemaDiagram() +
        '<ul class="schema">' + SCHEMA.map(function (t) {
          return '<li><button type="button" class="tbl" data-table="' + t.name + '">' + t.name + '</button><span class="cols">' + esc(t.cols) + '</span></li>';
        }).join('') + '</ul>' +
        '<p class="schema-note">Select a table name to preview its first rows.</p></details>' +
      '</section>' +
      '<div class="work">' +
      '<section class="pane pane-query" id="pane-query" aria-label="Your query">' +
        '<label class="sr" for="sql-input">Your SQL</label>' +
        '<textarea id="sql-input" spellcheck="false"></textarea>' +
        '<div class="actions lab-bar">' +
          '<button type="button" class="btn" id="run">Run query</button>' +
          '<button type="button" class="btn primary" id="check">Check answer</button>' +
          (inSession ? '<button type="button" class="btn quiet" id="skip">Skip this one</button>' : '') +
          '<button type="button" class="btn quiet tables-btn" id="tables-btn" aria-expanded="false">Tables</button>' +
          '<span class="keys">Ctrl + Enter runs the query. Esc leaves the editor. <a href="#/settings">All shortcuts</a></span>' +
        '</div>' +
      '</section>' +
      '<section class="pane pane-result" id="pane-result" aria-label="Result">' +
        '<div id="feedback" role="status" aria-live="polite"></div>' +
        '<div id="tips"></div>' +
        '<div id="compare"></div>' +
        '<div id="after"></div>' +
        '<div id="result"><p class="empty">Results appear here.</p></div>' +
        '<div id="xlate" hidden></div>' +
        (inSession ? '' : aloudPanel(ex)) +
        '<details class="model" id="model"' + (inSession ? ' hidden' : '') + '><summary>Show the model answer</summary>' +
          '<pre>' + esc(ex.solution) + '</pre><p>' + esc(ex.explain) + '</p></details>' +
        (o.footer || '') +
      '</section></div></div>';

    var feedback = document.getElementById('feedback');
    var tips = document.getElementById('tips');
    var compare = document.getElementById('compare');
    var result = document.getElementById('result');
    var textarea = document.getElementById('sql-input');
    if (!inSession) textarea.value = Progress.getDraft(ex.id);

    editor = window.CodeMirror.fromTextArea(textarea, {
      mode: 'text/x-pgsql', lineNumbers: true, indentUnit: 2, tabSize: 2, lineWrapping: true,
      viewportMargin: Infinity,
      extraKeys: {
        'Ctrl-Enter': function () { runQuery(); }, 'Cmd-Enter': function () { runQuery(); },
        'Shift-Ctrl-Enter': function () { checkAnswer(); }, 'Shift-Cmd-Enter': function () { checkAnswer(); },
        'Esc': function (cm) { cm.getInputField().blur(); document.getElementById('run').focus(); }
      }
    });
    editor.getInputField().setAttribute('aria-label', 'SQL editor. Press Escape to leave the editor.');
    wireTables();
    if (!inSession) editor.on('change', function () { Progress.setDraft(ex.id, editor.getValue()); });

    function show(kind, text) { feedback.className = 'feedback ' + kind; feedback.textContent = text; }
    function showTips(list) {
      tips.innerHTML = list.length ? '<div class="tips"><h2>Things to check</h2><ul>' +
        list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '';
    }
    function clearHelp() { showTips([]); compare.innerHTML = ''; }
    function engineError(err) {
      show('bad', 'The SQL engine could not load. If you are online, refresh the page. If you opened this file from your computer, open it with Live Server in VS Code (right-click index.html, "Open with Live Server") instead of double-clicking it.');
      showPane('result');
      if (window.console) console.error(err);
    }
    function sqlError(e) {
      hideTranslate();
      show('bad', 'SQL error: ' + e.message);
      var friendly = Hints.explainError(e.message);
      showTips(friendly ? [friendly] : []);
      compare.innerHTML = '';
      if (window.Byte) Byte.say('search', friendly ? 'Found a bug! My clue is in the "Things to check" box.' : 'Found a bug in the syntax. Check spelling, commas and brackets near where the error points.');
    }
    function userSql() {
      var sql = editor.getValue().trim();
      if (!sql) { show('info', 'Write a query in the editor first.'); return null; }
      return sql;
    }
    function offerNext() {
      var after = document.getElementById('after');
      after.innerHTML = '<button type="button" class="btn primary" id="next">' + (o.isLast ? 'See results' : 'Next question') + '</button>';
      var next = document.getElementById('next');
      next.addEventListener('click', function () { o.onNext(); });
      next.focus();
    }
    // ---- "Translate to another database": appears under the result once a query has run ----
    var lastRunSql = '';
    function hideTranslate() { var box = document.getElementById('xlate'); if (box) box.hidden = true; }
    function showTranslate(sql) {
      var box = document.getElementById('xlate');
      if (!box || !window.SQLTranslate) return;
      lastRunSql = sql;
      if (!box.firstChild) {
        box.innerHTML = '<details class="xlate"' + (xlate.open ? ' open' : '') + '><summary>Translate to another database</summary>' +
          '<div class="xlate-pick" role="group" aria-label="Database">' +
          Object.keys(SQLTranslate.TARGETS).map(function (k) {
            return '<button type="button" class="seg" data-db="' + k + '">' + esc(SQLTranslate.TARGETS[k]) + '</button>';
          }).join('') + '</div><div class="xlate-out" aria-live="polite"></div></details>';
        var det = box.querySelector('details');
        det.addEventListener('toggle', function () { xlate.open = det.open; });
        Array.prototype.forEach.call(box.querySelectorAll('[data-db]'), function (b) {
          b.addEventListener('click', function () { xlate.target = b.getAttribute('data-db'); paintTranslate(); });
        });
      }
      box.hidden = false;
      paintTranslate();
    }
    function paintTranslate() {
      var box = document.getElementById('xlate'); if (!box) return;
      Array.prototype.forEach.call(box.querySelectorAll('[data-db]'), function (b) {
        var on = b.getAttribute('data-db') === xlate.target;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
      var r = SQLTranslate.translate(lastRunSql, xlate.target);
      var term = gTerm('sql-dialect');
      box.querySelector('.xlate-out').innerHTML =
        '<p class="xlate-head">Your query in <strong>' + esc(r.target) + '</strong></p>' +
        '<pre class="xlate-code" id="xlate-code">' + esc(r.sql) + '</pre>' +
        '<button type="button" class="btn quiet xlate-copy" id="xlate-copy">Copy</button>' +
        (r.changes.length ? '<h2>What changed</h2><ul class="xlate-list">' + r.changes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>'
          : '<p>Nothing needed changing. This query is written the same way in ' + esc(r.target) + '.</p>') +
        (r.warnings.length ? '<h2>Check by hand</h2><ul class="xlate-list xlate-warn">' + r.warnings.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="xlate-small">This covers the common differences, not every one. Only SQLite runs on this site, so the translation cannot be run here.' +
        (term ? ' <a href="' + termLink(term) + '">Compare the databases</a>' : '') + '</p>';
      document.getElementById('xlate-copy').addEventListener('click', function () {
        var btn = this, text = r.sql;
        function done() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1800); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, selectCode);
        else selectCode();
        function selectCode() {
          var range = document.createRange(); range.selectNodeContents(document.getElementById('xlate-code'));
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
          btn.textContent = 'Selected: press Ctrl + C';
        }
      });
    }

    function runQuery() {
      showPane('result');
      var sql = userSql(); if (!sql) return;
      loadEngine().then(function () {
        try {
          result.innerHTML = resultTable(LabDB.run(window.SEED_SQL, sql));
          clearHelp();
          show('info', 'Query ran. Select "Check answer" when the result looks right.');
          showTranslate(sql);
        } catch (e) { sqlError(e); }
      }, engineError);
    }
    function onCorrect(v) {
      var wasDone = Progress.isDone(ex.id);
      if (!wasDone) Progress.markDone(ex.id);
      else if (Progress.isDue(ex.id)) Progress.reviewResult(ex.id, wrongHere === 0);
      clearHelp();
      if (window.Byte) Byte.happy();
      document.getElementById('model').hidden = false;
      document.getElementById('model').open = true;
      if (inSession) {
        answered = true;
        show('good', 'Correct. ' + ex.explain);
        document.getElementById('check').disabled = true;
        document.getElementById('skip').disabled = true;
        o.onResult({ clean: wrongHere === 0, skipped: false });
        offerNext();
      } else {
        show('good', 'Correct. ' + ex.explain);
        var aloud = document.getElementById('aloud');
        if (aloud) { aloud.hidden = false; aloud.scrollIntoView({ block: 'nearest' }); }
      }
    }
    function checkAnswer() {
      if (answered) return;
      showPane('result');
      var sql = userSql(); if (!sql) return;
      loadEngine().then(function () {
        var v;
        try { v = LabDB.check(window.SEED_SQL, ex, sql); } catch (e) { sqlError(e); return; }
        result.innerHTML = resultTable(v.actual);
        showTranslate(sql);
        if (v.ok) { onCorrect(v); return; }
        wrongHere += 1; Progress.addWrong(ex.id);
        show('bad', v.message);
        if (window.Byte) {
          if (wrongHere >= 2) Byte.say('search', 'This one is a sneaky bug. Want a nudge?', { label: 'Show me the hint', run: function () {
            showPane('task'); var hd = view.querySelector('.hint'); if (hd) { hd.open = true; hd.querySelector('summary').focus(); }
          } }, 12000);
          else Byte.say('search', 'Close! It runs, but the result is different. Compare yours with the expected rows below.');
        }
        showTips(Hints.diagnose(sql, ex, v.expected, v.actual));
        compare.innerHTML = diffPanel(v);
      }, engineError);
    }
    function skip() {
      if (answered) return;
      answered = true;
      if (Progress.isDone(ex.id)) Progress.reviewResult(ex.id, false);
      clearHelp();
      show('info', 'Skipped. Read the model answer below, then try this one again later from the Path.');
      document.getElementById('model').hidden = false;
      document.getElementById('model').open = true;
      document.getElementById('check').disabled = true;
      document.getElementById('skip').disabled = true;
      o.onResult({ clean: false, skipped: true });
      offerNext();
    }

    document.getElementById('run').addEventListener('click', runQuery);
    document.getElementById('check').addEventListener('click', checkAnswer);
    if (inSession) document.getElementById('skip').addEventListener('click', skip);
    Array.prototype.forEach.call(view.querySelectorAll('.tbl'), function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-table');
        loadEngine().then(function () {
          result.innerHTML = resultTable(LabDB.run(window.SEED_SQL, 'SELECT * FROM ' + name + ' LIMIT 8'));
          if (smallScreen.matches) { var det = view.querySelector('details.tables'); if (det) det.open = false; }
          showPane('result');
          show('info', 'Preview of ' + name + ' (first 8 rows). Your query in the editor is unchanged.');
        }, engineError);
      });
    });
    if (!inSession) wireAloud(ex);
    loadEngine().catch(engineError);
  }

  // ---------- view: SQL lab (practice) ----------
  // The SQL lab front page: every exercise, grouped by topic, with your route's topics first.
  function renderLabIndex() {
    teardown();
    var rt = currentRoute() || byId(window.ROUTES, 'explore');
    var shown = (rt.topics || window.TOPICS.map(function (t) { return t.id; }));
    var shownTopics = window.TOPICS.filter(function (t) { return shown.indexOf(t.id) !== -1; });
    var otherTopics = window.TOPICS.filter(function (t) { return shown.indexOf(t.id) === -1; });
    var total = window.EXERCISES.length, done = doneCount(), next = nextUndone();
    view.innerHTML = '<section class="lab-index">' +
      '<h1>SQL lab</h1>' +
      '<p class="lede">Practise on a small online shop\'s data: customers, orders, products, sellers and payments.</p>' +
      '<p class="intro-actions">' + (next ? '<a class="btn primary" href="#/lab/' + next.id + '">' + (done ? 'Continue with ' : 'Start with ') + esc(next.title) + '</a>' : '<span class="all-done">All ' + total + ' exercises complete.</span>') +
        '<span class="count">' + done + ' of ' + total + ' exercises done</span></p>' +
      '<section class="route-path" aria-labelledby="path-h"><h2 id="path-h" class="section-h">' + esc(rt.pathTitle || 'SQL topics') + '</h2>' + pathRows(shownTopics) + '</section>' +
      (otherTopics.length ? '<section class="more-topics" aria-labelledby="more-h"><h2 id="more-h" class="section-h">More SQL topics</h2>' + pathRows(otherTopics) + '</section>' : '') +
      '</section>';
  }

  function renderLab(id) {
    if (!id) { renderLabIndex(); return; }
    var ex = byId(window.EXERCISES, id) || nextUndone() || window.EXERCISES[0];
    var idx = window.EXERCISES.indexOf(ex);
    var prev = window.EXERCISES[idx - 1], next = window.EXERCISES[idx + 1];
    var topic = topicOf(ex.topic);
    workspace(ex, {
      mode: 'practice',
      crumb: '<p class="crumb" data-topic="' + topic.id + '"><a href="#/lab">SQL lab</a> / <span class="kw">' + esc(topic.clause) + '</span> ' + esc(topic.name) + '</p>',
      footer: '<nav class="pager" aria-label="Exercises">' +
        (prev ? '<a href="#/lab/' + prev.id + '">Previous: ' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a href="#/lab/' + next.id + '">Next: ' + esc(next.title) + '</a>' : '<a href="#/lab">Back to the SQL lab</a>') +
        '</nav>'
    });
  }

  // ---------- view: review and subject quizzes ----------
  function pickQuiz() {
    var urgent = shuffle(window.EXERCISES.filter(function (e) { return Progress.isDue(e.id) || (Progress.isWeak(e.id) && !Progress.reviewsFinished(e.id)); }));
    var rest = shuffle(window.EXERCISES.filter(function (e) { return Progress.isDone(e.id) && urgent.indexOf(e) === -1; }));
    var fresh = shuffle(window.EXERCISES.filter(function (e) { return !Progress.isDone(e.id) && urgent.indexOf(e) === -1; }));
    var pool = urgent.concat(rest, fresh), picked = [], perTopic = {};
    pool.forEach(function (e) { // first pass: at most 2 from any one topic
      if (picked.length < QUIZ_SIZE && (perTopic[e.topic] || 0) < 2) { picked.push(e); perTopic[e.topic] = (perTopic[e.topic] || 0) + 1; }
    });
    pool.forEach(function (e) { if (picked.length < QUIZ_SIZE && picked.indexOf(e) === -1) picked.push(e); });
    return shuffle(picked).map(function (e) { return e.id; });
  }

  function pickTopicQuiz(topicId) {
    return exercisesIn(topicId).map(function (e) { return e.id; });
  }

  function startSession(kind, ids, topicId) {
    session = { kind: kind, ids: ids, i: 0, results: [], saved: false, topic: topicId || null };
    if (window.location.hash === '#/session') renderSession(); else window.location.hash = '#/session';
  }

  function renderReview(toReview) {
    teardown();
    var due = dueList(), weak = weakList(), hist = Progress.quizHistory();
    var html = '<section class="review"><h1>Quizzes</h1>';

    html += '<div class="review-block">' +
      '<p class="lede">' + CQ_SIZE + ' questions at a time, over three levels: <strong>Recognise</strong>, <strong>Apply</strong> and <strong>Explain</strong>. ' +
        'Score ' + (CQ_SIZE - 1) + ' or more twice to move up a level.</p>' +
      '<div class="topic-quiz" role="group" aria-label="Quiz by subject">' +
      ['all'].concat(window.GLOSSARY_GROUPS.map(function (g) { return g.id; })).map(function (id) {
        var g = id === 'all' ? null : gGroup(id);
        var n = id === 'all' ? window.GLOSSARY.length : termCount(id), m = masteredCount(id);
        return '<a class="topic-btn" ' + (g ? 'data-area="' + id + '" ' : '') + 'href="#/quiz/' + id + '">' +
          '<span class="tb-clause">' + esc(g ? (QUIZ_AREA[id] || g.name) : 'All areas') + '</span>' +
          '<span class="tb-name">' + esc(g ? levelLabel(Progress.quizLevel(id)) : 'A mix from every area') + '</span>' +
          '<span class="tb-meta">' + m + ' of ' + plural(n, 'term', 'terms') + ' mastered</span>' +
          '<span class="mastery-track" aria-hidden="true"><span class="mastery-fill" style="width:' + Math.round(100 * m / Math.max(1, n)) + '%"></span></span></a>';
      }).join('') + '</div></div>';


    if (hist.length) {
      html += '<div class="review-block"><h2>Recent scores</h2><ul class="plain">' + hist.map(function (h) {
        var tag = '';
        if (h.topic && h.topic.indexOf('area:') === 0) { var ar = h.topic.slice(5); tag = ar === 'all' ? 'All areas' : (QUIZ_AREA[ar] || ar); }
        else if (h.topic && topicOf(h.topic)) tag = topicOf(h.topic).clause;
        var kind = h.topic && h.topic.indexOf('area:') === 0 ? 'correct' : 'solved';
        return '<li>' + esc(h.on) + (tag ? ' <span class="kw">' + esc(tag) + '</span>' : '') + '<span class="meta">' + h.score + ' of ' + h.total + ' ' + kind + '</span></li>';
      }).join('') + '</ul></div>';
    }

    html += '<div class="review-part"><h2 id="review-h">Review</h2>' +
      '<p class="lede">Solved SQL exercises come back after 3, 7, 14 and 30 days. Ones you found hard come back sooner.</p>';
    html += '<div class="review-block"><h3>Due now</h3>';
    if (due.length) {
      html += '<ul class="plain">' + due.map(function (e) { return '<li><a href="#/lab/' + e.id + '">' + esc(e.title) + '</a><span class="meta">' + esc(topicOf(e.topic).clause) + '</span></li>'; }).join('') + '</ul>' +
        '<p><button type="button" class="btn primary" id="start-review">Start review of ' + due.length + '</button></p>';
    } else {
      html += '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('idle', 36) : '') + '<span>Nothing is due. Solve exercises in the SQL lab and they will appear here when it is time.</span></p>';
    }
    html += '</div>';

    html += '<div class="review-block"><h3>Weak spots</h3>';
    if (weak.length) {
      html += '<ul class="plain">' + weak.map(function (e) {
        return '<li><a href="#/lab/' + e.id + '">' + esc(e.title) + '</a><span class="meta">' + plural(Progress.wrongCount(e.id), 'wrong check', 'wrong checks') + '</span></li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('happy', 36) : '') + '<span>No weak spots yet. An exercise appears here after three wrong checks.</span></p>';
    }
    html += '</div>';

    html += '</div>';
    html += '</section>';
    view.innerHTML = html;

    if (toReview) { var rh = document.getElementById('review-h'); if (rh) { rh.setAttribute('tabindex', '-1'); rh.scrollIntoView(); rh.focus({ preventScroll: true }); } }
    var sr = document.getElementById('start-review');
    if (sr) sr.addEventListener('click', function () { startSession('review', shuffle(due).map(function (e) { return e.id; })); });
  }

  // ---------- subject quizzes: multiple choice from the glossary ----------
  var CQ_SIZE = 8;
  var QUIZ_AREA = { SQL: 'SQL', Python: 'Python', Modelling: 'Data modelling', Pipelines: 'Data engineering', Business: 'Business logic', Statistics: 'Data analytics', BI: 'Business intelligence' };
  var cq = null; // current subject quiz

  function mentions(text, term) {
    var t = term.toLowerCase().replace(/\s*\(.*\)\s*/g, '').trim();
    return t.length >= 3 && text.toLowerCase().indexOf(t) !== -1;
  }
  // Levels change the kind of question, so a subject feels new again as you improve.
  var QLEVELS = {
    1: { name: 'Recognise', kinds: ['def'], blurb: 'Read a meaning, pick the term.' },
    2: { name: 'Apply', kinds: ['biz', 'ex'], blurb: 'Business questions and examples: which term fits?' },
    3: { name: 'Explain', kinds: ['rev', 'say', 'bug'], blurb: 'Pick the right meaning, spot the common mistake, match the interview answer.' }
  };
  var QPROMPT = {
    def: 'Which term fits this meaning?',
    biz: 'A colleague asks the question below. Which term helps you answer it?',
    ex: 'Which term does this example show?',
    rev: 'Which is the right meaning of this term?',
    say: 'Someone says this in an interview. Which term are they explaining?',
    bug: 'This is a common mistake. Which term is it about?'
  };
  function levelLabel(n) { return 'Level ' + n + ': ' + QLEVELS[n].name; }
  function areaLabel(area) { return area === 'all' ? 'All areas' : QUIZ_AREA[area]; }
  function areaTerms(area) { return window.GLOSSARY.filter(function (t) { return area === 'all' || t.group === area; }); }
  function masteredCount(area) { return areaTerms(area).filter(function (t) { return Progress.isMastered(t.id); }).length; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // What each kind of question can be made from, for one term. Text that names the term is left out, so it never gives the answer away.
  function questionMaterial(t, kind) {
    if (kind === 'def') return mentions(t.def, t.term) ? null : t.def;
    if (kind === 'biz') { var b = (t.questions || []).filter(function (q) { return !mentions(q, t.term); }); return b.length ? pick(b) : null; }
    if (kind === 'ex') return t.ex && !mentions(t.ex, t.term) ? t.ex : null;
    if (kind === 'rev') return t.term;
    if (kind === 'say') return t.say && !mentions(t.say, t.term) ? t.say : null;
    if (kind === 'bug') { var m = (t.mistakes || []).filter(function (x) { return !mentions(x, t.term); }); return m.length ? pick(m) : null; }
    return null;
  }

  // Order of preference: never seen, answered wrong last time, not mastered yet, then mastered (one comes back now and then).
  function termPriority(t) {
    var st = Progress.termStat(t.id);
    if (!st) return 0;
    if (st.last === 'w') return 1;
    if (!Progress.isMastered(t.id)) return 2;
    return 3;
  }

  function buildSubjectQuiz(area, retryIds) {
    var pool = areaTerms(area), chosen;
    if (retryIds) {
      chosen = retryIds.map(gTerm).filter(Boolean);
    } else {
      var recent = Progress.recentTerms(area);
      var fresh = pool.filter(function (t) { return recent.indexOf(t.id) === -1; });
      if (fresh.length < CQ_SIZE) fresh = pool.slice();
      var ranked = shuffle(fresh).sort(function (a, b) { return termPriority(a) - termPriority(b); });
      chosen = ranked.slice(0, CQ_SIZE);
      var mastered = ranked.filter(function (t) { return termPriority(t) === 3; });
      if (mastered.length && !chosen.some(function (t) { return termPriority(t) === 3; }) && chosen.length === CQ_SIZE) {
        chosen[chosen.length - 1] = pick(mastered); // keep what you know fresh
      }
      chosen = shuffle(chosen);
      // spares, in case a chosen term cannot make a question: the rest of the ranking, then recently used terms
      chosen = chosen.concat(ranked.filter(function (t) { return chosen.indexOf(t) === -1; }),
        shuffle(pool.filter(function (t) { return ranked.indexOf(t) === -1; })));
    }
    var qs = [], limit = retryIds ? chosen.length : CQ_SIZE;
    chosen.forEach(function (t) {
      if (qs.length >= limit) return;
      var lvl = Progress.quizLevel(t.group), kind = null, text = null;
      // try this level, then easier levels, then harder ones, so every term can still be asked
      [lvl, lvl - 1, lvl - 2, lvl + 1, lvl + 2].filter(function (L) { return L >= 1 && L <= 3; }).some(function (L) {
        shuffle(QLEVELS[L].kinds.slice()).some(function (k) { var m = questionMaterial(t, k); if (m) { kind = k; text = m; } return !!m; });
        return !!kind;
      });
      if (!kind) return;
      // wrong options: from Level 2, related terms first, because they are harder to tell apart
      var same = pool.filter(function (x) { return x !== t && x.group === t.group; });
      if (same.length < 3) same = window.GLOSSARY.filter(function (x) { return x !== t && x.group === t.group; });
      var related = lvl >= 2 ? same.filter(function (x) { return (t.rel || []).indexOf(x.id) !== -1; }) : [];
      var rest = shuffle(same.filter(function (x) { return related.indexOf(x) === -1; }));
      var others = shuffle(related).concat(rest).slice(0, 3);
      qs.push({ id: t.id, kind: kind, text: text, level: lvl, opts: shuffle([t].concat(others)).map(function (x) { return x.id; }) });
    });
    return qs;
  }

  function renderSubjectQuiz(area, retryIds) {
    teardown();
    var valid = area === 'all' || window.GLOSSARY_GROUPS.some(function (g) { return g.id === area; });
    if (!valid) { window.location.hash = '#/review'; return; }
    cq = { area: area, qs: buildSubjectQuiz(area, retryIds), i: 0, score: 0, missed: [], saved: false, retry: !!retryIds,
      level: area === 'all' ? 0 : Progress.quizLevel(area), mastered0: masteredCount(area) };
    if (!cq.retry) Progress.setRecentTerms(area, cq.qs.map(function (q) { return q.id; }));
    paintSubjectQuestion();
  }

  function paintSubjectQuestion() {
    if (cq.i >= cq.qs.length) { paintSubjectResults(); return; }
    var q = cq.qs[cq.i], n = cq.qs.length, k = cq.i + 1;
    var crumb = cq.retry ? 'Retry: ' + areaLabel(cq.area) : areaLabel(cq.area) + ' quiz' + (cq.level ? ', ' + levelLabel(cq.level) : '');
    var t0 = gTerm(q.id);
    var shown = q.kind === 'rev' ? '<p class="sq-term">' + esc(t0.term) + '</p>'
      : q.kind === 'ex' && t0.exCode ? '<pre class="t-code sq-code">' + esc(q.text) + '</pre>'
      : '<blockquote class="sq-text">' + esc(q.text) + '</blockquote>';
    view.innerHTML = '<section class="review subject-quiz"' + (cq.area === 'all' ? '' : ' data-area="' + cq.area + '"') + '>' +
      '<p class="crumb"><a href="#/review">Review</a> / ' + esc(crumb) + ', question ' + k + ' of ' + n + '</p>' +
      '<progress class="bar" max="' + n + '" value="' + (k - 1) + '" aria-label="Progress through the quiz"></progress>' +
      '<h1 class="sq-prompt" id="sq-prompt" tabindex="-1">' + QPROMPT[q.kind] + '</h1>' + shown +
      '<div class="sq-opts' + (q.kind === 'rev' ? ' sq-opts-long' : '') + '" role="group" aria-labelledby="sq-prompt">' + q.opts.map(function (id) {
        var o = gTerm(id);
        return '<button type="button" class="sq-opt" data-opt="' + id + '"' + (cq.area === 'all' ? ' data-area="' + o.group + '"' : '') + '>' + esc(q.kind === 'rev' ? o.def : o.term) + '</button>';
      }).join('') + '</div>' +
      '<div id="sq-feedback" class="sq-feedback" role="status" aria-live="polite"></div>' +
      '<p class="sq-actions"><button type="button" class="btn" id="sq-skip">Skip this one</button></p>' +
      '</section>';
    window.scrollTo(0, 0);
    var h = document.getElementById('sq-prompt'); if (h) h.focus();
    var done = false;
    function reveal(chosen) {
      if (done) return; done = true;
      var right = chosen === q.id, t = gTerm(q.id);
      Progress.termResult(q.id, right);
      if (right) cq.score += 1; else cq.missed.push({ id: q.id, skipped: chosen === null });
      Array.prototype.forEach.call(view.querySelectorAll('.sq-opt'), function (b) {
        var id = b.getAttribute('data-opt'); b.disabled = true;
        if (id === q.id) { b.classList.add('right'); b.insertAdjacentHTML('beforeend', '<span class="sq-tag"> (correct answer)</span>'); }
        else if (id === chosen) { b.classList.add('wrong'); b.insertAdjacentHTML('beforeend', '<span class="sq-tag"> (your answer)</span>'); }
      });
      var fb = document.getElementById('sq-feedback');
      fb.className = 'sq-feedback ' + (right ? 'good' : 'bad');
      fb.innerHTML = '<p><strong>' + (right ? 'Correct.' : chosen === null ? 'Skipped.' : 'Not quite.') + '</strong> ' + esc(t.term) + ': ' + esc(t.def) + '</p>' +
        (right && Progress.isMastered(t.id) ? '<p class="sq-mastered">You have now mastered ' + esc(t.term) + '.</p>' : '') +
        '<p><a href="' + termLink(t) + '">Read the full page for ' + esc(t.term) + '</a></p>' +
        '<p><button type="button" class="btn primary" id="sq-next">' + (k === n ? 'See results' : 'Next question') + '</button></p>';
      document.getElementById('sq-skip').parentNode.hidden = true;
      var nx = document.getElementById('sq-next');
      nx.addEventListener('click', function () { cq.i += 1; paintSubjectQuestion(); });
      nx.focus();
    }
    Array.prototype.forEach.call(view.querySelectorAll('.sq-opt'), function (b) {
      b.addEventListener('click', function () { reveal(b.getAttribute('data-opt')); });
    });
    document.getElementById('sq-skip').addEventListener('click', function () { reveal(null); });
  }

  // The subject that most needs work: fewest terms mastered, as a share of its size.
  function weakestSubject(except) {
    var best = null, bestShare = 2;
    window.GLOSSARY_GROUPS.forEach(function (g) {
      if (g.id === except) return;
      var share = masteredCount(g.id) / Math.max(1, termCount(g.id));
      if (share < bestShare) { bestShare = share; best = g.id; }
    });
    return best;
  }

  function paintSubjectResults() {
    var total = cq.qs.length, label = areaLabel(cq.area), area = cq.area;
    var strong = total >= CQ_SIZE && cq.score >= CQ_SIZE - 1;
    if (!cq.saved) {
      cq.saved = true;
      if (!cq.retry) Progress.addQuiz(cq.score, total, 'area:' + area);
      cq.pass = (!cq.retry && strong && area !== 'all' && cq.level < 3) ? Progress.quizPass(area) : null;
    }
    var level = area === 'all' ? 0 : Progress.quizLevel(area);
    var nTerms = areaTerms(area).length, mastered = masteredCount(area), gained = mastered - cq.mastered0;
    var unseen = areaTerms(area).filter(function (t) { return !Progress.termStat(t.id); }).length;
    var missedIds = cq.missed.map(function (m) { return m.id; });

    // one clear next step
    var step;
    if (cq.retry) {
      step = missedIds.length
        ? { kind: 'retry', label: missedIds.length === 1 ? 'Retry the one still missed' : 'Retry the ' + missedIds.length + ' still missed', why: 'Read their glossary pages first, then try again.' }
        : { kind: 'again', label: 'Back to a full ' + label.toLowerCase() + ' quiz', why: 'All fixed. Those terms will come back later to check they stuck.' };
    } else if (cq.pass && cq.pass.levelledUp) {
      step = { kind: 'again', label: 'Start a ' + levelLabel(cq.pass.level) + ' quiz', why: 'Level up! ' + QLEVELS[cq.pass.level].blurb };
    } else if (cq.score <= total / 2 && missedIds.length) {
      step = { kind: 'retry', label: missedIds.length === 1 ? 'Retry the one you missed' : 'Retry just the ' + missedIds.length + ' you missed', why: 'A short round on your misses fixes them faster than a new quiz.' };
    } else if (area !== 'all' && level === 3 && mastered === nTerms) {
      var w = weakestSubject(area);
      step = { kind: 'go', href: '#/quiz/' + w, label: 'Try ' + QUIZ_AREA[w] + ' next', why: 'You have mastered every ' + label + ' term at the top level. This subject is complete.' };
    } else {
      var why;
      if (area !== 'all' && level < 3 && strong) why = 'One more score of ' + (CQ_SIZE - 1) + ' or more moves you up to ' + levelLabel(level + 1) + '.';
      else if (area !== 'all' && level < 3) why = 'Score ' + (CQ_SIZE - 1) + ' or more twice to reach ' + levelLabel(level + 1) + '.';
      else why = unseen ? 'The next quiz starts with the ' + plural(unseen, 'term', 'terms') + ' you have not seen yet.' : 'The next quiz focuses on terms you have not mastered yet.';
      step = { kind: 'again', label: unseen ? 'Next quiz: new terms first' : 'Next quiz: terms to master', why: why };
    }

    view.innerHTML = '<section class="review"' + (area === 'all' ? '' : ' data-area="' + area + '"') + '>' +
      '<h1 tabindex="-1" id="sq-results">' + esc(cq.retry ? 'Retry results' : label + ' quiz results') + '</h1>' +
      '<p class="lede">You got ' + cq.score + ' of ' + total + ' right.' + (cq.missed.length ? '' : ' Every one, no bugs found.') + '</p>' +
      '<div class="sq-next-step"><p class="sq-why">' + esc(step.why) + '</p>' +
        (step.kind === 'go' ? '<a class="btn primary" href="' + step.href + '">' + esc(step.label) + '</a>'
          : '<button type="button" class="btn primary" id="sq-step">' + esc(step.label) + '</button>') + '</div>' +
      '<div class="sq-standing"><h2>Where you are</h2>' +
        masteryBar(area) +
        (gained > 0 ? '<p class="meta-line">' + plural(gained, 'term', 'terms') + ' newly mastered in this quiz.</p>' : '') +
        (area !== 'all' ? '<p class="meta-line">' + esc(levelLabel(level)) + (level < 3 ? ', ' + plural(Progress.quizPasses(area), 'strong score', 'strong scores') + ' of 2 towards the next level' : ', the top level') + '.</p>' : '') +
      '</div>' +
      (cq.missed.length ? '<h2>Worth another look</h2><ul class="plain results">' + cq.missed.map(function (m) {
        var t = gTerm(m.id);
        return '<li><a href="' + termLink(t) + '">' + esc(t.term) + '</a><span class="meta">' + (m.skipped ? 'Skipped' : 'Missed') + '</span></li>';
      }).join('') + '</ul>' : '') +
      '<p class="intro-actions"><a class="btn" href="#/review">Back to review</a></p></section>';
    window.scrollTo(0, 0);
    var hh = document.getElementById('sq-results'); if (hh) hh.focus();
    if (window.Byte) {
      var share = total ? cq.score / total : 0;
      if (cq.pass && cq.pass.levelledUp) byteLater(function () { Byte.say('happy', 'Level up! The questions change now, so it will feel new again.'); }, 500);
      else if (share >= 0.75) byteLater(function () { Byte.say('happy', cq.score === total ? 'A perfect run! Not one bug got past you.' : 'Strong work. ' + cq.score + ' of ' + total + '. The rest are worth a glance.'); }, 500);
      else byteLater(function () { Byte.say('idle', 'Every miss is a lesson. Open those pages, then come back for another go.'); }, 500);
    }
    var btn = document.getElementById('sq-step');
    if (btn) btn.addEventListener('click', function () {
      if (step.kind === 'retry') renderSubjectQuiz(area, missedIds);
      else renderSubjectQuiz(area);
    });
  }

  // read-only peek for the automated tests
  window.__quizState = function () { return cq; };
  window.__quizJump = function (i) { cq.i = i; paintSubjectQuestion(); };

  // "9 of 16 terms mastered" with a bar
  function masteryBar(area) {
    var n = areaTerms(area).length, m = masteredCount(area);
    return '<div class="mastery"><span class="mastery-text">' + m + ' of ' + plural(n, 'term', 'terms') + ' mastered</span>' +
      '<span class="mastery-track" aria-hidden="true"><span class="mastery-fill" style="width:' + Math.round(100 * m / Math.max(1, n)) + '%"></span></span></div>';
  }

  function sessionLabel() {
    if (session.kind !== 'quiz') return 'Review';
    return session.topic ? topicOf(session.topic).clause + ' quiz' : 'Mixed quiz';
  }

  function renderSession() {
    if (!session) { window.location.hash = '#/review'; return; }
    teardown();
    if (session.i >= session.ids.length) { renderSessionResults(); return; }
    var ex = byId(window.EXERCISES, session.ids[session.i]);
    var label = sessionLabel();
    var n = session.ids.length, k = session.i + 1;
    window.scrollTo(0, 0);
    workspace(ex, {
      mode: 'session',
      isLast: k === n,
      crumb: '<p class="crumb"><a href="#/review">Review</a> / ' + label + ', question ' + k + ' of ' + n + '</p>' +
             '<progress class="bar" max="' + n + '" value="' + (k - 1) + '" aria-label="Progress through the ' + label.toLowerCase() + '"></progress>',
      onResult: function (r) { session.results.push({ id: ex.id, clean: r.clean, skipped: r.skipped }); },
      onNext: function () { session.i += 1; renderSession(); }
    });
  }

  function renderSessionResults() {
    var total = session.ids.length;
    var solved = session.results.filter(function (r) { return !r.skipped; }).length;
    var clean = session.results.filter(function (r) { return r.clean; }).length;
    if (session.kind === 'quiz' && !session.saved) { Progress.addQuiz(solved, total, session.topic); session.saved = true; }
    var title = session.kind === 'quiz' ? sessionLabel() + ' results' : 'Review complete';
    var html = '<section class="review"><h1>' + title + '</h1>' +
      '<p class="lede">You solved ' + solved + ' of ' + total + ', and ' + clean + ' of them without a wrong check.' +
      (session.kind === 'review' ? ' Your review dates have been updated.' : '') + '</p><ul class="plain results">' +
      session.results.map(function (r) {
        var e = byId(window.EXERCISES, r.id);
        var tag = r.skipped ? 'Skipped' : (r.clean ? 'Right first time' : 'Solved after a wrong check');
        return '<li><a href="#/lab/' + e.id + '">' + esc(e.title) + '</a><span class="meta">' + tag + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="intro-actions"><a class="btn primary" href="#/review">Back to review</a>' +
      '<a class="btn" href="#/home">Back to the path</a></p></section>';
    view.innerHTML = html;
    window.scrollTo(0, 0);
    if (window.Byte) {
      var share = total ? solved / total : 0;
      if (share >= 0.75) byteLater(function () { Byte.say('happy', clean === total ? 'A perfect run! Not one bug got past you.' : 'Strong work. ' + solved + ' of ' + total + ' solved. The rest will come back for another go.'); }, 500);
      else byteLater(function () { Byte.say('idle', 'Every skipped one is a lesson waiting. They will come back sooner, and you will be ready.'); }, 500);
    }
  }

  // ---------- view: glossary ----------
  var glossaryState = { q: '', group: 'All', mode: 'index', card: 0, revealed: false, open: {} }; // open: areas the visitor has expanded
  function gGroup(id) { return byId(window.GLOSSARY_GROUPS, id); }
  function gTerm(id) { return byId(window.GLOSSARY, id); }
  function byTerm(a, b) { return a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1; }
  function termLink(t) { return '#/glossary/term/' + t.id; }
  function glossaryItems() {
    var q = glossaryState.q.trim().toLowerCase();
    return window.GLOSSARY.filter(function (g) {
      return (glossaryState.group === 'All' || g.group === glossaryState.group) &&
        (!q || [g.term, g.def, g.deep, (g.questions || []).join(' ')].join(' ').toLowerCase().indexOf(q) !== -1);
    });
  }

  // ---------- view: glossary index (search, areas, three ways to browse) ----------
  function renderGlossary(group) {
    teardown();
    var ids = window.GLOSSARY_GROUPS.map(function (g) { return g.id; });
    if (group && ids.indexOf(group) !== -1 && group !== glossaryState.group) {
      glossaryState.group = group; glossaryState.card = 0; glossaryState.revealed = false;
    }
    var modes = [['index', 'Index'], ['questions', 'Business questions'], ['cards', 'Flashcards']];
    var qCount = window.GLOSSARY.reduce(function (n, t) { return n + (t.questions || []).length; }, 0);
    view.innerHTML =
      '<section class="glossary">' +
      '<h1>Glossary</h1>' +
      '<p class="lede">' + window.GLOSSARY.length + ' data terms in plain English, with examples and a line to say in an interview.</p>' +
      '<div class="g-controls">' +
        '<label class="sr" for="g-search">Search terms</label>' +
        '<input id="g-search" type="search" placeholder="Search, for example churn or join" value="' + esc(glossaryState.q) + '">' +
        '<div class="g-modes" role="group" aria-label="How to browse">' + modes.map(function (m) {
          return '<button type="button" class="seg' + (glossaryState.mode === m[0] ? ' on' : '') + '" id="g-mode-' + m[0] + '" data-mode="' + m[0] + '" aria-pressed="' + (glossaryState.mode === m[0]) + '">' + m[1] + (m[0] === 'questions' ? ' <span class="seg-n">' + qCount + '</span>' : '') + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="g-groups" role="group" aria-label="Filter by area">' + ['All'].concat(ids).map(function (g) {
        var n = g === 'All' ? window.GLOSSARY.length : window.GLOSSARY.filter(function (t) { return t.group === g; }).length;
        var label = g === 'All' ? 'All' : gGroup(g).name;
        return '<button type="button" class="pill' + (g === glossaryState.group ? ' on' : '') + '"' + (g === 'All' ? '' : ' data-area="' + g + '"') + ' data-group="' + g + '" aria-pressed="' + (g === glossaryState.group) + '">' + (g === 'All' ? '' : '<span class="dot" aria-hidden="true"></span>') + esc(label) + ' <span class="pill-n">' + n + '</span></button>';
      }).join('') + '</div>' +
      '<p id="g-count" class="g-count" role="status"></p>' +
      '<div id="g-body"></div></section>';

    document.getElementById('g-search').addEventListener('input', function (e) {
      glossaryState.q = e.target.value; glossaryState.card = 0; glossaryState.revealed = false; paintGlossary();
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-group]'), function (b) {
      b.addEventListener('click', function () {
        glossaryState.group = b.getAttribute('data-group'); glossaryState.card = 0; glossaryState.revealed = false; renderGlossary();
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-mode]'), function (b) {
      b.addEventListener('click', function () {
        glossaryState.mode = b.getAttribute('data-mode'); glossaryState.card = 0; glossaryState.revealed = false; renderGlossary();
      });
    });
    paintGlossary();
  }

  // An area heading is a button that opens or closes its terms. Areas start closed, so the page stays short.
  // They open on their own when a search is typed, or when only one area is showing.
  function areaIsOpen(id, onlyOne) { return onlyOne || !!glossaryState.q.trim() || !!glossaryState.open[id]; }
  function areaSection(g, onlyOne, tally, inner) {
    var open = areaIsOpen(g.id, onlyOne);
    return '<section class="g-area" data-area="' + g.id + '">' +
      '<h2 class="g-area-head"><button type="button" class="g-toggle" data-toggle="' + g.id + '" aria-expanded="' + open + '" aria-controls="gb-' + g.id + '" id="ga-' + g.id + '">' +
        '<span class="g-chev" aria-hidden="true"></span><span class="g-name">' + esc(g.name) + '</span><span class="tally">' + esc(tally) + '</span></button></h2>' +
      '<div class="g-area-body" id="gb-' + g.id + '"' + (open ? '' : ' hidden') + '>' + inner + '</div></section>';
  }
  function wireAreaToggles(onlyOne) {
    var heads = view.querySelectorAll('[data-toggle]');
    Array.prototype.forEach.call(heads, function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-toggle'), open = b.getAttribute('aria-expanded') !== 'true';
        glossaryState.open[id] = open;
        b.setAttribute('aria-expanded', String(open));
        document.getElementById('gb-' + id).hidden = !open;
        syncOpenAll();
      });
    });
    var all = document.getElementById('g-open-all');
    if (all) all.addEventListener('click', function () {
      var openNow = all.getAttribute('data-state') !== 'open';
      Array.prototype.forEach.call(heads, function (b) {
        var id = b.getAttribute('data-toggle');
        glossaryState.open[id] = openNow; b.setAttribute('aria-expanded', String(openNow));
        document.getElementById('gb-' + id).hidden = !openNow;
      });
      syncOpenAll();
    });
    function syncOpenAll() {
      if (!all) return;
      var anyClosed = Array.prototype.some.call(heads, function (b) { return b.getAttribute('aria-expanded') !== 'true'; });
      all.textContent = anyClosed ? 'Open all areas' : 'Close all areas';
      all.setAttribute('data-state', anyClosed ? 'closed' : 'open');
    }
    syncOpenAll();
  }

  function paintGlossary() {
    var body = document.getElementById('g-body'), count = document.getElementById('g-count');
    var items = glossaryItems().sort(byTerm);
    var q = glossaryState.q.trim();
    if (!items.length) { count.textContent = ''; body.innerHTML = '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('search', 36) : '') + '<span>I searched every table and found nothing. Try a shorter search or choose All areas.</span></p>'; return; }
    var groupsShown = window.GLOSSARY_GROUPS.filter(function (g) { return items.some(function (t) { return t.group === g.id; }); });

    if (glossaryState.mode === 'index') {
      count.textContent = q ? plural(items.length, 'term matches', 'terms match') + ' "' + q + '"' : '';
      var one = groupsShown.length === 1;
      body.innerHTML = (one || q ? '' : '<p class="g-open-all-row"><button type="button" class="linkish" id="g-open-all">Open all areas</button></p>') +
        groupsShown.map(function (g) {
          var list = items.filter(function (t) { return t.group === g.id; });
          return areaSection(g, one, plural(list.length, 'term', 'terms'),
            '<p class="g-blurb">' + esc(g.blurb) + '</p>' +
            '<ul class="g-index">' + list.map(function (t) {
              return '<li class="term"><a href="' + termLink(t) + '"><span class="g-term">' + esc(t.term) + '</span>' +
                '<span class="g-def">' + esc(t.def) + '</span><span class="area sr">' + esc(t.group) + '</span></a></li>';
            }).join('') + '</ul>');
        }).join('');
      wireAreaToggles(one);
      return;
    }

    if (glossaryState.mode === 'questions') {
      var withQ = items.filter(function (t) { return t.questions && t.questions.length; });
      var total = withQ.reduce(function (n, t) { return n + t.questions.length; }, 0);
      count.textContent = plural(total, 'question', 'questions') + ' the business asks, each linked to the term that helps answer it.';
      var qGroups = groupsShown.filter(function (g) { return withQ.some(function (t) { return t.group === g.id; }); });
      var oneQ = qGroups.length === 1;
      body.innerHTML = (oneQ || q ? '' : '<p class="g-open-all-row"><button type="button" class="linkish" id="g-open-all">Open all areas</button></p>') +
        qGroups.map(function (g) {
          var rows = [];
          withQ.filter(function (t) { return t.group === g.id; }).forEach(function (t) {
            t.questions.forEach(function (qq) { rows.push('<li><span class="bq-q">' + esc(qq) + '</span><a class="bq-t" href="' + termLink(t) + '">' + esc(t.term) + '</a></li>'); });
          });
          return areaSection(g, oneQ, plural(rows.length, 'question', 'questions'), '<ul class="bq-list">' + rows.join('') + '</ul>');
        }).join('');
      wireAreaToggles(oneQ);
      return;
    }

    // flashcards
    count.textContent = '';
    var i = glossaryState.card % items.length, g = items[i];
    body.innerHTML = '<div class="card" data-area="' + g.group + '">' +
      '<p class="card-count">Card ' + (i + 1) + ' of ' + items.length + ' <span class="area">' + esc(gGroup(g.group).name) + '</span></p>' +
      '<h2>' + esc(g.term) + '</h2>' +
      (glossaryState.revealed
        ? '<p>' + esc(g.def) + '</p><p class="say"><span class="say-label">Say it:</span> ' + esc(g.say) + '</p>' +
          '<p class="card-more"><a href="' + termLink(g) + '">Read the full page for ' + esc(g.term) + '</a></p>'
        : '<p class="card-ask">Explain this out loud in one or two sentences, then reveal the answer.</p>') +
      '<div class="actions">' +
        (glossaryState.revealed ? '' : '<button type="button" class="btn primary" id="card-reveal">Reveal answer</button>') +
        '<button type="button" class="btn" id="card-next">Next card</button>' +
      '</div></div>';
    var reveal = document.getElementById('card-reveal');
    if (reveal) reveal.addEventListener('click', function () { glossaryState.revealed = true; paintGlossary(); });
    document.getElementById('card-next').addEventListener('click', function () {
      glossaryState.card = (i + 1) % items.length; glossaryState.revealed = false; paintGlossary();
    });
  }

  // ---------- view: one glossary term ----------
  // the side-by-side table on the "SQL dialect" term: one closed section per topic, so the page stays short
  function dialectCompare() {
    var rows = window.DIALECT_ROWS || [], groups = [];
    rows.forEach(function (r) { if (groups.indexOf(r.group) === -1) groups.push(r.group); });
    return '<section class="t-sec dialect-compare"><h2>How the databases differ</h2>' +
      '<p>Open a topic to compare. SQLite is the one that runs on this site.</p>' +
      groups.map(function (g) {
        return '<details class="dc-group"><summary>' + esc(g) + '</summary>' +
          rows.filter(function (r) { return r.group === g; }).map(function (r) {
            return '<div class="dc-row"><h3>' + esc(r.title) + '</h3>' +
              '<table class="dc-table"><caption class="sr">' + esc(r.title) + ' in each database</caption>' +
              '<thead><tr><th scope="col">Database</th><th scope="col">How it is written</th></tr></thead><tbody>' +
              window.DIALECTS.map(function (d) {
                return '<tr><th scope="row">' + esc(d.name) + '</th><td><pre>' + esc(r[d.id]) + '</pre></td></tr>';
              }).join('') + '</tbody></table>' +
              '<p class="dc-note">' + esc(r.note) + '</p></div>';
          }).join('') + '</details>';
      }).join('') + '</section>';
  }

  // A small picture under a term's example, from js/glossary-visuals.js.
  function termVisual(id) {
    var v = window.GLOSSARY_VISUALS && window.GLOSSARY_VISUALS[id];
    return v ? '<figure class="t-vis">' + v() + '</figure>' : '';
  }

  function renderTerm(id) {
    teardown();
    var t = gTerm(id);
    if (!t) {
      view.innerHTML = '<section class="glossary"><h1>Term not found</h1><p class="lede with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('search', 48) : '') + '<span>That term is not in the glossary yet. <a href="#/glossary">Browse all terms</a>.</span></p></section>';
      return;
    }
    var grp = gGroup(t.group);
    var siblings = window.GLOSSARY.filter(function (x) { return x.group === t.group; }).sort(byTerm);
    var k = siblings.indexOf(t), prev = siblings[k - 1], next = siblings[k + 1];
    var related = (t.rel || []).map(gTerm).filter(Boolean);
    var usedBy = window.GLOSSARY.filter(function (x) { return x !== t && (x.rel || []).indexOf(t.id) !== -1 && (t.rel || []).indexOf(x.id) === -1; });
    var list = function (arr) { return '<ul class="t-list">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };

    view.innerHTML = '<article class="term-page" data-area="' + t.group + '">' +
      '<p class="crumb"><a href="#/glossary">Glossary</a> / <a href="#/glossary/' + t.group + '">' + esc(grp.name) + '</a></p>' +
      '<h1>' + esc(t.term) + '</h1>' +
      '<p class="lede t-def">' + esc(t.def) + '</p>' +
      '<div class="t-grid">' +
        '<div class="t-main">' +
          '<section class="t-sec"><h2>Understand it</h2><p>' + esc(t.deep) + '</p></section>' +
          (t.ex ? '<section class="t-sec"><h2>Example</h2>' + (t.exCode ? '<pre class="t-code" tabindex="0" aria-label="Example code">' + esc(t.ex) + '</pre>' : '<p class="t-ex">' + esc(t.ex).replace(/\n/g, '<br>') + '</p>') + termVisual(t.id) + '</section>' : '') +
          (t.compare ? dialectCompare() : '') +
          (t.mistakes ? '<section class="t-sec"><h2 class="with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('search', 30) : '') + '<span>Bugs Byte often finds</span></h2>' + list(t.mistakes) + '</section>' : '') +
        '</div>' +
        '<aside class="t-side" aria-label="Practise and connect">' +
          '<section class="t-box t-say"><h2>Say it in an interview</h2><p>' + esc(t.say) + '</p></section>' +
          (t.questions ? '<section class="t-box"><h2>Business questions it helps answer</h2>' + list(t.questions) + '</section>' : '') +
          (related.length || usedBy.length ? '<section class="t-box"><h2>Related terms</h2><p class="t-rel">' +
            related.concat(usedBy.slice(0, 4)).map(function (r) { return '<a href="' + termLink(r) + '">' + esc(r.term) + '</a>'; }).join('') + '</p></section>' : '') +
        '</aside>' +
      '</div>' +
      '<nav class="pager" aria-label="Terms in ' + esc(grp.name) + '">' +
        (prev ? '<a href="' + termLink(prev) + '">Previous: ' + esc(prev.term) + '</a>' : '<span></span>') +
        (next ? '<a href="' + termLink(next) + '">Next: ' + esc(next.term) + '</a>' : '<a href="#/glossary/' + t.group + '">All ' + esc(grp.name) + ' terms</a>') +
      '</nav></article>';
  }

  // ---------- view: Projects hub ----------
  // data/projects.js holds one short entry per project. The full write-up is projects/<id>/PROJECT.md,
  // which the site fetches and shows with js/markdown.js. Each "## 1. ..." heading in it is a step.
  var SITE_URL_PUBLIC = 'https://thejoinery.dev/'; // links to this address inside a PROJECT.md stay in the site
  var SITE_URL_OLD = 'https://danikabuilds.github.io/the-joinery/'; // the address before November 2026, still found in older downloads

  function renderProjects() {
    teardown();
    var list = window.PROJECTS || [], soon = window.PROJECTS_COMING || [];
    view.innerHTML = '<section class="projects"><h1>Projects</h1>' +
      '<p class="lede">End-to-end projects with a business brief, data to download, free tools and model answers.</p>' +
      '<div class="pj-cards">' + list.filter(function (p) { return p.track !== 'Python'; }).map(function (p) {
        var done = Progress.projectStepsDone(p.id), n = p.steps.length;
        return '<a class="pj-card" href="#/projects/' + p.id + '">' +
          '<h2>' + esc(p.fullTitle) + '</h2>' +
          '<p class="pj-card-tag">' + esc(p.blurb) + '</p>' +
          '<p class="pj-card-meta">' + esc(p.time) + '.</p>' +
          '<p class="pj-card-progress">' + (done ? done + ' of ' + n + ' steps done' : n + ' steps') + '</p>' +
          '<span class="mastery-track" aria-hidden="true"><span class="mastery-fill" style="width:' + Math.round(100 * done / n) + '%"></span></span></a>';
      }).join('') +
      soon.map(function (p) {
        return '<div class="pj-card pj-soon"><h2>' + esc(p.level + ' ' + p.track + ': ' + p.title) + '</h2>' +
          '<p class="pj-card-tag">' + esc(p.blurb) + '</p><p class="pj-card-progress">Coming next</p></div>';
      }).join('') + '</div>' + pythonPractice(list) + '</section>';
  }

  // Short Python guides, listed under the projects. More are added by giving a project track "Python".
  function pythonPractice(list) {
    var py = list.filter(function (p) { return p.track === 'Python'; });
    if (!py.length) return '';
    return '<section class="py-practice" aria-labelledby="py-h"><h2 id="py-h">Python practice</h2>' +
      '<p class="lede">Short, hands-on guides that run in Google Colab, with nothing to install. Good before or alongside the projects.</p>' +
      '<ul class="py-list">' + py.map(function (p) {
        var done = Progress.projectStepsDone(p.id), n = p.steps.length;
        return '<li><a class="py-item" href="#/projects/' + p.id + '"><b>' + esc(p.fullTitle) + '</b>' +
          '<span class="py-meta">' + esc(p.time) + (done ? ', ' + done + ' of ' + n + ' done' : ', ' + n + ' steps') + '</span>' +
          '<p class="py-blurb">' + esc(p.blurb) + '</p></a></li>';
      }).join('') + '</ul></section>';
  }

  var mdCache = {};
  function renderProject(id, stepNo) {
    teardown();
    var p = byId(window.PROJECTS || [], id);
    if (!p) { window.location.hash = '#/projects'; return; }
    view.innerHTML = '<article class="project"><p class="crumb"><a href="#/projects">Projects</a> / ' + esc(p.title) + '</p><p class="empty">Loading the project…</p></article>';
    var at = window.location.hash;
    var got = mdCache[p.md] ? Promise.resolve(mdCache[p.md]) :
      fetch(p.md).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t) { mdCache[p.md] = t; return t; });
    got.then(function (md) {
      if (window.location.hash !== at) return; // the visitor moved on
      paintProject(p, md, stepNo);
    }, function () {
      view.querySelector('.empty').innerHTML = 'The project could not be loaded. If you opened the site from a file, open it with Live Server instead. Otherwise refresh the page.';
    });
  }

  function paintProject(p, md, stepNo) {
    var base = p.md.replace(/[^/]+$/, '');
    var html = Markdown.render(md, { base: base, site: [SITE_URL_PUBLIC, SITE_URL_OLD] });
    var art = document.createElement('article');
    art.className = 'project';
    art.innerHTML = '<p class="crumb"><a href="#/projects">Projects</a> / ' + esc(p.title) + '</p>' + html;
    // a warm-up block beside the brief, for projects that have one (project 1 points to the Python basics guide)
    var warm = p.warmup && (window.PROJECTS || []).filter(function (x) { return x.id === p.warmup; })[0];
    var brief = art.querySelector('.pj-brief');
    if (warm && brief) {
      var wDone = Progress.projectStepsDone(warm.id), wN = warm.steps.length;
      var row = document.createElement('div');
      row.className = 'pj-brief-row';
      brief.parentNode.insertBefore(row, brief);
      row.appendChild(brief);
      var card = document.createElement('a');
      card.className = 'pj-warmup';
      card.href = '#/projects/' + warm.id;
      card.innerHTML = '<p class="pj-box-label">New to Python?</p>' +
        '<p class="pj-warmup-title">' + esc(warm.fullTitle) + '</p>' +
        '<p class="pj-warmup-text">' + wN + ' short steps, ' + esc(warm.time.replace(/^About /, 'about ')) + '. Runs in Google Colab, nothing to install or download.</p>' +
        '<span class="pj-warmup-go">' + (wDone >= wN ? 'Done. Read it again' : wDone ? 'Carry on (' + wDone + ' of ' + wN + ' done)' : 'Start the warm-up') + ' →</span>';
      row.appendChild(card);
    }
    // group each "## N. Title" heading and what follows it into a step with a tick box
    var steps = [], cur = null;
    Array.prototype.slice.call(art.children).forEach(function (el) {
      var m = el.tagName === 'H2' && /^(\d+)\.\s/.exec(el.textContent);
      if (m) {
        cur = document.createElement('section');
        cur.className = 'pj-step'; cur.id = 'step-' + m[1];
        cur.setAttribute('aria-labelledby', 'h-step-' + m[1]);
        el.id = 'h-step-' + m[1];
        el.innerHTML = '<span class="pj-num">' + m[1] + '</span>' + esc(el.textContent.replace(/^\d+\.\s*/, ''));
        art.insertBefore(cur, el); cur.appendChild(el); steps.push(cur);
      } else if (cur && el.tagName === 'HR') { cur = null; }
      else if (cur) cur.appendChild(el);
    });
    var n = steps.length;
    var progress = document.createElement('div');
    progress.className = 'pj-progress';
    progress.innerHTML = '<span id="pj-count"></span><span class="mastery-track" aria-hidden="true"><span class="mastery-fill" id="pj-bar"></span></span>';
    if (steps[0]) art.insertBefore(progress, steps[0]);
    steps.forEach(function (sec) {
      var key = sec.id; // step-1, step-2 ...
      var label = document.createElement('label');
      label.className = 'pj-done';
      label.innerHTML = '<input type="checkbox" data-step="' + key + '"' + (Progress.projectStep(p.id, key) ? ' checked' : '') + '> I have done this step';
      sec.appendChild(label);
    });
    var first = art.querySelector('h1'); if (first) first.id = 'pj-title';
    // lists made of download links (the .zip files) become download cards
    Array.prototype.forEach.call(art.querySelectorAll('ul.pj-list'), function (ul) {
      var items = ul.querySelectorAll('li');
      if (items.length && Array.prototype.every.call(items, function (li) { var a = li.querySelector('a'); return a && /\.zip$/.test(a.getAttribute('href')); })) ul.classList.add('pj-dl-list');
    });
    view.innerHTML = ''; view.appendChild(art);

    function sync() {
      var done = Progress.projectStepsDone(p.id);
      document.getElementById('pj-count').textContent = done + ' of ' + n + ' steps done';
      document.getElementById('pj-bar').style.width = Math.round(100 * done / Math.max(1, n)) + '%';
    }
    Array.prototype.forEach.call(view.querySelectorAll('[data-step]'), function (cb) {
      cb.addEventListener('change', function () {
        Progress.setProjectStep(p.id, cb.getAttribute('data-step'), cb.checked); sync();
        if (cb.checked && window.Byte && Progress.projectStepsDone(p.id) === n) Byte.say('happy', 'Project complete! Put it on GitHub and tell the world.');
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll('.pj-copy'), function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.parentNode.nextElementSibling.textContent;
        function done() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
      });
    });
    sync();
    if (stepNo) {
      var target = document.getElementById('step-' + stepNo);
      if (target) { target.scrollIntoView({ block: 'start' }); var hd = target.querySelector('h2'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }
    }
  }

  // ---------- view: settings ----------
  function renderSettings() {
    teardown();
    var s = getSettings();
    var radios = function (name, opts, current) {
      return opts.map(function (o) {
        return '<label class="choice"><input type="radio" name="' + name + '" value="' + o[0] + '"' + (String(o[0]) === String(current) ? ' checked' : '') + '> ' + esc(o[1]) + '</label>';
      }).join('');
    };
    view.innerHTML = '<section class="settings"><h1>Settings</h1>' +
      '<p class="lede">Changes save straight away, in this browser only.</p>' +
      '<fieldset><legend>Appearance</legend>' +
        radios('theme', [['device', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']], s.theme) + '</fieldset>' +
      '<fieldset><legend>Text size</legend>' + radios('text', TEXT_SIZES, s.text) + '</fieldset>' +
      '<fieldset><legend>Speaking timer</legend><p class="hint-text">How long the "Explain it out loud" timer runs.</p>' +
        radios('timer', TIMERS.map(function (t) { return [t, t + ' seconds']; }), s.timer) + '</fieldset>' +
      '<fieldset><legend>Byte the beetle</legend><p class="hint-text">Byte pops up with short tips, clues and cheers.</p>' +
        radios('byte', [['on', 'Show Byte'], ['off', 'Hide Byte']], s.byte ? 'on' : 'off') + '</fieldset>' +
      '<p id="settings-msg" class="progress-msg" role="status"></p>' +
      '<h2 class="section-h">Keyboard shortcuts</h2>' +
      '<dl class="shortcuts">' +
        '<dt><kbd>Ctrl</kbd> + <kbd>Enter</kbd></dt><dd>Run the query (Cmd + Enter on a Mac)</dd>' +
        '<dt><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd></dt><dd>Check your answer</dd>' +
        '<dt><kbd>Esc</kbd></dt><dd>Leave the editor, so <kbd>Tab</kbd> moves to the buttons again</dd>' +
                '<dt><kbd>Tab</kbd></dt><dd>Move to the next link or button. Everything on the site works without a mouse.</dd>' +
      '</dl></section>';
    var msg = document.getElementById('settings-msg');
    Array.prototype.forEach.call(view.querySelectorAll('input[type="radio"]'), function (r) {
      r.addEventListener('change', function () {
        var cur = getSettings();
        if (r.name === 'theme') { cur.theme = r.value; saveSettings(cur); applyTheme(); }
        else if (r.name === 'byte') { cur.byte = r.value === 'on'; saveSettings(cur); if (cur.byte && window.Byte) Byte.say('happy', 'I\'m back! I\'ll keep it short.'); else if (window.Byte) Byte.off(); }
        else { cur[r.name] = r.name === 'timer' ? Number(r.value) : r.value; saveSettings(cur); }
        msg.textContent = 'Saved.';
      });
    });
    var h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); }
  }

  // ---------- light and dark: follows the device until the visitor picks one ----------
  var themeBtn = document.getElementById('theme-btn');
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function currentTheme() {
    var t = getSettings().theme;
    if (t === 'light' || t === 'dark') return t;
    return darkQuery && !darkQuery.matches ? 'light' : 'dark';
  }
  function applyTheme() {
    var t = currentTheme();
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      var next = t === 'dark' ? 'light' : 'dark';
      themeBtn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
      themeBtn.title = 'Switch to ' + next + ' mode';
      themeBtn.setAttribute('data-mode', t);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#05080B' : '#F3F6F8');
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = getSettings();
    cur.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    saveSettings(cur); applyTheme();
    var radio = view.querySelector('input[name="theme"][value="' + cur.theme + '"]'); if (radio) radio.checked = true;
  });
  if (darkQuery) {
    var onDevice = function () { if (getSettings().theme === 'device') applyTheme(); };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onDevice); else if (darkQuery.addListener) darkQuery.addListener(onDevice);
  }
  applyTheme();

  // ---------- phone menu: the header links fold behind one button on small screens ----------
  var menuBtn = document.getElementById('menu-btn'), topMenu = document.getElementById('top-menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    topMenu.classList.toggle('open', open);
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });

  // ---------- view: My progress (a dashboard of the learner's own numbers) ----------
  function isoDay(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayFrom(str) { var p = str.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function niceDay(str) { var d = dayFrom(str); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  // The last 12 weeks, shaded by how much was done each day. Shown on the home page and the progress page.
  function activityPanel() {
    var act = Progress.activity(), todayStr = Progress.today();
    var end = dayFrom(todayStr), start = new Date(end); start.setDate(start.getDate() - 7 * 12 + 1);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to a Monday
    var cells = [], d = new Date(start), weeks = 0, activeDays = 0;
    while (d <= end) {
      var key = isoDay(d), n = act[key] || 0, lvl = n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3;
      if (n) activeDays += 1;
      cells.push('<span class="cal-cell lvl-' + lvl + (key === todayStr ? ' is-today' : '') + '" tabindex="0" data-tip="' + esc(niceDay(key) + ': ' + (n ? plural(n, 'thing practised', 'things practised') : 'no practice')) + '"></span>');
      if (d.getDay() === 0) weeks += 1;
      d.setDate(d.getDate() + 1);
    }
    return '<section class="panel" aria-labelledby="p-cal"><h3 id="p-cal">Activity</h3><p class="panel-sub">Last 12 weeks: ' + plural(activeDays, 'day', 'days') + ' with practice.</p>' +
      '<div class="cal" role="img" aria-label="Calendar of the last 12 weeks. ' + activeDays + ' days with practice.">' +
        '<div class="cal-days" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>' +
        '<div class="cal-grid">' + cells.join('') + '</div></div>' +
      '<p class="cal-key" aria-hidden="true">Less <span class="cal-cell lvl-0"></span><span class="cal-cell lvl-1"></span><span class="cal-cell lvl-2"></span><span class="cal-cell lvl-3"></span> More</p></section>';

  }

  // The full dashboard, on its own page at #/progress.
  function progressBody() {
    var ex = window.EXERCISES, total = ex.length;
    var solved = ex.filter(function (e) { return Progress.isDone(e.id); });
    var firstTry = solved.filter(function (e) { return Progress.wrongCount(e.id) === 0; });
    var spoken = solved.filter(function (e) { return Progress.isAloud(e.id); });
    var act = Progress.activity(), todayStr = Progress.today(), monthKey = todayStr.slice(0, 7);
    var daysThisMonth = Object.keys(act).filter(function (d) { return d.slice(0, 7) === monthKey; }).length;
    var hist = Progress.quizHistory().filter(function (h) { return h.topic && h.topic.indexOf('area:') === 0; }).reverse(); // subject quizzes, oldest first

    function tile(label, value, of, note) {
      return '<div class="kpi"><p class="kpi-label">' + label + '</p><p class="kpi-value">' + value + (of !== null ? '<span class="kpi-of"> of ' + of + '</span>' : '') + '</p><p class="kpi-note">' + note + '</p></div>';
    }
    var html = '<div class="kpis">' +
        tile('Exercises solved', solved.length, total, total - solved.length ? (total - solved.length) + ' still to try' : 'Every exercise solved') +
        tile('Right first time', firstTry.length, solved.length || 0, solved.length ? Math.round(firstTry.length / solved.length * 100) + '% of what you solved' : 'Solve one to start') +
        tile('Explained out loud', spoken.length, solved.length || 0, solved.length ? 'Solved exercises you have said aloud' : 'Unlocks after a solve') +
        tile('Days practised', daysThisMonth, null, 'in ' + MONTHS[Number(monthKey.slice(5)) - 1]) +
      '</div>';

    // strength by topic: share of each topic solved, and how many first time
    var rows = window.TOPICS.map(function (t) {
      var list = exercisesIn(t.id), d = list.filter(function (e) { return Progress.isDone(e.id); });
      var clean = d.filter(function (e) { return Progress.wrongCount(e.id) === 0; }).length;
      return { t: t, n: list.length, d: d.length, clean: clean };
    });
    html += '<div class="dash-grid">' +
      '<section class="panel" aria-labelledby="p-topic"><h3 id="p-topic">Strength by topic</h3><p class="panel-sub">Share of each topic solved</p>' +
      '<ul class="bars">' + rows.map(function (r) {
        var pct = r.n ? Math.round(r.d / r.n * 100) : 0;
        var tip = r.t.name + ': ' + r.d + ' of ' + r.n + ' solved, ' + r.clean + ' right first time';
        return '<li class="bar-row" data-topic="' + r.t.id + '" tabindex="0" data-tip="' + esc(tip) + '"><span class="bar-name kw">' + esc(r.t.clause) + '</span>' +
          '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="bar-val">' + r.d + ' of ' + r.n + '</span></li>';
      }).join('') + '</ul>' +
      '<details class="as-table"><summary>Show as a table</summary><table><thead><tr><th>Topic</th><th>Solved</th><th>Right first time</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + esc(r.t.name) + '</td><td>' + r.d + ' of ' + r.n + '</td><td>' + r.clean + '</td></tr>'; }).join('') +
      '</tbody></table></details></section>';

    // quiz scores: a line of the last 10 subject quizzes
    html += '<section class="panel" aria-labelledby="p-quiz"><h3 id="p-quiz">Subject quiz scores</h3><p class="panel-sub">Questions correct' + (hist.length ? ', last ' + plural(hist.length, 'quiz', 'quizzes') : '') + '</p>';
    if (hist.length) {
      var W = 420, H = 180, L = 30, R = 12, T = 14, B = 28, maxY = Math.max.apply(null, hist.map(function (h) { return h.total; }));
      var x = function (i) { return hist.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (hist.length - 1); };
      var y = function (v) { return T + (H - T - B) * (1 - v / maxY); };
      var grid = [0, Math.round(maxY / 2), maxY].map(function (g) {
        return '<line class="q-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="q-axis" x="' + (L - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>';
      }).join('');
      var path = hist.map(function (h, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(h.score).toFixed(1); }).join(' ');
      var pts = hist.map(function (h, i) {
        return '<g class="q-pt" tabindex="0" data-tip="' + esc(niceDay(h.on) + ': ' + h.score + ' of ' + h.total + ' correct') + '"><circle class="q-hit" cx="' + x(i) + '" cy="' + y(h.score) + '" r="14"/><circle class="q-dot" cx="' + x(i) + '" cy="' + y(h.score) + '" r="5"/></g>';
      }).join('');
      var lastI = hist.length - 1;
      html += '<svg class="q-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Line chart of your last ' + hist.length + ' quiz scores. Latest: ' + hist[lastI].score + ' of ' + hist[lastI].total + '.">' + grid +
        (hist.length > 1 ? '<path class="q-line" d="' + path + '"/>' : '') + pts +
        '<text class="q-axis" x="' + x(0) + '" y="' + (H - 8) + '" text-anchor="' + (hist.length > 1 ? 'start' : 'middle') + '">' + niceDay(hist[0].on) + '</text>' +
        (hist.length > 1 ? '<text class="q-axis" x="' + x(lastI) + '" y="' + (H - 8) + '" text-anchor="end">' + niceDay(hist[lastI].on) + '</text>' : '') +
        '</svg>' +
        '<details class="as-table"><summary>Show as a table</summary><table><thead><tr><th>Date</th><th>Score</th></tr></thead><tbody>' +
        hist.slice().reverse().map(function (h) { return '<tr><td>' + niceDay(h.on) + '</td><td>' + h.score + ' of ' + h.total + '</td></tr>'; }).join('') + '</tbody></table></details>';
    } else {
      html += '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('idle', 36) : '') + '<span>No quizzes yet. <a href="#/review">Take a subject quiz</a> and your scores will draw a line here.</span></p>';
    }
    html += '</section>';

    html += activityPanel();

    // needs attention
    var due = dueList(), weak = weakList(), unspoken = solved.filter(function (e) { return !Progress.isAloud(e.id) && (window.ALOUD || {})[e.id]; });
    var untouched = rows.filter(function (r) { return r.d === 0; });
    var items = [];
    due.slice(0, 3).forEach(function (e) { items.push(['Review due', e.title, '#/lab/' + e.id]); });
    weak.slice(0, 3).forEach(function (e) { items.push(['Weak spot', e.title, '#/lab/' + e.id]); });
    unspoken.slice(0, 2).forEach(function (e) { items.push(['Say it out loud', e.title, '#/lab/' + e.id]); });
    untouched.slice(0, 2).forEach(function (r) { var f = firstIn(r.t.id); items.push(['Not started', r.t.name, '#/lab/' + f.id]); });
    html += '<section class="panel" aria-labelledby="p-need"><h3 id="p-need">Needs attention</h3>' +
      (items.length ? '<ul class="need">' + items.slice(0, 7).map(function (it) {
        return '<li><span class="need-tag">' + it[0] + '</span><a href="' + it[2] + '">' + esc(it[1]) + '</a></li>';
      }).join('') + '</ul>' : '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('happy', 36) : '') + '<span>Nothing needs attention. Not a bug in sight.</span></p>') +
      '</section></div>' +
      '<div class="tip" id="dash-tip" role="tooltip" hidden></div>';
    return html;
  }

  // Hover and focus tooltips for anything with data-tip on the dashboard.
  function wireTips() {
    var tip = document.getElementById('dash-tip');
    if (!tip) return;
    function show(el) {
      tip.textContent = el.getAttribute('data-tip'); tip.hidden = false;
      var r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
      var left = Math.min(Math.max(8, r.left + r.width / 2 - tr.width / 2), window.innerWidth - tr.width - 8);
      var top = r.top - tr.height - 8; if (top < 8) top = r.bottom + 8;
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
    }
    function hideTip() { tip.hidden = true; }
    Array.prototype.forEach.call(view.querySelectorAll('[data-tip]'), function (el) {
      el.addEventListener('pointerenter', function () { show(el); });
      el.addEventListener('pointerleave', hideTip);
      el.addEventListener('focus', function () { show(el); });
      el.addEventListener('blur', hideTip);
    });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  // ---------- Byte's tips, one set per page (shown when you select the resting Byte) ----------
  var BYTE_TIPS = {
    start: ['Not sure which route? "Just exploring" shows everything, and you can change it any time.'],
    home: ['Do the "You are here" step first. One step a day beats five on a Sunday.', 'Reviews come back after 3, 7, 14 and 30 days. That spacing is what makes it stick.', 'Stuck on a topic? Open the glossary page for it, then try again.'],
    lab: ['Run the query before you check it. Looking at the rows finds most bugs.', 'Count the rows before and after a join. If the number jumps, I smell a fan-out.', 'Press Ctrl + Enter to run, Ctrl + Shift + Enter to check.', 'Write FROM first in your head, then SELECT. That is the order the database thinks in.'],
    review: ['A wrong answer in review is not a failure. It just brings the exercise back sooner.', 'A subject quiz feels like a screening test. Try one before an interview.'],
    quiz: ['Say the answer out loud before you pick. That is what an interview feels like.', 'A miss here is useful. The glossary page for it is one tap away.'],
    session: ['Skipping is allowed. The model answer will teach you, and it comes back later.'],
    projects: ['Try each step before opening the model answer. Getting stuck is where the learning happens.', 'Messy data is normal. Cleaning it well is half the job.'],
    glossary: ['Try the Business questions view. It is how interviewers actually ask.', 'Say the interview sentence out loud before you read it.', 'Flashcards work best when you explain the term to me first. I am a great listener.'],
    settings: ['You can turn me off here. I will not be offended. Much.'],
    progress: ['Look at "Needs attention" first. It is the shortest path to the next win.', 'Rest days are allowed. Bugs do not run away.']
  };
  var currentPage = 'home';
  if (window.Byte) Byte.setTips(function () { var list = BYTE_TIPS[currentPage] || BYTE_TIPS.home; return list[Math.floor(Math.random() * list.length)]; });

  // ---------- router ----------
  // ---------- view: About, Privacy, Contact, Roadmap ----------
  function renderInfo(page) {
    teardown();
    view.innerHTML = '<section class="info">' + window.PAGES[page].html() + '</section>';
    window.scrollTo(0, 0);
  }
  // The footer's "Report a mistake" link carries the page you are on.
  function updateReportLink() {
    var a = document.getElementById('report-link'); if (!a || !window.SITE) return;
    a.href = 'mailto:' + window.SITE.email + '?subject=' + encodeURIComponent('The Joinery: mistake report') +
      '&body=' + encodeURIComponent('Page: ' + window.location.href + '\n\nWhat I saw:\n\nWhat I expected:\n');
  }
  function updateNav(page) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var due = dueList().length, link = document.querySelector('[data-nav="quizzes"]');
    if (link) link.innerHTML = 'Quizzes' + (due ? ' <span class="nav-count">' + due + '<span class="sr"> reviews due</span></span>' : '');
  }

  var SITE = 'The Joinery';
  function setTitle(page, parts) {
    var t = '';
    if (page === 'start') { if (!currentRoute()) { document.title = SITE + ': practise data skills, piece by piece'; return; } t = 'Change your route'; }
    else if (page === 'lab') { var ex = parts[1] && (byId(window.EXERCISES, parts[1]) || nextUndone() || window.EXERCISES[0]); t = ex ? ex.title : 'SQL lab'; }
    else if (page === 'review' || page === 'quizzes' || page === 'session' || page === 'quiz') t = 'Quizzes';
    else if (page === 'glossary') { var gt = parts[1] === 'term' && gTerm(decodeURIComponent(parts[2] || '')); t = gt ? gt.term + ' (glossary)' : 'Glossary'; }
    else if (page === 'settings') t = 'Settings';
    else if (window.PAGES && window.PAGES[page]) t = window.PAGES[page].title;
    else if (page === 'progress') t = 'Your progress';
    else if (page === 'projects') { var pj = parts && parts[1] && byId(window.PROJECTS || [], parts[1]); t = pj ? pj.title : 'Projects'; }
    else { var r = currentRoute(); t = r ? r.name : ''; }
    document.title = t ? t + ': ' + SITE : SITE;
  }

  function route() {
    var parts = (window.location.hash || '#/home').replace(/^#\//, '').split('/');
    var page = parts[0] || 'home';
    if (page === 'drills') { window.location.replace('#/lab'); return; } // the clause-order page was removed; old links land in the SQL lab
    if (page === 'dialects') { window.location.replace('#/glossary/term/sql-dialect'); return; } // the Dialects page now lives in the glossary
    if (page === 'home' && !currentRoute()) page = 'start'; // first visit: ask where they are starting
    teardown();
    setMenu(false);
    if (window.Byte) { Byte.hide(); currentPage = page; Byte.refresh(); }
    if (page === 'start') renderStart();
    else if (page === 'lab') renderLab(parts[1]);
    else if (page === 'review' || page === 'quizzes') renderReview(parts[1] === 'review' || page === 'review');
    else if (page === 'session') renderSession();
    else if (page === 'quiz') renderSubjectQuiz(decodeURIComponent(parts[1] || 'all'));
    else if (page === 'glossary') { if (parts[1] === 'term') renderTerm(decodeURIComponent(parts[2] || '')); else renderGlossary(decodeURIComponent(parts[1] || '')); }
    else if (page === 'settings') renderSettings();
    else if (page === 'projects') { if (parts[1]) renderProject(decodeURIComponent(parts[1]), parseInt(parts[2], 10) || 0); else renderProjects(); }
    else if (window.PAGES && window.PAGES[page]) renderInfo(page);
    else if (page === 'progress') renderProgress();
    else { page = 'home'; renderHome(); }
    updateNav(page === 'session' || page === 'quiz' || page === 'review' ? 'quizzes' : page === 'progress' ? 'home' : page);
    updateReportLink();
    setTitle(page, parts);
    if (page !== 'progress') window.scrollTo(0, 0);
  }

  document.getElementById('reset-progress').addEventListener('click', function () {
    if (this.getAttribute('data-armed') === 'yes') {
      Progress.reset(); session = null; this.removeAttribute('data-armed'); this.textContent = 'Progress reset'; route();
    } else {
      this.setAttribute('data-armed', 'yes'); this.textContent = 'Select again to confirm the reset';
    }
  });

  var progressMsg = document.getElementById('progress-msg');
  function say(text) { progressMsg.textContent = text; }
  document.getElementById('export-progress').addEventListener('click', function () {
    var blob = new Blob([Progress.exportData()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'the-joinery-progress.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    say('Progress saved to a file called the-joinery-progress.json.');
  });
  var importFile = document.getElementById('import-file');
  document.getElementById('import-progress').addEventListener('click', function () { importFile.click(); });
  importFile.addEventListener('change', function () {
    var f = importFile.files && importFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Progress.importData(String(reader.result));
      say(res.message);
      if (res.ok) { session = null; route(); }
      importFile.value = '';
    };
    reader.onerror = function () { say('That file could not be read.'); importFile.value = ''; };
    reader.readAsText(f);
  });

  window.addEventListener('hashchange', route);
  route();
})();
