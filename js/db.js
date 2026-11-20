// The SQL engine (SQLite running in the browser) and the answer checker.
(function (root) {
  var SQL = null;

  // Loads the engine once. Returns a promise.
  function init(initSqlJs, locate) {
    if (SQL) return Promise.resolve(SQL);
    return initSqlJs({ locateFile: locate }).then(function (lib) { SQL = lib; return lib; });
  }

  // A fresh copy of the practice database, so one query can never break the next.
  function freshDb(seedSql) {
    var db = new SQL.Database();
    db.run(seedSql);
    return db;
  }

  // Runs SQL and returns the last result set: { columns: [...], rows: [[...]] }.
  function run(seedSql, sql) {
    var db = freshDb(seedSql);
    try {
      var results = db.exec(sql);
      if (!results.length) return { columns: [], rows: [] };
      var last = results[results.length - 1];
      return { columns: last.columns, rows: last.values };
    } finally {
      db.close();
    }
  }

  function norm(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return 'n:' + (Math.round((v + Number.EPSILON) * 100) / 100).toFixed(2);
    return 's:' + String(v);
  }
  function rowKey(row) { return row.map(norm).join('␟'); }

  // Compares the learner's result with the model answer's result.
  // Column names are ignored; column order, values and (if ordered) row order are checked.
  function compare(expected, actual, ordered) {
    if (!actual.columns.length) {
      return { ok: false, message: 'Your query ran but returned no rows. Check your filters.' };
    }
    if (actual.columns.length !== expected.columns.length) {
      return { ok: false, message: 'Expected ' + expected.columns.length + ' column' + (expected.columns.length === 1 ? '' : 's') +
        ' (' + expected.columns.join(', ') + ') but your result has ' + actual.columns.length + '.' };
    }
    if (actual.rows.length !== expected.rows.length) {
      return { ok: false, message: 'Expected ' + expected.rows.length + ' rows but your result has ' + actual.rows.length +
        '. Look at your filters, joins or grouping.' };
    }
    var e = expected.rows.map(rowKey), a = actual.rows.map(rowKey);
    var es = e.slice().sort(), as = a.slice().sort();
    for (var i = 0; i < es.length; i++) {
      if (es[i] !== as[i]) {
        return { ok: false, message: 'The number of rows and columns is right, but some values differ. Check the column order and your calculations.' };
      }
    }
    if (ordered) {
      for (var j = 0; j < e.length; j++) {
        if (e[j] !== a[j]) return { ok: false, message: 'You have the right rows, but in the wrong order. Check your ORDER BY.' };
      }
    }
    return { ok: true, message: 'Correct.' };
  }

  // Finds the rows that differ. Returns rows only in the learner's result ("extra"),
  // rows only in the expected result ("missing"), and whether the sets match but the order does not.
  function diff(expected, actual, ordered) {
    function counts(rows) { var m = {}; rows.forEach(function (r) { var k = rowKey(r); m[k] = (m[k] || 0) + 1; }); return m; }
    var expCounts = counts(expected.rows), actCounts = counts(actual.rows);
    var extra = [], missing = [], tmp;
    tmp = {}; Object.keys(expCounts).forEach(function (k) { tmp[k] = expCounts[k]; });
    actual.rows.forEach(function (r) { var k = rowKey(r); if (tmp[k] > 0) tmp[k]--; else extra.push(r); });
    tmp = {}; Object.keys(actCounts).forEach(function (k) { tmp[k] = actCounts[k]; });
    expected.rows.forEach(function (r) { var k = rowKey(r); if (tmp[k] > 0) tmp[k]--; else missing.push(r); });
    var orderOnly = false;
    if (!extra.length && !missing.length && ordered) {
      for (var i = 0; i < expected.rows.length; i++) {
        if (rowKey(expected.rows[i]) !== rowKey(actual.rows[i])) { orderOnly = true; break; }
      }
    }
    return { extra: extra, missing: missing, orderOnly: orderOnly };
  }

  function check(seedSql, exercise, userSql) {
    var expected = run(seedSql, exercise.solution);
    var actual = run(seedSql, userSql);
    var verdict = compare(expected, actual, !!exercise.ordered);
    verdict.actual = actual;
    verdict.expected = expected;
    if (!verdict.ok) verdict.diff = diff(expected, actual, !!exercise.ordered);
    return verdict;
  }

  root.LabDB = { init: init, run: run, compare: compare, diff: diff, check: check };
})(typeof window !== 'undefined' ? window : globalThis);
