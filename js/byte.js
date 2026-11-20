// Byte the beetle: a small companion who appears at key moments with a short line.
// Moods: 'idle', 'search' (found an error) and 'happy' (right answer).
// Byte can be switched off in Settings; screen readers hear the message only.
(function () {
  var SETTINGS_KEY = 'data-learning-settings';
  var timer = null;

  function enabled() {
    try { return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}').byte !== false; } catch (e) { return true; }
  }

  var BODY =
    '<g class="b-legs" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none">' +
      '<path d="M-38 -6 L-56 -16"/><path d="M-40 10 L-60 12"/><path d="M-34 26 L-52 40"/>' +
      '<path d="M38 -6 L56 -16"/><path d="M40 10 L60 12"/><path d="M34 26 L52 40"/></g>' +
    '<ellipse class="b-shell" cx="0" cy="10" rx="42" ry="38"/>' +
    '<path class="b-line" d="M0 -26 V48" stroke-width="3"/>' +
    '<path class="b-grid" d="M-38 0 H38 M-40 18 H40 M-30 36 H30 M-20 -24 V44 M20 -24 V44" stroke-width="2"/>' +
    '<circle class="b-head" cx="0" cy="-34" r="24"/>' +
    '<g class="b-ant" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none">' +
      '<path d="M-10 -54 Q-18 -74 -30 -78"/><path d="M10 -54 Q18 -74 30 -78"/></g>' +
    '<circle class="b-tip" cx="-30" cy="-78" r="5"/><circle class="b-tip" cx="30" cy="-78" r="5"/>';
  var FACES = {
    idle: '<g class="b-eyes"><ellipse class="b-white" cx="-9" cy="-36" rx="5" ry="6.5"/><ellipse class="b-white" cx="9" cy="-36" rx="5" ry="6.5"/>' +
      '<circle cx="-8" cy="-35" r="2.5"/><circle cx="10" cy="-35" r="2.5"/></g>' +
      '<path class="b-mouth" d="M-7 -22 Q0 -16 7 -22"/>',
    search: '<g class="b-eyes"><ellipse class="b-white" cx="-9" cy="-36" rx="5" ry="6.5"/><ellipse class="b-white" cx="9" cy="-36" rx="5" ry="6.5"/>' +
      '<circle cx="-7" cy="-37" r="2.5"/><circle cx="11" cy="-37" r="2.5"/></g>' +
      '<path class="b-mouth" d="M-6 -20 H6"/>' +
      '<g class="b-glass"><circle cx="-62" cy="-30" r="16" class="b-lens"/><path d="M-50 -18 L-38 -6" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></g>',
    happy: '<path class="b-mouth" d="M-14 -38 Q-9 -44 -4 -38 M4 -38 Q9 -44 14 -38"/>' +
      '<path class="b-grin" d="M-9 -24 Q0 -14 9 -24 Z"/>' +
      '<g class="b-spark"><path d="M-58 -70 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z"/><path d="M56 -60 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z"/></g>'
  };
  function svg(mood) {
    return '<svg class="byte-svg" viewBox="-75 -95 150 150" width="64" height="64" aria-hidden="true" focusable="false">' + BODY + (FACES[mood] || FACES.idle) + '</svg>';
  }

  var box = null, live = null, peek = null, tipSource = null;
  // The resting Byte: peeks up from the corner. Select it for a tip about the current page.
  function ensurePeek() {
    if (peek) return;
    peek = document.createElement('button');
    peek.type = 'button';
    peek.className = 'byte-peek';
    peek.setAttribute('aria-label', 'Ask Byte for a tip');
    peek.innerHTML = svg('idle');
    peek.addEventListener('click', function () {
      var tip = tipSource ? tipSource() : null;
      say('idle', tip || 'Small steps, every day. That is how the bugs get caught.', null, 11000);
    });
    document.body.appendChild(peek);
  }
  function showPeek(on) {
    if (!enabled()) on = false;
    if (on) ensurePeek();
    if (peek) peek.hidden = !on;
  }
  function ensure() {
    if (box) return;
    box = document.createElement('aside');
    box.className = 'byte';
    box.setAttribute('aria-label', 'Byte the beetle');
    box.hidden = true;
    document.body.appendChild(box);
    live = document.createElement('p');
    live.className = 'sr'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
    box.addEventListener('mouseenter', function () { clearTimeout(timer); });
    box.addEventListener('focusin', function () { clearTimeout(timer); });
  }

  function hide() {
    clearTimeout(timer);
    if (!box || box.hidden) return;
    box.classList.remove('in');
    var b = box;
    setTimeout(function () { b.hidden = true; showPeek(true); }, reduced() ? 0 : 220);
  }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // action: optional { label, run } shown as a small button under the line.
  function say(mood, text, action, ms) {
    if (!enabled()) return;
    ensure();
    clearTimeout(timer);
    showPeek(false);
    box.className = 'byte mood-' + (mood || 'idle');
    box.innerHTML = svg(mood) +
      '<div class="byte-bubble"><p class="byte-name">Byte</p><p class="byte-text"></p>' +
      (action ? '<button type="button" class="byte-act"></button>' : '') +
      '<button type="button" class="byte-close" aria-label="Hide Byte">&times;</button></div>';
    box.querySelector('.byte-text').textContent = text;
    if (action) {
      var a = box.querySelector('.byte-act');
      a.textContent = action.label;
      a.addEventListener('click', function () { hide(); action.run(); });
    }
    box.querySelector('.byte-close').addEventListener('click', hide);
    box.hidden = false;
    void box.offsetWidth; // restart the entrance animation
    box.classList.add('in');
    live.textContent = '';
    setTimeout(function () { live.textContent = 'Byte says: ' + text; }, 50);
    timer = setTimeout(hide, ms || 9000);
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  window.Byte = {
    say: say,
    hide: hide,
    // Byte drawn inside a page (decorative): Byte.mini('happy', 40)
    mini: function (mood, size) {
      return svg(mood).replace('class="byte-svg"', 'class="byte-svg byte-mini mood-' + (mood || 'idle') + '"').replace(/width="64" height="64"/, 'width="' + (size || 40) + '" height="' + (size || 40) + '"');
    },
    // app.js gives Byte a function that returns a tip for the current page
    setTips: function (fn) { tipSource = fn; },
    refresh: function () { if (!box || box.hidden) showPeek(true); },
    off: function () { hide(); showPeek(false); },
    enabled: enabled,
    happy: function () {
      say('happy', pick([
        'Bug-free! Nicely joined.',
        'Not a single bug in that one. Lovely.',
        'Clean as a fresh plank. Well done.',
        'That query runs like it was carved for it.',
        'Spot on. I checked every row.'
      ]));
    }
  };
})();
