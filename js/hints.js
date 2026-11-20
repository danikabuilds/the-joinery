// Turns a wrong answer into specific, plain-language advice.
// Works from the learner's SQL text, the model answer and the two result sets.
(function (root) {
  // Removes comments and string contents so keyword checks do not trip over them.
  function clean(sql) {
    return String(sql || '')
      .replace(/--[^\n]*/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/'(?:[^']|'')*'/g, "''")
      .toUpperCase();
  }
  function literals(sql) {
    var out = [], m, re = /'((?:[^']|'')*)'/g, text = String(sql || '').replace(/--[^\n]*/g, ' ');
    while ((m = re.exec(text))) out.push(m[1]);
    return out;
  }
  function has(re, s) { return re.test(s); }
  var AGG = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/;

  // Friendly versions of the database's own error messages.
  function explainError(message) {
    var m;
    if (/misuse of aggregate/i.test(message)) {
      return 'An aggregate such as COUNT or SUM cannot go in WHERE, because WHERE runs before the groups exist. Group the rows with GROUP BY, then filter the totals with HAVING.';
    }
    if (/misuse of window function/i.test(message)) {
      return 'A window function cannot be used directly in WHERE. Calculate it in a CTE (WITH ... AS) first, then filter in the query that reads from the CTE.';
    }
    if ((m = message.match(/no such column: (.+)/i))) {
      return 'There is no column called ' + m[1] + ' here. Check the spelling against the Tables list, and check you are using the right table or alias.';
    }
    if ((m = message.match(/no such table: (.+)/i))) {
      return 'There is no table called ' + m[1] + '. The tables are listed on the left; check the spelling.';
    }
    if ((m = message.match(/ambiguous column name: (.+)/i))) {
      return 'The column ' + m[1] + ' exists in more than one table in your query. Put the table alias in front of it, for example o.' + m[1].split('.').pop() + '.';
    }
    if (/do not have the same number of result columns/i.test(message)) {
      return 'Each SELECT in a UNION must return the same number of columns, in the same order.';
    }
    if (/ORDER BY term does not match any column/i.test(message)) {
      return 'With UNION, ORDER BY can only use a column name from the first SELECT. Use that column\'s name or its alias.';
    }
    if (/incomplete input/i.test(message)) {
      return 'The query looks unfinished. Check for a missing closing bracket or a clause that was started but not completed.';
    }
    if ((m = message.match(/near "(.+?)": syntax error/i))) {
      return 'SQL could not read the query near "' + m[1] + '". Common causes: a missing comma between columns, an extra comma before FROM, unbalanced brackets, or a clause in the wrong order.';
    }
    if (/a GROUP BY clause is required before HAVING/i.test(message)) {
      return 'HAVING needs a GROUP BY before it, because it filters groups.';
    }
    return null;
  }

  // Common-mistake checks for a result that ran but did not match. Returns up to 3 tips.
  function diagnose(userSql, exercise, expected, actual) {
    var u = clean(userSql), s = clean(exercise.solution), tips = [];
    function add(t) { if (tips.indexOf(t) === -1) tips.push(t); }

    // Wrong comparison with NULL
    if (has(/(=|<>|!=)\s*NULL\b/, u)) {
      add('Nothing is ever equal to NULL, not even NULL. Use IS NULL or IS NOT NULL.');
    }
    // Text value typed with different capitalisation
    var sLits = literals(exercise.solution), uLits = literals(userSql);
    uLits.forEach(function (l) {
      if (sLits.indexOf(l) === -1 && sLits.some(function (x) { return x.toLowerCase() === l.toLowerCase(); })) {
        add('Text values must match exactly, including capital letters. Preview the table to see how the value is written.');
      }
    });
    // Filter on an aggregate
    if (has(/\bHAVING\b/, s) && !has(/\bHAVING\b/, u)) {
      add('This task filters on a total or a count. That kind of filter goes in HAVING, after GROUP BY.');
    }
    // Missing GROUP BY
    if (has(/\bGROUP BY\b/, s) && !has(/\bGROUP BY\b/, u) && !has(/\bOVER\s*\(/, u)) {
      add('The question needs one row per group, so the query needs a GROUP BY.');
    } else if (AGG.test(u) && !has(/\bGROUP BY\b/, u) && !has(/\bOVER\s*\(/, u) && expected.rows.length > 1 && actual.rows.length === 1) {
      add('You got a single row back. If the question needs one row per group, add a GROUP BY.');
    }
    // Join type
    if (has(/\bLEFT\s+(OUTER\s+)?JOIN\b/, s) && !has(/\bLEFT\s+(OUTER\s+)?JOIN\b/, u)) {
      add('An inner JOIN drops rows that have no match. This task needs those rows, so use LEFT JOIN.');
    }
    if (has(/\bLEFT\s+(OUTER\s+)?JOIN\b/, u) && has(/\bWHERE\b[^;]*\b\w+\.\w+\s*(=|>|<)\s*[\w']/, u) && !has(/\bIS\s+(NOT\s+)?NULL\b/, u) && actual.rows.length < expected.rows.length) {
      add('A WHERE condition on the right-hand table of a LEFT JOIN removes the unmatched rows again. Put that condition in the ON part instead.');
    }
    // UNION vs UNION ALL
    if (has(/\bUNION\s+ALL\b/, s) && has(/\bUNION\b(?!\s+ALL)/, u)) {
      add('UNION removes duplicate rows. This task keeps every row, so use UNION ALL.');
    } else if (has(/\bUNION\b(?!\s+ALL)/, s) && has(/\bUNION\s+ALL\b/, u)) {
      add('UNION ALL keeps duplicates. This task needs each value once, so use UNION.');
    }
    // DISTINCT
    if (has(/\bDISTINCT\b/, s) && !has(/\bDISTINCT\b/, u) && actual.rows.length > expected.rows.length) {
      add('You have more rows than expected, which usually means repeated values. DISTINCT removes them.');
    }
    // Sorting and limits
    if (exercise.ordered && !has(/\bORDER BY\b/, u)) {
      add('The task asks for a specific order, so the query needs an ORDER BY.');
    } else if (exercise.ordered && has(/\bORDER BY\b/, s)) {
      var sDesc = has(/\bDESC\b/, s), uDesc = has(/\bDESC\b/, u);
      if (sDesc !== uDesc) add('Check the sort direction: ' + (sDesc ? 'this one needs DESC (largest or newest first).' : 'this one needs ascending order (the default).'));
    }
    if (has(/\bLIMIT\b/, s) && !has(/\bLIMIT\b/, u) && actual.rows.length > expected.rows.length) {
      add('The task only wants the first few rows. LIMIT goes at the very end of the query.');
    }
    // Window functions
    if (has(/\bOVER\s*\(/, s) && !has(/\bOVER\s*\(/, u)) {
      add('This task needs a window function: a calculation followed by OVER (...), which keeps every row.');
    } else if (has(/\bPARTITION BY\b/, s) && !has(/\bPARTITION BY\b/, u) && has(/\bOVER\s*\(/, u)) {
      add('Without PARTITION BY, the window covers the whole table. Add PARTITION BY to restart the calculation for each group.');
    }
    // Rounding
    if (has(/\bROUND\s*\(/, s) && !has(/\bROUND\s*\(/, u)) {
      add('The task asks for rounded numbers. Wrap the calculation in ROUND(value, 2).');
    }
    // Row multiplication through joins
    if (has(/\bJOIN\b/, u) && actual.rows.length > expected.rows.length && !tips.length) {
      add('More rows than expected after a join often means one table has several rows for each row in the other. Check what one row in each table represents.');
    }
    return tips.slice(0, 3);
  }

  root.Hints = { explainError: explainError, diagnose: diagnose };
})(window);
