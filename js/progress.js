// Saves progress in the browser (localStorage). Nothing is sent anywhere.
// Tracks: completed exercises, wrong attempts, review schedule, spoken explanations and dialect practice.
(function () {
  var KEY = 'data-learning-site-v1';
  var INTERVALS = [3, 7, 14, 30];       // days between reviews
  var WEAK_INTERVALS = [1, 3, 7, 14];   // shorter gaps for exercises that took several tries
  var WEAK_AT = 3;                      // wrong checks before an exercise counts as a weak spot

  function blank() {
    return { done: {}, drills: {}, drafts: {}, wrong: {}, doneOn: {}, review: {}, aloud: {}, dialect: {}, quiz: [], route: '', visited: {}, activity: {} };
  }
  var state = blank();

  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw), b = blank();
      Object.keys(b).forEach(function (k) { state[k] = parsed[k] || b[k]; });
    }
  } catch (e) { /* storage unavailable: progress lasts for this visit only */ }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var clockOffsetDays = 0; // used by tests to pretend days have passed
  function today() { var d = new Date(); d.setDate(d.getDate() + clockOffsetDays); return dateStr(d); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + clockOffsetDays + n); return dateStr(d); }

  // One count per day of practice, used by the My progress calendar.
  function logActivity() { var d = today(); state.activity[d] = (state.activity[d] || 0) + 1; }

  function isWeak(id) { return (state.wrong[id] || 0) >= WEAK_AT; }
  function intervals(id) { return isWeak(id) ? WEAK_INTERVALS : INTERVALS; }

  window.Progress = {
    // ----- exercises -----
    isDone: function (id) { return !!state.done[id]; },
    markDone: function (id) {
      var first = !state.done[id];
      state.done[id] = true;
      logActivity();
      if (first) {
        state.doneOn[id] = today();
        state.review[id] = { step: 0, due: plusDays(intervals(id)[0]) };
      }
      save();
    },
    addWrong: function (id) { state.wrong[id] = (state.wrong[id] || 0) + 1; logActivity(); save(); },
    wrongCount: function (id) { return state.wrong[id] || 0; },
    isWeak: isWeak,

    // ----- review schedule -----
    isDue: function (id) { var r = state.review[id]; return !!(state.done[id] && r && r.due && r.due <= today()); },
    dueDate: function (id) { var r = state.review[id]; return r ? r.due : null; },
    // clean = solved with no wrong checks and without skipping
    reviewResult: function (id, clean) {
      var r = state.review[id] || { step: 0, due: null };
      if (clean) {
        r.step += 1;
        var list = intervals(id);
        r.due = r.step < list.length ? plusDays(list[r.step]) : null; // null = finished all reviews
      } else {
        r.step = 0;
        r.due = plusDays(1);
      }
      state.review[id] = r;
      logActivity();
      save();
    },
    reviewsFinished: function (id) { var r = state.review[id]; return !!(state.done[id] && r && r.due === null); },

    // ----- explain out loud -----
    markAloud: function (id) { state.aloud[id] = true; logActivity(); save(); },
    isAloud: function (id) { return !!state.aloud[id]; },

    // ----- dialects -----
    dialectDone: function (id) { return !!state.dialect[id]; },
    markDialect: function (id) { state.dialect[id] = true; logActivity(); save(); },

    // ----- quiz history (last 10 scores) -----
    addQuiz: function (score, total, topic) {
      var entry = { on: today(), score: score, total: total };
      if (topic) entry.topic = topic;
      state.quiz.unshift(entry);
      state.quiz = state.quiz.slice(0, 10); logActivity(); save();
    },
    quizHistory: function () { return state.quiz.slice(); },

    // ----- editor drafts -----
    getDraft: function (id) { return (state.drafts && state.drafts[id]) || ''; },
    setDraft: function (id, text) { state.drafts[id] = text; save(); },

    // ----- the learner's chosen route ('' means they have not chosen yet) -----
    getRoute: function () { return typeof state.route === 'string' ? state.route : ''; },
    setRoute: function (id) { state.route = String(id || ''); save(); },

    // ----- activity by day (for the progress dashboard); older saves fall back to solve dates -----
    activity: function () {
      var out = {}, k;
      for (k in state.doneOn) { if (state.doneOn.hasOwnProperty(k)) out[state.doneOn[k]] = out[state.doneOn[k]] || 1; }
      for (k in state.activity) { if (state.activity.hasOwnProperty(k)) out[k] = Math.max(out[k] || 0, state.activity[k]); }
      return out;
    },
    today: today,

    // ----- route map: steps the learner has opened -----
    markVisited: function (key) { state.visited[key] = true; save(); },
    isVisited: function (key) { return !!state.visited[key]; },

    // ----- export and import (a file the learner keeps) -----
    exportData: function () {
      return JSON.stringify({ app: 'data-learning-site', version: 1, savedOn: today(), data: state }, null, 2);
    },
    importData: function (text) {
      var parsed;
      try { parsed = JSON.parse(text); } catch (e) { return { ok: false, message: 'That file is not a saved progress file.' }; }
      if (!parsed || parsed.app !== 'data-learning-site' || !parsed.data || typeof parsed.data !== 'object') {
        return { ok: false, message: 'That file is not a saved progress file from this site.' };
      }
      var fresh = blank();
      Object.keys(fresh).forEach(function (k) {
        var v = parsed.data[k];
        var want = Array.isArray(fresh[k]) ? 'array' : typeof fresh[k];
        var got = Array.isArray(v) ? 'array' : typeof v;
        if (v !== undefined && want === got) fresh[k] = v;
      });
      state = fresh; save();
      return { ok: true, message: 'Progress imported.' };
    },

    // ----- housekeeping -----
    reset: function () { state = blank(); save(); },
    _advanceDays: function (n) { clockOffsetDays += n; } // for tests only
  };
})();
