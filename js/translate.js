// Translates a query written for SQLite (the engine inside this site) into another database's dialect.
// It covers the common differences only: the same ones the "SQL dialect" glossary term lists.
// Anything it cannot translate safely is reported as a warning instead of guessed.
// Usage: SQLTranslate.translate(sql, 'pg' | 'mssql' | 'bq' | 'sf') -> { sql, changes: [], warnings: [] }
(function () {
  'use strict';

  var TARGETS = {
    pg: 'PostgreSQL',
    mssql: 'SQL Server',
    bq: 'BigQuery',
    sf: 'Snowflake'
  };

  // ---------- masking: keep text values and comments safe from the rewrite rules ----------
  // 'text' becomes \u0001S<n>\u0001, "name" becomes \u0001Q<n>\u0001, -- comments become \u0001C<n>\u0001
  function mask(sql) {
    var store = [], out = '', i = 0;
    while (i < sql.length) {
      var c = sql[i];
      if (c === "'" || c === '"') {
        var j = i + 1;
        while (j < sql.length) {
          if (sql[j] === c && sql[j + 1] === c) { j += 2; continue; }
          if (sql[j] === c) break;
          j++;
        }
        store.push(sql.slice(i, j + 1));
        out += '\u0001' + (c === "'" ? 'S' : 'Q') + (store.length - 1) + '\u0001';
        i = j + 1;
      } else if (c === '-' && sql[i + 1] === '-') {
        var k = sql.indexOf('\n', i); if (k === -1) k = sql.length;
        store.push(sql.slice(i, k));
        out += '\u0001C' + (store.length - 1) + '\u0001';
        i = k;
      } else { out += c; i++; }
    }
    return { code: out, store: store };
  }
  function unmask(code, store) {
    return code.replace(/\u0001[SQC](\d+)\u0001/g, function (m, n) { return store[+n]; });
  }
  // the raw text inside a masked text value, or null if the argument is not a plain text value
  function textValue(arg, store) {
    var m = /^\s*\u0001S(\d+)\u0001\s*$/.exec(arg);
    return m ? store[+m[1]].slice(1, -1).replace(/''/g, "'") : null;
  }

  // ---------- finding function calls with balanced brackets ----------
  function splitArgs(s) {
    var args = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (c === ',' && depth === 0) { args.push(cur); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim() !== '' || args.length) args.push(cur);
    return args.map(function (a) { return a.trim(); });
  }
  // Replaces every call to `name`, innermost first. fn(args, whole) returns the new text, or null to leave it.
  function replaceCalls(code, name, fn) {
    var re = new RegExp('\\b' + name + '\\s*\\(', 'gi'), starts = [], m;
    while ((m = re.exec(code))) starts.push({ at: m.index, open: m.index + m[0].length - 1 });
    for (var s = starts.length - 1; s >= 0; s--) {
      var st = starts[s], depth = 0, end = -1;
      for (var i = st.open; i < code.length; i++) {
        if (code[i] === '(') depth++;
        else if (code[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) continue;
      var whole = code.slice(st.at, end + 1);
      var rep = fn(splitArgs(code.slice(st.open + 1, end)), whole);
      if (rep != null) code = code.slice(0, st.at) + rep + code.slice(end + 1);
    }
    return code;
  }

  function translate(sql, target) {
    if (!TARGETS[target]) throw new Error('Unknown database: ' + target);
    var changes = [], warnings = [];
    function change(msg) { if (changes.indexOf(msg) === -1) changes.push(msg); }
    function warn(msg) { if (warnings.indexOf(msg) === -1) warnings.push(msg); }

    var masked = mask(String(sql).trim()), store = masked.store, code = masked.code;
    var T = TARGETS[target];

    // --- dates: julianday(a) - julianday(b) -> days between two dates ---
    var jd = /julianday\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*-\s*julianday\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi;
    code = code.replace(jd, function (m, later, earlier) {
      later = later.trim(); earlier = earlier.trim();
      change('Days between two dates: SQLite subtracts two julianday() values. ' + {
        pg: 'PostgreSQL subtracts the dates directly.',
        mssql: 'SQL Server uses DATEDIFF(day, earlier, later), with the earlier date first.',
        bq: 'BigQuery uses DATE_DIFF(later, earlier, DAY), with the later date first.',
        sf: 'Snowflake uses DATEDIFF(day, earlier, later), with the earlier date first.'
      }[target]);
      return {
        pg: '(CAST(' + later + ' AS DATE) - CAST(' + earlier + ' AS DATE))',
        mssql: 'DATEDIFF(day, ' + earlier + ', ' + later + ')',
        bq: 'DATE_DIFF(' + later + ', ' + earlier + ', DAY)',
        sf: 'DATEDIFF(day, ' + earlier + ', ' + later + ')'
      }[target];
    });
    if (/\bjulianday\s*\(/i.test(code)) warn('julianday() on its own is SQLite only. Rewrite it as a difference between two dates.');

    // --- dates: strftime(format, date) ---
    code = replaceCalls(code, 'strftime', function (a) {
      var fmt = textValue(a[0], store), d = a[1];
      if (fmt == null || a.length !== 2) { warn('This strftime() format is not translated. Check the date formatting by hand.'); return null; }
      var part = { '%Y': 'YEAR', '%m': 'MONTH', '%d': 'DAY', '%H': 'HOUR' }[fmt];
      if (part) {
        change('Part of a date: SQLite uses strftime(\'' + fmt + '\', date), which gives text. ' + T + (target === 'mssql' ? ' uses ' + part + '(date)' : ' uses EXTRACT(' + part + ' FROM date)') + ', which gives a number.');
        return target === 'mssql' ? (part === 'HOUR' ? 'DATEPART(hour, ' + d + ')' : part + '(' + d + ')') : 'EXTRACT(' + part + ' FROM ' + d + ')';
      }
      if (fmt === '%Y-%m-01') {
        change('First day of the month: ' + {
          pg: "PostgreSQL uses DATE_TRUNC('month', date).",
          mssql: 'SQL Server 2022 and later use DATETRUNC(month, date). Older versions use DATEFROMPARTS(YEAR(d), MONTH(d), 1).',
          bq: 'BigQuery uses DATE_TRUNC(date, MONTH), with the date first.',
          sf: "Snowflake uses DATE_TRUNC('month', date)."
        }[target]);
        return { pg: "DATE_TRUNC('month', " + d + ')', mssql: 'DATETRUNC(month, ' + d + ')', bq: 'DATE_TRUNC(' + d + ', MONTH)', sf: "DATE_TRUNC('month', " + d + ')' }[target];
      }
      if (fmt === '%Y-%m') {
        change('Year and month as text: ' + T + ' formats dates with ' + { pg: 'TO_CHAR', mssql: 'FORMAT', bq: 'FORMAT_DATE', sf: 'TO_CHAR' }[target] + '.');
        return { pg: "TO_CHAR(" + d + ", 'YYYY-MM')", mssql: "FORMAT(" + d + ", 'yyyy-MM')", bq: "FORMAT_DATE('%Y-%m', " + d + ')', sf: "TO_CHAR(" + d + ", 'YYYY-MM')" }[target];
      }
      if (fmt === '%Y-%m-%d') {
        change('Date without the time: ' + T + ' uses CAST(value AS DATE).');
        return 'CAST(' + d + ' AS DATE)';
      }
      warn("The strftime('" + fmt + "', ...) format is not translated. Check the date formatting by hand.");
      return null;
    });

    // --- dates: date(...) ---
    code = replaceCalls(code, 'date', function (a, whole) {
      if (a.length === 1) {
        var only = textValue(a[0], store);
        if (only && only.toLowerCase() === 'now') {
          change("Today's date: SQLite uses date('now'). " + T + ' uses ' + { pg: 'CURRENT_DATE', mssql: 'CAST(GETDATE() AS DATE)', bq: 'CURRENT_DATE()', sf: 'CURRENT_DATE()' }[target] + '.');
          return { pg: 'CURRENT_DATE', mssql: 'CAST(GETDATE() AS DATE)', bq: 'CURRENT_DATE()', sf: 'CURRENT_DATE()' }[target];
        }
        if (a[0] === '') return null;
        change('Turning a value into a date: ' + T + ' uses CAST(value AS DATE).');
        return 'CAST(' + a[0] + ' AS DATE)';
      }
      if (a.length === 2) {
        var mod = textValue(a[1], store), m = mod && /^\s*([+-]?)\s*(\d+)\s+(day|month|year)s?\s*$/i.exec(mod);
        if (!m) { warn('This date() modifier is not translated. Check the date maths by hand.'); return null; }
        var n = (m[1] === '-' ? '-' : '') + m[2], unit = m[3].toLowerCase(), d = a[0];
        if (textValue(d, store) === 'now') d = { pg: 'CURRENT_DATE', mssql: 'CAST(GETDATE() AS DATE)', bq: 'CURRENT_DATE()', sf: 'CURRENT_DATE()' }[target];
        change('Adding to a date: ' + {
          pg: "PostgreSQL adds an INTERVAL, for example + INTERVAL '7 days'.",
          mssql: 'SQL Server uses DATEADD(unit, number, date), with the unit first.',
          bq: 'BigQuery uses DATE_ADD(date, INTERVAL number UNIT), with the date first.',
          sf: 'Snowflake uses DATEADD(unit, number, date), with the unit first.'
        }[target]);
        return {
          pg: '(CAST(' + d + " AS DATE) + INTERVAL '" + n + ' ' + unit + "s')",
          mssql: 'DATEADD(' + unit + ', ' + n + ', ' + d + ')',
          bq: 'DATE_ADD(' + d + ', INTERVAL ' + n + ' ' + unit.toUpperCase() + ')',
          sf: 'DATEADD(' + unit + ', ' + n + ', ' + d + ')'
        }[target];
      }
      return null;
    });

    // --- text: length ---
    if (target === 'mssql' && /\bLENGTH\s*\(/i.test(code)) {
      code = code.replace(/\bLENGTH(\s*\()/gi, 'LEN$1');
      change('Length of text: SQL Server calls it LEN, not LENGTH. LEN ignores spaces at the end.');
    }

    // --- text: substring ---
    if (target === 'mssql') {
      code = replaceCalls(code, 'substr', function (a) {
        change('Part of a text value: SQL Server calls it SUBSTRING, and always needs the length.');
        if (a.length === 2) { warn('SQL Server needs a length in SUBSTRING. A large number was added: check it suits your data.'); return 'SUBSTRING(' + a[0] + ', ' + a[1] + ', 8000)'; }
        return 'SUBSTRING(' + a.join(', ') + ')';
      });
    }

    // --- text: combining many rows into one value ---
    code = replaceCalls(code, 'group_concat', function (a) {
      var expr = a[0], sep = a[1] || "','";
      var distinct = /^DISTINCT\s+/i.test(expr);
      if (distinct && a.length > 1) warn('SQLite does not allow DISTINCT with a separator, so this query would fail here.');
      if (distinct && target === 'mssql') {
        warn('SQL Server\'s STRING_AGG has no DISTINCT. Remove duplicates first, for example in a subquery with SELECT DISTINCT.');
        expr = expr.replace(/^DISTINCT\s+/i, '');
      }
      var fn = target === 'sf' ? 'LISTAGG' : 'STRING_AGG';
      change('Combining values from many rows: SQLite calls it GROUP_CONCAT. ' + T + ' calls it ' + fn + ' and needs the separator written out.');
      return fn + '(' + expr + ', ' + sep + ')';
    });

    // --- missing values ---
    if ((target === 'pg' || target === 'mssql') && /\bIFNULL\s*\(/i.test(code)) {
      code = code.replace(/\bIFNULL(\s*\()/gi, 'COALESCE$1');
      change('Replacing NULL: ' + T + ' has no IFNULL. COALESCE does the same job and works everywhere.');
    }

    // --- joining text with || ---
    if (target === 'mssql' && /\|\|/.test(code)) {
      code = code.replace(/\s*\|\|\s*/g, ' + ');
      change('Joining text: SQL Server uses + instead of ||.');
      warn('In SQL Server, if any part joined with + is NULL, the whole result is NULL. CONCAT(a, b) treats NULL as empty text instead.');
    }

    // --- data types in CAST ---
    if (target === 'bq') {
      code = code.replace(/(\bAS\s+)(INTEGER|INT)\b/gi, function (m, as) { change('Whole-number type: BigQuery calls it INT64.'); return as + 'INT64'; });
      code = code.replace(/(\bAS\s+)(REAL|FLOAT|DOUBLE)\b/gi, function (m, as) { change('Decimal type: BigQuery calls it FLOAT64.'); return as + 'FLOAT64'; });
      code = code.replace(/(\bAS\s+)TEXT\b/gi, function (m, as) { change('Text type: BigQuery calls it STRING.'); return as + 'STRING'; });
    } else if (target === 'mssql') {
      code = code.replace(/(\bAS\s+)REAL\b/gi, function (m, as) { change('Decimal type: SQL Server\'s REAL is less precise than SQLite\'s, so FLOAT is used.'); return as + 'FLOAT'; });
      code = code.replace(/(\bAS\s+)TEXT\b/gi, function (m, as) { change('Text type: SQL Server uses VARCHAR.'); return as + 'VARCHAR(255)'; });
    } else if (target === 'pg') {
      code = code.replace(/(\bAS\s+)REAL\b/gi, function (m, as) { change('Decimal type: PostgreSQL\'s REAL is less precise than SQLite\'s, so DOUBLE PRECISION is used.'); return as + 'DOUBLE PRECISION'; });
    }

    // --- case-insensitive LIKE ---
    if (/\bLIKE\b/i.test(code)) {
      if (target === 'pg' || target === 'sf') {
        code = code.replace(/\bLIKE\b/gi, 'ILIKE');
        change('Matching text: SQLite\'s LIKE ignores upper and lower case. In ' + T + ' LIKE is case-sensitive, so ILIKE keeps the same result.');
      } else if (target === 'bq') {
        warn('In BigQuery, LIKE is case-sensitive. SQLite ignores case. To match the same rows, compare LOWER(column) with a lower-case pattern.');
      }
    }

    // --- quoted names ---
    if (target === 'bq' && /\u0001Q\d+\u0001/.test(code)) {
      code = code.replace(/\u0001Q(\d+)\u0001/g, function (m, n) { return '`' + store[+n].slice(1, -1) + '`'; });
      change('Quoted names: BigQuery uses backticks for table and column names. Double quotes make text.');
    }

    // --- dividing ---
    var decimalAlready = /\*\s*1\.0\b|\b1\.0\s*\*|\bAS\s+(REAL|FLOAT|FLOAT64|DOUBLE|NUMERIC|DECIMAL)\b/i.test(code);
    if (/[^\/*-]\/[^\/*]/.test(code) && !decimalAlready && (target === 'bq' || target === 'sf')) {
      warn('Dividing: in SQLite, a whole number divided by a whole number gives a whole number (7 / 2 = 3). In ' + T + ' it gives a decimal (3.5)' + (target === 'bq' ? '. Use DIV(a, b) for whole-number division.' : '. Use FLOOR(a / b) for whole-number division.'));
    }

    // --- UNION: BigQuery wants DISTINCT or ALL written out ---
    if (target === 'bq' && /\bUNION\b(?!\s+(ALL|DISTINCT)\b)/i.test(code)) {
      code = code.replace(/\bUNION\b(?!\s+(ALL|DISTINCT)\b)/gi, 'UNION DISTINCT');
      change('UNION: BigQuery needs UNION DISTINCT or UNION ALL written out. A plain UNION removes duplicates, so it becomes UNION DISTINCT.');
    }

    // --- GROUP BY / ORDER BY with positions ---
    if (target === 'mssql' && /\bGROUP\s+BY\s+\d/i.test(code)) {
      warn('SQL Server does not allow GROUP BY with a column number. Write the column name instead.');
    }

    // --- LIMIT ---
    var lim = /\s*\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?\s*(;?)\s*$/i.exec(code);
    if (lim && target === 'mssql') {
      var body = code.slice(0, lim.index);
      if (lim[2]) {
        if (/\bORDER\s+BY\b/i.test(body)) {
          code = body + '\nOFFSET ' + lim[2] + ' ROWS FETCH NEXT ' + lim[1] + ' ROWS ONLY' + lim[3];
          change('Skipping and limiting rows: SQL Server uses OFFSET ... ROWS FETCH NEXT ... ROWS ONLY, after ORDER BY.');
        } else warn('SQL Server needs ORDER BY before OFFSET. Add one, then use OFFSET ... ROWS FETCH NEXT ... ROWS ONLY.');
      } else {
        // put TOP after the last SELECT that is not inside brackets (the main query)
        var depth = 0, at = -1, re = /\(|\)|\bSELECT\b(\s+DISTINCT\b)?/gi, mm;
        while ((mm = re.exec(body))) {
          if (mm[0] === '(') depth++;
          else if (mm[0] === ')') depth--;
          else if (depth === 0) at = mm.index + mm[0].length;
        }
        if (at !== -1) {
          code = body.slice(0, at) + ' TOP ' + lim[1] + body.slice(at) + lim[3];
          change('Limiting rows: SQL Server puts TOP ' + lim[1] + ' right after SELECT instead of LIMIT at the end.');
        }
      }
    }
    if (target === 'mssql' && /\bLIMIT\s+\d/i.test(code)) warn('SQL Server has no LIMIT. A LIMIT inside a subquery needs rewriting with TOP.');

    // --- features SQLite allows that others may not ---
    if (/\bIIF\s*\(/i.test(code) && (target === 'pg' || target === 'bq')) warn('IIF() does not exist in ' + T + '. Use CASE WHEN ... THEN ... ELSE ... END.');
    if (/\bTOTAL\s*\(/i.test(code)) warn('TOTAL() is SQLite only. Use SUM(), and COALESCE(SUM(x), 0) if you want 0 instead of NULL.');

    var out = unmask(code, store);
    return { sql: out, changes: changes, warnings: warnings, target: T };
  }

  window.SQLTranslate = { translate: translate, TARGETS: TARGETS };
})();
