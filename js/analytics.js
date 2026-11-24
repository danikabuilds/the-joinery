// Visitor counts with GoatCounter (https://www.goatcounter.com): free, open source, no cookies,
// and no personal data, so no cookie banner is needed. Only counts the live site: visits from your own
// computer (localhost or a file) are ignored.
//
// To change the account, change GOATCOUNTER_CODE to your site code. To turn counting off, set it to ''.
(function () {
  var GOATCOUNTER_CODE = 'thejoinery';
  var LIVE_HOST = 'thejoinery.dev';
  if (!GOATCOUNTER_CODE || location.hostname !== LIVE_HOST) return;

  // The site changes page with #/... links, so count each of those as a page view.
  window.goatcounter = { no_onload: true };
  function route() {
    var h = (location.hash || '#/home').replace(/^#/, '');
    // Group pages that are really one page: every term, every exercise and every project step
    // still has its own row, but the order of tests in the query string is dropped.
    return location.pathname + '#' + h.split('?')[0];
  }
  function count() {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: route(), title: document.title });
  }
  var last = '';
  function countOnce() { var p = route(); if (p !== last) { last = p; count(); } }
  window.addEventListener('hashchange', countOnce);

  // Project downloads are counted as events, so you can see which data people actually take.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$=".zip"]');
    if (a && window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'download: ' + a.getAttribute('href').split('/').pop(), title: 'Download', event: true });
    }
  });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://' + GOATCOUNTER_CODE + '.goatcounter.com/count');
  s.onload = countOnce;   // the first page someone lands on
  document.head.appendChild(s);
})();
