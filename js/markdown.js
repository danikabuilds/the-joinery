// A small Markdown renderer for the project write-ups (projects/<id>/PROJECT.md).
// It handles what those files use: headings, paragraphs, lists, code blocks, tables, quotes,
// images, links, bold, italics, inline code and <details>/<summary> for hidden answers.
// Quotes that start with "**You should see:**", "**Tip:**" or "**From ...:**" get their own boxes.
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // base: the folder the .md lives in, so relative links and images work. site: the site's public address,
  // so links written as full site links stay inside the site.
  function inline(text, opt) {
    var codes = [];
    var s = text.replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
      return '<img src="' + esc(fixUrl(src, opt)) + '" alt="' + alt + '" loading="lazy">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      var u = fixUrl(url.replace(/&amp;/g, '&'), opt), external = /^https?:/.test(u);
      var download = /\.zip$/.test(u) ? ' download' : '';
      return '<a href="' + esc(u) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + download + '>' + label +
        (external ? '<span class="sr"> (opens in a new tab)</span>' : '') + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return '<code>' + esc(codes[+i]) + '</code>'; });
  }

  function fixUrl(url, opt) {
    if (opt.site && url.indexOf(opt.site) === 0) return url.slice(opt.site.length) || '#/home'; // a link to this site
    if (/^(https?:|#|mailto:)/.test(url)) return url;
    return (opt.base || '') + url;                                                            // relative to the .md file
  }

  function render(md, opt) {
    opt = opt || {};
    var lines = md.replace(/\r\n?/g, '\n').split('\n');
    var out = [], i = 0, seenLabels = {};

    function para(buf) { if (buf.length) out.push('<p>' + inline(buf.join(' '), opt) + '</p>'); }

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      var fence = /^```(\w*)\s*(.*)$/.exec(line);
      if (fence) {
        var code = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        var label = fence[2] || fence[1] || 'Code';
        out.push('<div class="pj-code"><div class="pj-code-head"><span>' + esc(label) + '</span><button type="button" class="pj-copy">Copy</button></div>' +
          '<pre tabindex="0" aria-label="' + esc(label) + '"><code>' + esc(code.join('\n')) + '</code></pre></div>');
        continue;
      }

      var h = /^(#{1,4})\s+(.*)$/.exec(line);
      if (h) { var n = h[1].length; out.push('<h' + n + '>' + inline(h[2], opt) + '</h' + n + '>'); i++; continue; }

      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^<details>\s*$/.test(line)) { out.push('<details class="pj-reveal">'); i++; continue; }
      if (/^<\/details>\s*$/.test(line)) { out.push('</div></details>'); i++; continue; }
      var sum = /^<summary>(.*)<\/summary>\s*$/.exec(line);
      if (sum) { out.push('<summary>' + inline(sum[1], opt) + '</summary><div class="pj-reveal-body">'); i++; continue; }

      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        var text = q.join(' '), m;
        if ((m = /^\*\*You should see:\*\*\s*(.*)$/.exec(text))) out.push('<div class="pj-check"><p class="pj-box-label">You should see</p><p>' + inline(m[1], opt) + '</p></div>');
        else if ((m = /^\*\*Tip:\*\*\s*(.*)$/.exec(text))) out.push('<div class="pj-note"><p><strong>Tip:</strong> ' + inline(m[1], opt) + '</p></div>');
        else if ((m = /^\*\*From ([^*]+):\*\*\s*(.*)$/.exec(text))) out.push('<div class="pj-brief"><p class="pj-box-label">From ' + esc(m[1]) + '</p><p>' + inline(m[2], opt) + '</p></div>');
        else out.push('<blockquote><p>' + inline(text, opt) + '</p></blockquote>');
        continue;
      }

      if (/^\|/.test(line)) {
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        var cells = function (r) { return r.replace(/^\||\|\s*$/g, '').split(/(?<!\\)\|/).map(function (c) { return c.trim().replace(/\\\|/g, '|'); }); };
        var head = cells(rows[0]), body = rows.slice(2).map(cells);
        var blankHead = head.every(function (c) { return !c; });
        var tlabel = 'Table: ' + (blankHead ? body.map(function (r) { return r[0]; }) : head).join(', ').replace(/[*`]/g, '');
        var seenN = (seenLabels[tlabel] = (seenLabels[tlabel] || 0) + 1);
        if (seenN > 1) tlabel += ' ' + seenN;
        out.push('<div class="pj-table-wrap" tabindex="0" role="region" aria-label="' + esc(tlabel) + '"><table class="pj-table">' +
          (blankHead ? '' : '<thead><tr>' + head.map(function (c) { return '<th scope="col">' + inline(c, opt) + '</th>'; }).join('') + '</tr></thead>') +
          '<tbody>' + body.map(function (r) {
            return '<tr>' + r.map(function (c, k) { return blankHead && k === 0 ? '<th scope="row">' + inline(c, opt) + '</th>' : '<td>' + inline(c, opt) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>');
        continue;
      }

      if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) { out.push('<figure class="pj-fig">' + inline(line.trim(), opt) + '</figure>'); i++; continue; }

      var bullet = /^(\s*)([-*]|\d+\.)\s+/.exec(line);
      if (bullet) {
        var ordered = /\d/.test(bullet[2]), items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')); i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) { items[items.length - 1] += ' ' + lines[i].trim(); i++; }
        }
        var tag = ordered ? 'ol' : 'ul';
        out.push('<' + tag + ' class="pj-list">' + items.map(function (it) { return '<li>' + inline(it, opt) + '</li>'; }).join('') + '</' + tag + '>');
        continue;
      }

      var buf = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(```|#{1,4}\s|>|\||<\/?details>|<summary>|---+\s*$|\s*([-*]|\d+\.)\s)/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
      para(buf);
    }
    return out.join('\n');
  }

  window.Markdown = { render: render };
})();
