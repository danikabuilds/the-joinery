// The site itself: a small router plus the pages
// (start screen, path, SQL lab, review and quiz, clause order, dialects, glossary, settings).
(function () {
  var view = document.getElementById('view');
  var engineReady = null;   // promise for the SQL engine
  var editor = null;        // CodeMirror instance on the current page
  var timerId = null;       // explain-out-loud countdown
  var session = null;      // current review or quiz session
  var dialectShow = { sqlite: true, pg: true, mssql: true, bq: true };
  var QUIZ_SIZE = 8;
  var SETTINGS_KEY = 'data-learning-settings';
  var TEXT_SIZES = [['standard', 'Standard'], ['large', 'Large'], ['larger', 'Larger']];
  var TIMERS = [30, 60, 90, 120];

  // ---------- settings (text size and speaking timer), saved in this browser ----------
  function getSettings() {
    var s = { text: 'standard', timer: 60, byte: true };
    try {
      var raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');
      if (TEXT_SIZES.some(function (t) { return t[0] === raw.text; })) s.text = raw.text;
      if (TIMERS.indexOf(raw.timer) !== -1) s.timer = raw.timer;
      if (raw.byte === false) s.byte = false;
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
  function teardown() {
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
    view.innerHTML = '<section class="start">' +
      '<p class="welcome">Welcome to The Joinery: free, hands-on data learning, with no sign-up.</p>' +
      '<h1>' + (cur ? 'Change your route' : 'Where are you starting?') + '</h1>' +
      '<p class="lede">Pick the closest fit. Everything stays open whichever you choose, and you can change your mind at any time.</p>' +
      '<div class="route-grid" role="group" aria-label="Choose a route">' + window.ROUTES.map(function (r, ri) {
        var on = cur && cur.id === r.id;
        return '<button type="button" class="route-card' + (on ? ' on' : '') + '" data-accent="' + (ri + 1) + '" data-route="' + r.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<span class="rc-name">' + esc(r.name) + (on ? '<span class="sr"> (your current route)</span>' : '') + '</span>' +
          '<span class="rc-blurb">' + esc(r.blurb) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="start-skip">' + (cur
        ? '<a href="#/home">Keep my current route</a>'
        : '<button type="button" class="link" data-route="explore">Skip for now and show me everything</button>') + '</p>' +
      '</section>';
    Array.prototype.forEach.call(view.querySelectorAll('[data-route]'), function (b) {
      b.addEventListener('click', function () {
        Progress.setRoute(b.getAttribute('data-route'));
        if (window.location.hash === '#/home') route(); else window.location.hash = '#/home';
      });
    });
    var h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
    if (window.Byte && !cur) byteLater(function () { Byte.say('idle', 'Hi, I\'m Byte. I live in code, so I know where the bugs hide. Pick a route and I\'ll tag along.', null, 11000); }, 600);
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
  function resourceCard(id) {
    var tDone = window.TRANSLATE.filter(function (q) { return Progress.dialectDone(q.id); }).length;
    var c = {
      'review': ['#/review', 'Review and quizzes', 'Spaced reviews of what you have solved, plus multiple-choice quizzes by subject.'],
      'dialects': ['#/dialects', 'Dialects', 'SQLite, PostgreSQL, SQL Server and BigQuery side by side, with translate drills. ' + tDone + ' of ' + window.TRANSLATE.length + ' done.'],
      'glossary': ['#/glossary', 'Glossary and flashcards', window.GLOSSARY.length + ' data terms with deeper explanations, business questions and a sentence to say in an interview.'],
      'glossary-sql': ['#/glossary/SQL', 'SQL terms', termCount('SQL') + ' terms: joins, keys, NULL, CTEs, window functions and more.'],
      'glossary-pipelines': ['#/glossary/Pipelines', 'Pipeline terms', termCount('Pipelines') + ' terms: ETL, ELT, batch, streaming, warehouses and lakes.'],
      'glossary-modelling': ['#/glossary/Modelling', 'Modelling terms', termCount('Modelling') + ' terms: facts, dimensions, star schemas, grain and keys.']
    }[id];
    return c ? '<a class="also-item" href="' + c[0] + '"><h2>' + esc(c[1]) + '</h2><p>' + esc(c[2]) + '</p></a>' : '';
  }
  // A step counts as reached when its work is done, or (for pages with nothing to finish) once it has been opened.
  function stepKey(rt, i) { return rt.id + ':' + i; }
  function stepDone(rt, st, i) {
    if (st.topic) { var l = exercisesIn(st.topic); return l.length > 0 && l.every(function (e) { return Progress.isDone(e.id); }); }
    if (st.next) return window.EXERCISES.some(function (e) { return Progress.isAloud(e.id); });
    var h = st.href || '';
    if (h.indexOf('#/lab/') === 0) return Progress.isDone(h.slice(6));
    if (h === '#/review') return Progress.quizHistory().length > 0;
    if (h === '#/dialects') return window.TRANSLATE.some(function (q) { return Progress.dialectDone(q.id); }) || Progress.isVisited(stepKey(rt, i));
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

  // ---------- view: path (home) ----------
  function renderHome() {
    teardown();
    var rt = currentRoute() || byId(window.ROUTES, 'explore');
    var total = window.EXERCISES.length, done = doneCount();
    var due = dueList().length, weak = weakList().length;
    var aloudCount = window.EXERCISES.filter(function (e) { return Progress.isAloud(e.id); }).length;

    var html = '<p class="route-bar">Your route: <strong>' + esc(rt.name) + '</strong> <a href="#/start">Change route</a></p>' +
      '<section class="intro">' +
      '<h1>' + esc(rt.headline) + '</h1>' +
      '<p class="lede">' + esc(rt.lede) + '</p>' +
      (rt.note ? '<p class="route-note">' + esc(rt.note) + ' <a href="#/roadmap">See the roadmap</a>.</p>' : '') +
      '</section>';

    if (done) {
      html += '<section class="today" aria-label="Today"><h2>Today</h2><ul>' +
        '<li>' + (due ? '<a href="#/review">' + plural(due, 'exercise is', 'exercises are') + ' due for review</a>' : 'Nothing is due for review') + '</li>' +
        (weak ? '<li><a href="#/review">' + plural(weak, 'weak spot', 'weak spots') + ' to revisit</a></li>' : '') +
        '<li>' + aloudCount + ' of ' + total + ' explained out loud</li>' +
        '</ul></section>';
    }

    if (rt.steps && rt.steps.length) html += routeMap(rt);

    if (rt.id === 'interview') html += aloudQueue();

    html += '<section class="home-progress" id="your-progress" aria-labelledby="prog-h">' +
      '<div class="section-row"><h2 id="prog-h" class="section-h">Your progress</h2><a href="#/lab">Open the SQL lab</a></div>' +
      progressBody() + '</section>';

    var cards = (rt.cards || []).map(resourceCard).filter(Boolean);
    if (cards.length) {
      html += '<section class="also" aria-label="Other things to practise">' + cards.join('') + '</section>';
    }
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
        '<div id="result"><p class="empty">Write a query and run it. Results appear here.</p></div>' +
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
    function runQuery() {
      showPane('result');
      var sql = userSql(); if (!sql) return;
      loadEngine().then(function () {
        try {
          result.innerHTML = resultTable(LabDB.run(window.SEED_SQL, sql));
          clearHelp();
          show('info', 'Query ran. Select "Check answer" when the result looks right.');
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
      '<p class="lede">Practise on a small online shop\'s data: customers, orders, products, sellers and payments. Each line below is a clause of a query, in the order you write it.</p>' +
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

  function renderReview() {
    teardown();
    var due = dueList(), weak = weakList(), hist = Progress.quizHistory();
    var html = '<section class="review"><h1>Review</h1>' +
      '<p class="lede">Exercises come back 3, 7, 14 and 30 days after you solve them, so they stick. Ones that took three or more wrong checks come back sooner.</p>';

    html += '<div class="review-block"><h2>Due now</h2>';
    if (due.length) {
      html += '<ul class="plain">' + due.map(function (e) { return '<li><a href="#/lab/' + e.id + '">' + esc(e.title) + '</a><span class="meta">' + esc(topicOf(e.topic).clause) + '</span></li>'; }).join('') + '</ul>' +
        '<p><button type="button" class="btn primary" id="start-review">Start review of ' + due.length + '</button></p>';
    } else {
      html += '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('idle', 36) : '') + '<span>Nothing is due. Solve exercises in the SQL lab and they will appear here when it is time.</span></p>';
    }
    html += '</div>';

    html += '<div class="review-block"><h2>Weak spots</h2>';
    if (weak.length) {
      html += '<ul class="plain">' + weak.map(function (e) {
        return '<li><a href="#/lab/' + e.id + '">' + esc(e.title) + '</a><span class="meta">' + plural(Progress.wrongCount(e.id), 'wrong check', 'wrong checks') + '</span></li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('happy', 36) : '') + '<span>No weak spots yet. An exercise appears here after three wrong checks.</span></p>';
    }
    html += '</div>';

    html += '<div class="review-block"><h2>Quiz by subject</h2>' +
      '<p>Multiple-choice questions on the ideas behind the work: ' + CQ_SIZE + ' per quiz, one area at a time or all of them together. Each answer comes with the plain meaning and a link to the glossary page.</p>' +
      '<div class="topic-quiz" role="group" aria-label="Quiz by subject">' +
      ['all'].concat(window.GLOSSARY_GROUPS.map(function (g) { return g.id; })).map(function (id) {
        var g = id === 'all' ? null : gGroup(id);
        var n = id === 'all' ? window.GLOSSARY.length : termCount(id);
        return '<a class="topic-btn" ' + (g ? 'data-area="' + id + '" ' : '') + 'href="#/quiz/' + id + '">' +
          '<span class="tb-clause">' + esc(g ? (QUIZ_AREA[id] || g.name) : 'All areas') + '</span>' +
          '<span class="tb-name">' + esc(g ? g.name : 'A mix from every area') + '</span>' +
          '<span class="tb-meta">' + plural(n, 'term', 'terms') + '</span></a>';
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
    html += '</section>';
    view.innerHTML = html;

    var sr = document.getElementById('start-review');
    if (sr) sr.addEventListener('click', function () { startSession('review', shuffle(due).map(function (e) { return e.id; })); });
  }

  // ---------- subject quizzes: multiple choice from the glossary ----------
  var CQ_SIZE = 8;
  var QUIZ_AREA = { SQL: 'SQL', Modelling: 'Data modelling', Pipelines: 'Data engineering', Business: 'Business logic', Statistics: 'Data analytics', BI: 'Business intelligence' };
  var cq = null; // current subject quiz

  function mentions(text, term) {
    var t = term.toLowerCase().replace(/\s*\(.*\)\s*/g, '').trim();
    return t.length >= 3 && text.toLowerCase().indexOf(t) !== -1;
  }
  function buildSubjectQuiz(area) {
    var pool = window.GLOSSARY.filter(function (t) { return area === 'all' || t.group === area; });
    var qs = [];
    shuffle(pool).forEach(function (t) {
      if (qs.length >= CQ_SIZE) return;
      var kinds = [];
      if (!mentions(t.def, t.term)) kinds.push('def');
      var bq = (t.questions || []).filter(function (q) { return !mentions(q, t.term); });
      if (bq.length) kinds.push('biz');
      if (!kinds.length) return;
      var kind = kinds[Math.floor(Math.random() * kinds.length)];
      var same = pool.filter(function (x) { return x !== t && x.group === t.group; });
      var others = shuffle(same.length >= 3 ? same : pool.filter(function (x) { return x !== t; })).slice(0, 3);
      var opts = shuffle([t].concat(others)).map(function (x) { return x.id; });
      qs.push({
        id: t.id, kind: kind, opts: opts,
        text: kind === 'def' ? t.def : bq[Math.floor(Math.random() * bq.length)]
      });
    });
    return qs;
  }

  function renderSubjectQuiz(area) {
    teardown();
    var valid = area === 'all' || window.GLOSSARY_GROUPS.some(function (g) { return g.id === area; });
    if (!valid) { window.location.hash = '#/review'; return; }
    cq = { area: area, qs: buildSubjectQuiz(area), i: 0, score: 0, missed: [], saved: false };
    paintSubjectQuestion();
  }

  function paintSubjectQuestion() {
    if (cq.i >= cq.qs.length) { paintSubjectResults(); return; }
    var q = cq.qs[cq.i], n = cq.qs.length, k = cq.i + 1;
    var label = cq.area === 'all' ? 'All areas' : QUIZ_AREA[cq.area];
    var prompt = q.kind === 'def' ? 'Which term fits this meaning?' : 'A colleague asks the question below. Which term helps you answer it?';
    view.innerHTML = '<section class="review subject-quiz"' + (cq.area === 'all' ? '' : ' data-area="' + cq.area + '"') + '>' +
      '<p class="crumb"><a href="#/review">Review</a> / ' + esc(label) + ' quiz, question ' + k + ' of ' + n + '</p>' +
      '<progress class="bar" max="' + n + '" value="' + (k - 1) + '" aria-label="Progress through the quiz"></progress>' +
      '<h1 class="sq-prompt" id="sq-prompt" tabindex="-1">' + prompt + '</h1>' +
      '<blockquote class="sq-text">' + esc(q.text) + '</blockquote>' +
      '<div class="sq-opts" role="group" aria-labelledby="sq-prompt">' + q.opts.map(function (id) {
        return '<button type="button" class="sq-opt" data-opt="' + id + '"' + (cq.area === 'all' ? ' data-area="' + gTerm(id).group + '"' : '') + '>' + esc(gTerm(id).term) + '</button>';
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
      if (right) cq.score += 1; else cq.missed.push({ id: q.id, skipped: chosen === null });
      Array.prototype.forEach.call(view.querySelectorAll('.sq-opt'), function (b) {
        var id = b.getAttribute('data-opt'); b.disabled = true;
        if (id === q.id) { b.classList.add('right'); b.insertAdjacentHTML('beforeend', '<span class="sq-tag"> (correct answer)</span>'); }
        else if (id === chosen) { b.classList.add('wrong'); b.insertAdjacentHTML('beforeend', '<span class="sq-tag"> (your answer)</span>'); }
      });
      var fb = document.getElementById('sq-feedback');
      fb.className = 'sq-feedback ' + (right ? 'good' : 'bad');
      fb.innerHTML = '<p><strong>' + (right ? 'Correct.' : chosen === null ? 'Skipped.' : 'Not quite.') + '</strong> ' + esc(t.term) + ': ' + esc(t.def) + '</p>' +
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

  function paintSubjectResults() {
    var total = cq.qs.length, label = cq.area === 'all' ? 'All areas' : QUIZ_AREA[cq.area];
    if (!cq.saved) { Progress.addQuiz(cq.score, total, 'area:' + cq.area); cq.saved = true; }
    view.innerHTML = '<section class="review"' + (cq.area === 'all' ? '' : ' data-area="' + cq.area + '"') + '><h1>' + esc(label) + ' quiz results</h1>' +
      '<p class="lede">You got ' + cq.score + ' of ' + total + ' right.' + (cq.missed.length ? ' These are worth another look:' : ' Every one, no bugs found.') + '</p>' +
      (cq.missed.length ? '<ul class="plain results">' + cq.missed.map(function (m) {
        var t = gTerm(m.id);
        return '<li><a href="' + termLink(t) + '">' + esc(t.term) + '</a><span class="meta">' + (m.skipped ? 'Skipped' : 'Missed') + '</span></li>';
      }).join('') + '</ul>' : '') +
      '<p class="intro-actions"><a class="btn primary" href="#/quiz/' + cq.area + '" id="sq-again">Try another ' + esc(label.toLowerCase()) + ' quiz</a>' +
      '<a class="btn" href="#/review">Back to review</a></p></section>';
    window.scrollTo(0, 0);
    if (window.Byte) {
      var share = total ? cq.score / total : 0;
      if (share >= 0.75) byteLater(function () { Byte.say('happy', cq.score === total ? 'A perfect run! Not one bug got past you.' : 'Strong work. ' + cq.score + ' of ' + total + '. The rest are worth a glance.'); }, 500);
      else byteLater(function () { Byte.say('idle', 'Every miss is a lesson. Open those pages, then come back for another go.'); }, 500);
    }
    var again = document.getElementById('sq-again');
    if (again) again.addEventListener('click', function (e) { e.preventDefault(); renderSubjectQuiz(cq.area); });
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

  // ---------- view: dialects ----------
  function dialectTabs(active) {
    return '<nav class="tabs" aria-label="Dialect sections">' +
      '<a href="#/dialects"' + (active === 'compare' ? ' aria-current="page"' : '') + '>Compare</a>' +
      '<a href="#/dialects/translate"' + (active === 'translate' ? ' aria-current="page"' : '') + '>Translate drills</a></nav>';
  }

  function renderDialects() {
    teardown();
    var groups = [];
    window.DIALECT_ROWS.forEach(function (r) { if (groups.indexOf(r.group) === -1) groups.push(r.group); });
    var shownCount = window.DIALECTS.filter(function (d) { return dialectShow[d.id]; }).length;

    var html = '<section class="dialects"><h1>SQL dialects</h1>' +
      '<p class="lede">The core of SQL is the same everywhere. What changes is mostly dates, text functions and a few clauses. Only SQLite runs inside this site; the others are shown for comparison.</p>' +
      dialectTabs('compare') +
      '<div class="g-groups" role="group" aria-label="Dialects to show">' + window.DIALECTS.map(function (d) {
        return '<button type="button" class="pill' + (dialectShow[d.id] ? ' on' : '') + '" data-dialect="' + d.id + '" aria-pressed="' + dialectShow[d.id] + '">' + esc(d.name) + '</button>';
      }).join('') + '</div>';

    groups.forEach(function (g) {
      html += '<h2 class="dgroup">' + esc(g) + '</h2>';
      window.DIALECT_ROWS.filter(function (r) { return r.group === g; }).forEach(function (r) {
        html += '<article class="dcard"><h3>' + esc(r.title) + '</h3><div class="dgrid cols-' + shownCount + '">' +
          window.DIALECTS.filter(function (d) { return dialectShow[d.id]; }).map(function (d) {
            return '<div class="dcol"><h4>' + esc(d.name) + '</h4><pre>' + esc(r[d.id]) + '</pre></div>';
          }).join('') + '</div>' +
          '<p class="dnote">' + esc(r.note) + '</p>' +
          (r.try ? '<div class="actions"><button type="button" class="btn quiet" data-try="' + r.id + '">Run the SQLite version</button></div><div class="try-out" id="out-' + r.id + '"></div>' : '') +
          '</article>';
      });
    });
    html += '</section>';
    view.innerHTML = html;

    Array.prototype.forEach.call(view.querySelectorAll('[data-dialect]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-dialect');
        var on = window.DIALECTS.filter(function (d) { return dialectShow[d.id]; }).length;
        if (dialectShow[id] && on === 1) return; // keep at least one column
        dialectShow[id] = !dialectShow[id]; renderDialects();
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-try]'), function (b) {
      b.addEventListener('click', function () {
        var row = byId(window.DIALECT_ROWS, b.getAttribute('data-try'));
        var out = document.getElementById('out-' + row.id);
        loadEngine().then(function () {
          try { out.innerHTML = '<pre class="tried">' + esc(row.try) + '</pre>' + resultTable(LabDB.run(window.SEED_SQL, row.try)); }
          catch (e) { out.innerHTML = '<p class="feedback bad">SQL error: ' + esc(e.message) + '</p>'; }
        }, function () { out.innerHTML = '<p class="feedback bad">The SQL engine could not load. Open the site with Live Server.</p>'; });
      });
    });
  }

  function renderTranslate(id) {
    teardown();
    var q = byId(window.TRANSLATE, id) || window.TRANSLATE.filter(function (x) { return !Progress.dialectDone(x.id); })[0] || window.TRANSLATE[0];
    var idx = window.TRANSLATE.indexOf(q);
    var options = shuffle(q.options.map(function (text, i) { return { text: text, correct: i === q.answer }; }));
    var done = window.TRANSLATE.filter(function (x) { return Progress.dialectDone(x.id); }).length;
    var isQuestion = q.kind === 'question';

    view.innerHTML = '<section class="dialects"><h1>Translate drills</h1>' + dialectTabs('translate') +
      '<p class="drill-count">Question ' + (idx + 1) + ' of ' + window.TRANSLATE.length + ', ' + done + ' answered correctly' +
        (Progress.dialectDone(q.id) ? ' <span class="badge">Done</span>' : '') + '</p>' +
      '<h2 class="goal">' + (isQuestion ? 'A question about ' + esc(q.to) : 'Translate from ' + esc(q.from) + ' to ' + esc(q.to)) + '</h2>' +
      '<pre class="q-code">' + esc(q.code) + '</pre>' +
      '<div class="opts" role="group" aria-label="Choose one answer">' + options.map(function (o, i) {
        return '<button type="button" class="opt" data-i="' + i + '"><code>' + esc(o.text) + '</code></button>';
      }).join('') + '</div>' +
      '<div id="feedback" role="status" aria-live="polite"></div>' +
      '<div id="after"></div>' +
      '<nav class="pager" aria-label="Translate drills">' +
        (idx > 0 ? '<a href="#/dialects/translate/' + window.TRANSLATE[idx - 1].id + '">Previous question</a>' : '<span></span>') +
        (idx < window.TRANSLATE.length - 1 ? '<a href="#/dialects/translate/' + window.TRANSLATE[idx + 1].id + '">Next question</a>' : '<a href="#/dialects">Back to the comparison</a>') +
      '</nav></section>';

    var locked = false;
    Array.prototype.forEach.call(view.querySelectorAll('.opt'), function (btn) {
      btn.addEventListener('click', function () {
        if (locked) return;
        var pick = options[Number(btn.getAttribute('data-i'))];
        var fb = document.getElementById('feedback');
        if (pick.correct) {
          locked = true; Progress.markDialect(q.id); btn.classList.add('right');
          fb.className = 'feedback good'; fb.textContent = 'Correct. ' + q.why;
          if (window.Byte) Byte.happy();
          if (idx < window.TRANSLATE.length - 1) {
            document.getElementById('after').innerHTML = '<a class="btn primary" href="#/dialects/translate/' + window.TRANSLATE[idx + 1].id + '">Next question</a>';
          }
        } else {
          btn.classList.add('wrong'); btn.disabled = true;
          fb.className = 'feedback bad'; fb.textContent = 'Not that one. Look again at how the clauses and function names are written in ' + q.to + ', then try another option.';
        }
      });
    });
  }

  // ---------- view: glossary ----------
  var glossaryState = { q: '', group: 'All', mode: 'index', card: 0, revealed: false };
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
      '<p class="lede">' + window.GLOSSARY.length + ' data terms in six areas. Each one opens a page with the plain meaning, a deeper explanation, examples, common mistakes, the business questions it answers and a sentence to say out loud.</p>' +
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

  function paintGlossary() {
    var body = document.getElementById('g-body'), count = document.getElementById('g-count');
    var items = glossaryItems().sort(byTerm);
    var q = glossaryState.q.trim();
    if (!items.length) { count.textContent = ''; body.innerHTML = '<p class="empty with-byte">' + (window.Byte && Byte.enabled() ? Byte.mini('search', 36) : '') + '<span>I searched every table and found nothing. Try a shorter search or choose All areas.</span></p>'; return; }
    var groupsShown = window.GLOSSARY_GROUPS.filter(function (g) { return items.some(function (t) { return t.group === g.id; }); });

    if (glossaryState.mode === 'index') {
      count.textContent = q ? plural(items.length, 'term matches', 'terms match') + ' "' + q + '"' : '';
      body.innerHTML = groupsShown.map(function (g) {
        var list = items.filter(function (t) { return t.group === g.id; });
        return '<section class="g-area" data-area="' + g.id + '" aria-labelledby="ga-' + g.id + '">' +
          '<div class="g-area-head"><h2 id="ga-' + g.id + '">' + esc(g.name) + '</h2><span class="tally">' + plural(list.length, 'term', 'terms') + '</span></div>' +
          '<p class="g-blurb">' + esc(g.blurb) + '</p>' +
          '<ul class="g-index">' + list.map(function (t) {
            return '<li class="term"><a href="' + termLink(t) + '"><span class="g-term">' + esc(t.term) + '</span>' +
              '<span class="g-def">' + esc(t.def) + '</span><span class="area sr">' + esc(t.group) + '</span></a></li>';
          }).join('') + '</ul></section>';
      }).join('');
      return;
    }

    if (glossaryState.mode === 'questions') {
      var withQ = items.filter(function (t) { return t.questions && t.questions.length; });
      var total = withQ.reduce(function (n, t) { return n + t.questions.length; }, 0);
      count.textContent = plural(total, 'question', 'questions') + ' the business asks, each linked to the term that helps answer it.';
      body.innerHTML = groupsShown.filter(function (g) { return withQ.some(function (t) { return t.group === g.id; }); }).map(function (g) {
        var rows = [];
        withQ.filter(function (t) { return t.group === g.id; }).forEach(function (t) {
          t.questions.forEach(function (qq) { rows.push('<li><span class="bq-q">' + esc(qq) + '</span><a class="bq-t" href="' + termLink(t) + '">' + esc(t.term) + '</a></li>'); });
        });
        return '<section class="g-area" data-area="' + g.id + '"><div class="g-area-head"><h2>' + esc(g.name) + '</h2></div><ul class="bq-list">' + rows.join('') + '</ul></section>';
      }).join('');
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
          (t.ex ? '<section class="t-sec"><h2>Example</h2>' + (t.exCode ? '<pre class="t-code">' + esc(t.ex) + '</pre>' : '<p class="t-ex">' + esc(t.ex).replace(/\n/g, '<br>') + '</p>') + '</section>' : '') +
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
      '<p class="lede">Make the site comfortable to use. Changes save straight away, in this browser only.</p>' +
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
        if (r.name === 'byte') { cur.byte = r.value === 'on'; saveSettings(cur); if (cur.byte && window.Byte) Byte.say('happy', 'I\'m back! I\'ll keep it short.'); else if (window.Byte) Byte.off(); }
        else { cur[r.name] = r.name === 'timer' ? Number(r.value) : r.value; saveSettings(cur); }
        msg.textContent = 'Saved.';
      });
    });
    var h = view.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); }
  }

  // ---------- the site is dark only ----------
  document.documentElement.setAttribute('data-theme', 'dark');

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

  // The dashboard body, shown on the home page under "Your progress".
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
    var html = '<p class="panel-sub prog-lede">Your own numbers, saved in this browser. No streaks and no league tables: just what you have done and what to look at next.</p>' +
      '<div class="kpis">' +
        tile('Exercises solved', solved.length, total, total - solved.length ? (total - solved.length) + ' still to try' : 'Every exercise solved') +
        tile('Right first time', firstTry.length, solved.length || 0, solved.length ? Math.round(firstTry.length / solved.length * 100) + '% of what you solved' : 'Solve one to start') +
        tile('Explained out loud', spoken.length, solved.length || 0, solved.length ? 'Solved exercises you have said aloud' : 'Unlocks after a solve') +
        tile('Days practised', daysThisMonth, null, 'in ' + MONTHS[Number(monthKey.slice(5)) - 1] + ', any amount counts') +
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

    // activity calendar: the last 12 weeks, shaded by how much was done each day
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
    html += '<section class="panel" aria-labelledby="p-cal"><h3 id="p-cal">Activity</h3><p class="panel-sub">Last 12 weeks: ' + plural(activeDays, 'day', 'days') + ' with practice. Rest days are fine.</p>' +
      '<div class="cal" role="img" aria-label="Calendar of the last 12 weeks. ' + activeDays + ' days with practice.">' +
        '<div class="cal-days" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>' +
        '<div class="cal-grid">' + cells.join('') + '</div></div>' +
      '<p class="cal-key" aria-hidden="true">Less <span class="cal-cell lvl-0"></span><span class="cal-cell lvl-1"></span><span class="cal-cell lvl-2"></span><span class="cal-cell lvl-3"></span> More</p></section>';

    // needs attention
    var due = dueList(), weak = weakList(), unspoken = solved.filter(function (e) { return !Progress.isAloud(e.id) && (window.ALOUD || {})[e.id]; });
    var untouched = rows.filter(function (r) { return r.d === 0; });
    var items = [];
    due.slice(0, 3).forEach(function (e) { items.push(['Review due', e.title, '#/lab/' + e.id]); });
    weak.slice(0, 3).forEach(function (e) { items.push(['Weak spot', e.title, '#/lab/' + e.id]); });
    unspoken.slice(0, 2).forEach(function (e) { items.push(['Say it out loud', e.title, '#/lab/' + e.id]); });
    untouched.slice(0, 2).forEach(function (r) { var f = firstIn(r.t.id); items.push(['Not started', r.t.name, '#/lab/' + f.id]); });
    html += '<section class="panel" aria-labelledby="p-need"><h3 id="p-need">Needs attention</h3><p class="panel-sub">The most useful things to do next</p>' +
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
    dialects: ['Dates, LIMIT and string functions are where dialects differ most. The rest is mostly the same.'],
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
    var rl = document.getElementById('route-link'), cr = currentRoute();
    if (rl) rl.textContent = cr ? 'Route: ' + cr.name : 'Choose a route';
    var due = dueList().length, link = document.querySelector('[data-nav="review"]');
    if (link) link.innerHTML = 'Review' + (due ? ' <span class="nav-count">' + due + '<span class="sr"> due</span></span>' : '');
  }

  var SITE = 'The Joinery';
  function setTitle(page, parts) {
    var t = '';
    if (page === 'start') t = 'Choose your route';
    else if (page === 'lab') { var ex = parts[1] && (byId(window.EXERCISES, parts[1]) || nextUndone() || window.EXERCISES[0]); t = ex ? ex.title : 'SQL lab'; }
    else if (page === 'review' || page === 'session' || page === 'quiz') t = 'Review and quiz';
    else if (page === 'dialects') t = 'Dialects';
    else if (page === 'glossary') { var gt = parts[1] === 'term' && gTerm(decodeURIComponent(parts[2] || '')); t = gt ? gt.term + ' (glossary)' : 'Glossary'; }
    else if (page === 'settings') t = 'Settings';
    else if (window.PAGES && window.PAGES[page]) t = window.PAGES[page].title;
    else if (page === 'progress') t = 'Your progress';
    else { var r = currentRoute(); t = r ? r.name : ''; }
    document.title = t ? t + ': ' + SITE : SITE;
  }

  function route() {
    var parts = (window.location.hash || '#/home').replace(/^#\//, '').split('/');
    var page = parts[0] || 'home';
    if (page === 'drills') { window.location.replace('#/lab'); return; } // the clause-order page was removed; old links land in the SQL lab
    if (page === 'home' && !currentRoute()) page = 'start'; // first visit: ask where they are starting
    teardown();
    setMenu(false);
    if (window.Byte) { Byte.hide(); currentPage = page; Byte.refresh(); }
    if (page === 'start') renderStart();
    else if (page === 'lab') renderLab(parts[1]);
    else if (page === 'review') renderReview();
    else if (page === 'session') renderSession();
    else if (page === 'quiz') renderSubjectQuiz(decodeURIComponent(parts[1] || 'all'));
    else if (page === 'dialects') { if (parts[1] === 'translate') renderTranslate(parts[2]); else renderDialects(); }
    else if (page === 'glossary') { if (parts[1] === 'term') renderTerm(decodeURIComponent(parts[2] || '')); else renderGlossary(decodeURIComponent(parts[1] || '')); }
    else if (page === 'settings') renderSettings();
    else if (window.PAGES && window.PAGES[page]) renderInfo(page);
    else if (page === 'progress') { renderHome(); var yp = document.getElementById('your-progress'); if (yp) setTimeout(function () { yp.scrollIntoView(); }, 0); }
    else { page = 'home'; renderHome(); }
    updateNav(page === 'session' || page === 'quiz' ? 'review' : page === 'progress' ? 'home' : page);
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
