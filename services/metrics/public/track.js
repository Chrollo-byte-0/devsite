/*! Tracker de visitas sin cookies. Uso:
 *  <script defer src="https://metrics.tudominio.com/track.js"></script>
 * Soporta navegación SPA (pushState). Respeta Do Not Track.
 */
(function () {
  var script = document.currentScript;
  var endpoint = (script && script.getAttribute('data-endpoint')) ||
    new URL('/api/collect', script && script.src).href;
  var last = null;

  function send() {
    if (navigator.doNotTrack === '1') return;
    var url = location.href;
    if (url === last) return;
    var referrer = last || document.referrer;
    last = url;
    var data = JSON.stringify({ url: url, referrer: referrer });
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, data);
    else fetch(endpoint, { method: 'POST', body: data, keepalive: true });
  }

  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    setTimeout(send, 0);
  };
  addEventListener('popstate', send);
  send();
})();
