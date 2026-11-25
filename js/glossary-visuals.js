// Small pictures for glossary terms, shown inside the term's Example section.
// Each entry is keyed by the term id and returns HTML. Tables are real tables (readable by screen readers);
// charts are SVG with a text description. Colours come from the site's own variables, so light and dark both work.
(function () {
  'use strict';

  // A tiny table. rows: arrays of cells; mark: { rowIndex: 'new' | 'kept' | 'gone' } highlights a row.
  function mini(title, cols, rows, mark) {
    mark = mark || {};
    return '<table class="vis-t"><caption>' + title + '</caption><thead><tr>' +
      cols.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr' + (mark[i] ? ' class="vis-' + mark[i] + '"' : '') + '>' +
          r.map(function (c) { return c === null ? '<td class="vis-null">NULL</td>' : '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  function arrow(label) { return '<div class="vis-arrow" aria-hidden="true"><span>' + label + '</span></div>'; }
  function note(t) { return '<p class="vis-note">' + t + '</p>'; }
  function flow(left, label, right) { return '<div class="vis-flow">' + left + arrow(label) + right + '</div>'; }
  // SVG pieces for diagrams
  function box(x, y, w, h, title, sub, cls) {
    return '<g class="vis-box' + (cls ? ' ' + cls : '') + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8"/>' +
      '<text class="vis-box-t" x="' + (x + w / 2) + '" y="' + (y + (sub ? h / 2 - 3 : h / 2 + 5)) + '" text-anchor="middle">' + title + '</text>' +
      (sub ? '<text class="vis-box-s" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 14) + '" text-anchor="middle">' + sub + '</text>' : '') + '</g>';
  }
  function link(x1, y1, x2, y2, cls) { return '<line class="vis-link' + (cls ? ' ' + cls : '') + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>'; }
  function svg(w, h, label, body) { return '<svg class="vis-svg vis-diagram" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + label + '"><defs><marker id="vis-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="vis-head"/></marker></defs>' + body + '</svg>'; }
  var CUST = mini('customers', ['customer_id', 'name'], [['c1', 'Thandi'], ['c2', 'Sipho'], ['c3', 'Ayesha']]);
  var ORDS = mini('orders', ['order_id', 'customer_id'], [['o1', 'c1'], ['o2', 'c1'], ['o3', 'c2']]);

  window.GLOSSARY_VISUALS = {
    'inner-join': function () {
      return flow('<div class="vis-pair">' + mini('customers', ['customer_id', 'name'], [['c1', 'Thandi'], ['c2', 'Sipho'], ['c3', 'Ayesha']], { 2: 'gone' }) + ORDS + '</div>', 'INNER JOIN',
        mini('result', ['customer_id', 'name', 'order_id'], [['c1', 'Thandi', 'o1'], ['c1', 'Thandi', 'o2'], ['c2', 'Sipho', 'o3']])) +
        note('Only rows with a match on both sides survive. Ayesha has no orders, so she disappears from the result. Use a LEFT JOIN when she should stay.');
    },

    'anti-join': function () {
      return flow('<div class="vis-pair">' + mini('customers', ['customer_id', 'name'], [['c1', 'Thandi'], ['c2', 'Sipho'], ['c3', 'Ayesha']], { 2: 'kept' }) + ORDS + '</div>', 'NOT EXISTS',
        mini('result', ['customer_id', 'name'], [['c3', 'Ayesha']], { 0: 'kept' })) +
        note('An anti-join keeps only the rows with <em>no</em> match: here, the one customer who has never ordered. The same idea finds products that never sold.');
    },

    'fan-out': function () {
      return flow('<div class="vis-pair">' + mini('order_payments', ['order_id', 'payment_value'], [['o1', 'R300']]) +
        mini('order_items', ['order_id', 'item'], [['o1', 'kettle'], ['o1', 'toaster']]) + '</div>', 'JOIN',
        '<div class="vis-pair">' + mini('result', ['order_id', 'item', 'payment_value'], [['o1', 'kettle', 'R300'], ['o1', 'toaster', 'R300']], { 0: 'kept', 1: 'kept' }) +
        '<p class="vis-sum">SUM(payment_value) = <strong class="vis-bad">R600</strong>, but the customer paid R300.</p></div>') +
        note('One payment matched two items, so the R300 appears on both highlighted rows. Summing after the join counts it twice. Sum each table at its own grain first, then join.');
    },

    'group-by': function () {
      return flow(mini('orders', ['order_id', 'order_status'], [['o1', 'delivered'], ['o2', 'delivered'], ['o3', 'cancelled'], ['o4', 'delivered'], ['o5', 'shipped']], { 0: 'kept', 1: 'kept', 3: 'kept' }),
        'GROUP BY', mini('result', ['order_status', 'orders'], [['delivered', '3'], ['cancelled', '1'], ['shipped', '1']], { 0: 'kept' })) +
        note('Five rows fold into one row per status. The three highlighted delivered orders become the single row <code>delivered, 3</code>.');
    },

    'window-function': function () {
      return flow(mini('orders', ['order_id', 'customer_id'], [['o1', 'c1'], ['o2', 'c1'], ['o3', 'c1'], ['o4', 'c2']]), 'ROW_NUMBER() OVER',
        mini('result', ['order_id', 'customer_id', 'nth_order'], [['o1', 'c1', '1'], ['o2', 'c1', '2'], ['o3', 'c1', '3'], ['o4', 'c2', '1']], { 0: 'new', 1: 'new', 2: 'new', 3: 'new' })) +
        note('Every row stays, and a new column is added beside it. That is the difference from GROUP BY, which would fold c1\'s three orders into one row. The count restarts for each customer because of PARTITION BY.');
    },

    'ranking-functions': function () {
      return mini('Four sellers ranked by rating', ['seller', 'rating', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'],
        [['S1', '4.9', '1', '1', '1'], ['S2', '4.7', '2', '2', '2'], ['S3', '4.7', '3', '2', '2'], ['S4', '4.5', '4', '4', '3']], { 1: 'kept', 2: 'kept' }) +
        note('S2 and S3 tie. ROW_NUMBER still gives them different numbers. RANK gives both 2, then skips to 4. DENSE_RANK gives both 2, then carries on with 3.');
    },

    'star-schema': function () {
      var W = 480, H = 230, cx = 240, cy = 115;
      var body = link(160, 60, 165, 83) + link(320, 60, 315, 83) + link(160, 170, 165, 147) + link(320, 170, 315, 147) +
        box(cx - 75, cy - 32, 150, 64, 'fact_sales', 'one row per sale', 'vis-main') +
        box(20, 22, 140, 46, 'dim_date') + box(320, 22, 140, 46, 'dim_customer') + box(20, 162, 140, 46, 'dim_product') + box(320, 162, 140, 46, 'dim_seller');
      return svg(W, H, 'A star schema: fact_sales in the middle, linked to four dimension tables: dim_date, dim_customer, dim_product and dim_seller.', body) +
        note('The fact table holds the numbers (quantity, revenue) and a key for each dimension. The dimensions hold the descriptions you filter and group by. Every query is the fact table plus the dimensions it needs.');
    },

    'scd': function () {
      return mini('dim_customer', ['customer_key', 'customer_id', 'city', 'valid_from', 'valid_to'],
        [['101', 'C001', 'Curitiba', '2024-01-01', '2025-06-30'], ['188', 'C001', 'Sao Paulo', '2025-07-01', 'current']], { 1: 'new' }) +
        note('When the customer moves, the old row is closed with an end date and a new row is added. Sales before July 2025 still point to row 101, so history reports the city as it was at the time.');
    },

    'medallion': function () {
      var y = 30, h = 92, w = 126;
      var body = box(12, y, w, h, 'Raw', 'as it arrived') + box(177, y, w, h, 'Staging', 'cleaned, typed') + box(342, y, w, h, 'Marts', 'ready for people', 'vis-main') +
        '<line class="vis-link vis-arrowed" x1="140" y1="76" x2="173" y2="76" marker-end="url(#vis-head)"/>' +
        '<line class="vis-link vis-arrowed" x1="305" y1="76" x2="338" y2="76" marker-end="url(#vis-head)"/>' +
        '<text class="vis-lbl" x="75" y="146" text-anchor="middle">bronze</text><text class="vis-lbl" x="240" y="146" text-anchor="middle">silver</text><text class="vis-lbl" x="405" y="146" text-anchor="middle">gold</text>';
      return svg(480, 160, 'Three layers left to right: Raw, also called bronze, kept as it arrived; Staging, or silver, cleaned and typed; Marts, or gold, ready for people.', body) +
        note('Each layer has one job. If a number looks wrong in a mart, you can trace it back through staging to the exact raw file it came from.');
    },

    'simpsons-paradox': function () {
      return mini('On-time deliveries by courier', ['Courier', 'Cities', 'Rural towns', 'Overall'],
        [['Courier A', '81 of 87 <b>93%</b>', '192 of 263 <b>73%</b>', '273 of 350 <b class="vis-bad">78%</b>'],
         ['Courier B', '234 of 270 <b>87%</b>', '55 of 80 <b>69%</b>', '289 of 350 <b>83%</b>']], { 0: 'kept' }) +
        note('Courier A is better in cities <em>and</em> in rural towns, yet looks worse overall. That is because A takes most of the hard rural deliveries. Always check whether the mix of groups differs before comparing totals.');
    },

    'funnel': function () {
      var steps = [['Visits', 10000, ''], ['Basket', 1200, '12%'], ['Checkout', 600, '50%'], ['Paid', 420, '70%']];
      var body = steps.map(function (st, i) {
        var w = Math.max(18, 340 * st[1] / 10000), y = 12 + i * 40;
        return '<text class="vis-lbl" x="80" y="' + (y + 19) + '" text-anchor="end">' + st[0] + '</text>' +
          '<rect class="vis-bar' + (i === 3 ? ' vis-bar-end' : '') + '" x="90" y="' + y + '" width="' + w.toFixed(1) + '" height="26" rx="4"/>' +
          '<text class="vis-lbl vis-val" x="' + (96 + w) + '" y="' + (y + 18) + '">' + st[1].toLocaleString('en-GB') + (st[2] ? '  (' + st[2] + ' of the step before)' : '') + '</text>';
      }).join('');
      return svg(480, 172, 'A funnel: 10,000 visits, 1,200 add to basket (12%), 600 reach checkout (50% of those), 420 pay (70% of those).', body) +
        note('The biggest drop is the first one: only 12% of visits add anything to a basket. Fixing that step moves the final number most.');
    },

    'skewness': function () {
      var bars = [2, 9, 14, 12, 8, 5, 3, 2, 1, 1, 1], L = 30, bw = 36;
      var body = bars.map(function (v, i) { return '<rect class="vis-bar" x="' + (L + i * bw + 3) + '" y="' + (130 - v * 8) + '" width="' + (bw - 6) + '" height="' + (v * 8) + '" rx="3"/>'; }).join('') +
        '<line class="vis-axis" x1="' + L + '" x2="' + (L + bars.length * bw) + '" y1="130" y2="130"/>' +
        '<line class="vis-median" x1="' + (L + 2.6 * bw) + '" x2="' + (L + 2.6 * bw) + '" y1="10" y2="130"/><text class="vis-lbl vis-lbl-median" x="' + (L + 2.6 * bw - 6) + '" y="18" text-anchor="end">median</text>' +
        '<line class="vis-mean" x1="' + (L + 3.6 * bw) + '" x2="' + (L + 3.6 * bw) + '" y1="10" y2="130"/><text class="vis-lbl vis-lbl-mean" x="' + (L + 3.6 * bw + 6) + '" y="18">mean</text>' +
        '<text class="vis-lbl" x="' + (L + 9 * bw) + '" y="100" text-anchor="middle">long tail</text>' +
        '<text class="vis-lbl" x="' + (L + bars.length * bw / 2) + '" y="150" text-anchor="middle">order value</text>';
      return svg(470, 160, 'A right-skewed histogram of order values: most orders are small, with a long tail of large orders to the right. The mean sits to the right of the median.', body) +
        note('Most orders are small, a few are very large. The long tail on the right pulls the mean above the median, which is why medians are often the fairer summary.');
    },

    'schema-drift': function () {
      return flow(mini('orders_2025-11-14.csv', ['order_id', 'status'], [['O101', 'shipped']]), 'next day',
        mini('orders_2025-11-15.csv', ['order_id', 'status', 'delivery_method'], [['O102', 'processing', 'express']], { 0: 'new' })) +
        note('The source added a column without warning. A pipeline that matches columns by position breaks or puts values in the wrong place. One that matches by name can add the new column and keep going.');
    },

    'left-join': function () {
      return '<div class="vis-flow">' +
        '<div class="vis-pair">' +
          mini('customers', ['customer_id', 'name'], [['c1', 'Thandi'], ['c2', 'Sipho'], ['c3', 'Ayesha']]) +
          mini('orders', ['order_id', 'customer_id'], [['o1', 'c1'], ['o2', 'c1'], ['o3', 'c2']]) +
        '</div>' +
        arrow('LEFT JOIN') +
        mini('result', ['customer_id', 'name', 'order_id'], [['c1', 'Thandi', 'o1'], ['c1', 'Thandi', 'o2'], ['c2', 'Sipho', 'o3'], ['c3', 'Ayesha', null]], { 3: 'kept' }) +
        '</div>' +
        '<p class="vis-note">Every customer is kept. Ayesha has no orders, so her order columns are NULL. That highlighted row is exactly what <code>WHERE o.order_id IS NULL</code> finds.</p>';
    },

    'mean-vs-median': function () {
      var vals = [3, 4, 4, 5, 40], mean = 11.2, median = 4;
      var L = 24, R = 456, x = function (v) { return L + (R - L) * v / 42; };
      var dots = vals.map(function (v, i) {
        var dup = vals.slice(0, i).filter(function (w) { return w === v; }).length;
        return '<circle class="vis-dot" cx="' + x(v).toFixed(1) + '" cy="' + (78 - dup * 14) + '" r="6"/>';
      }).join('');
      var ticks = [0, 10, 20, 30, 40].map(function (t) {
        return '<line class="vis-axis" x1="' + x(t) + '" x2="' + x(t) + '" y1="92" y2="97"/><text class="vis-lbl" x="' + x(t) + '" y="112" text-anchor="middle">' + t + '</text>';
      }).join('');
      return '<svg class="vis-svg" viewBox="0 0 480 150" role="img" aria-label="Five delivery times on a line from 0 to 40 days: 3, 4, 4, 5 and 40. The median sits at 4 days, among the cluster. The mean sits at 11.2 days, pulled right by the single 40-day delivery.">' +
        '<line class="vis-axis" x1="' + L + '" x2="' + R + '" y1="92" y2="92"/>' + ticks +
        '<line class="vis-median" x1="' + x(median) + '" x2="' + x(median) + '" y1="20" y2="92"/>' +
        '<text class="vis-lbl vis-lbl-median" x="' + (x(median) + 6) + '" y="24">median 4</text>' +
        '<line class="vis-mean" x1="' + x(mean) + '" x2="' + x(mean) + '" y1="38" y2="92"/>' +
        '<text class="vis-lbl vis-lbl-mean" x="' + (x(mean) + 6) + '" y="42">mean 11.2</text>' +
        dots +
        '<text class="vis-lbl" x="' + (x(40) + 8) + '" y="58" text-anchor="end">one slow delivery</text>' +
        '<text class="vis-lbl" x="' + ((L + R) / 2) + '" y="140" text-anchor="middle">delivery days</text>' +
        '</svg>' +
        '<p class="vis-note">Four deliveries take 3 to 5 days. One takes 40. That single outlier drags the mean to 11.2 days, while the median stays at 4, where most deliveries actually are.</p>';
    },

    'boolean-mask': function () {
      return flow(mini('orders, with the mask', ['order_id', 'days', 'days &gt; 5'], [['o1', '3', 'False'], ['o2', '8', 'True'], ['o3', '6', 'True'], ['o4', '4', 'False']], { 1: 'kept', 2: 'kept' }),
        'orders[late]', mini('late orders', ['order_id', 'days'], [['o2', '8'], ['o3', '6']], { 0: 'kept', 1: 'kept' })) +
        note('The comparison gives one True or False per row. Only the True rows are kept. <code>late.sum()</code> is 2 and <code>late.mean()</code> is 0.5: half the orders were late.');
    },

    'pandas-merge': function () {
      return flow('<div class="vis-pair">' + mini('orders', ['order_id', 'customer_id'], [['o1', 'c1'], ['o2', 'c2'], ['o3', 'c9']], { 2: 'kept' }) + CUST + '</div>', 'how="left", indicator=True',
        mini('result', ['order_id', 'name', '_merge'], [['o1', 'Thandi', 'both'], ['o2', 'Sipho', 'both'], ['o3', 'NaN', 'left_only']], { 2: 'kept' })) +
        note('A left merge keeps every order. Customer c9 is not in the customers table, so order o3 keeps an empty name, and <code>_merge</code> says <code>left_only</code>, so you can count the rows that did not match.');
    },

    'concat': function () {
      return flow('<div class="vis-pair">' + mini('monday', ['order_id', 'total'], [['o1', 'R120'], ['o2', 'R80']]) +
        mini('tuesday', ['order_id', 'total', 'method'], [['o3', 'R45', 'express']], { 0: 'new' }) + '</div>', 'pd.concat',
        mini('week', ['order_id', 'total', 'method'], [['o1', 'R120', 'NaN'], ['o2', 'R80', 'NaN'], ['o3', 'R45', 'express']], { 2: 'new' })) +
        note('The rows are stacked: 2 + 1 = 3. Tuesday has a new <code>method</code> column, so Monday\'s rows get empty values there. Check for gaps like this after every combine.');
    }
  };
})();
