(function () {
  "use strict";

  var API = "/api/track";
  var VID_KEY = "th_vid";
  var UTM_KEY = "th_utm";
  var SCROLL_KEY_PREFIX = "th_scroll_";

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "vid-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function getVid() {
    try {
      var v = localStorage.getItem(VID_KEY);
      if (!v) {
        v = uuid();
        localStorage.setItem(VID_KEY, v);
      }
      return v;
    } catch (e) {
      return uuid();
    }
  }

  function getStoredUtm() {
    try {
      return JSON.parse(localStorage.getItem(UTM_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var incoming = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      fbclid: params.get("fbclid"),
      gclid: params.get("gclid"),
    };

    var hasIncoming = Object.keys(incoming).some(function (k) {
      return !!incoming[k];
    });

    var stored = getStoredUtm();
    var merged = hasIncoming ? incoming : stored;

    if (hasIncoming) {
      try {
        localStorage.setItem(UTM_KEY, JSON.stringify(incoming));
      } catch (e) {}
    }

    return merged;
  }

  function send(eventName, meta) {
    var vid = getVid();
    var utm = captureUtm();

    var payload = {
      vid: vid,
      eventName: eventName,
      page: window.location.pathname,
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      utm_content: utm.utm_content || null,
      utm_term: utm.utm_term || null,
      fbclid: utm.fbclid || null,
      gclid: utm.gclid || null,
      meta: meta || null,
    };

    try {
      var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      if (navigator.sendBeacon && navigator.sendBeacon(API, blob)) return;
    } catch (e) {}

    try {
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  // Append vid + click/UTM ids onto outbound CTA links so hashcal can carry them forward
  function decorateLink(href) {
    try {
      var url = new URL(href, window.location.href);
      var utm = captureUtm();
      url.searchParams.set("vid", getVid());
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach(function (k) {
        if (utm[k]) url.searchParams.set(k, utm[k]);
      });
      return url.toString();
    } catch (e) {
      return href;
    }
  }

  function ctaLabel(el) {
    var section = el.closest("section");
    if (section && section.className) return String(section.className).split(" ")[0];
    return "unknown-section";
  }

  function initCtaTracking() {
    document.addEventListener(
      "click",
      function (e) {
        var link = e.target.closest(".buttonLink");
        if (!link) return;

        send("cta_click", { label: ctaLabel(link) });

        var href = link.getAttribute("href");
        if (href && /^https?:\/\//i.test(href)) {
          link.setAttribute("href", decorateLink(href));
        }
      },
      true
    );
  }

  function initScrollTracking() {
    var thresholds = [25, 50, 75, 100];
    var fired = {};
    var ticking = false;

    function check() {
      ticking = false;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var pct = scrollable > 0 ? Math.min(100, Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100)) : 100;

      thresholds.forEach(function (t) {
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          send("scroll_depth", { depth: t });
        }
      });
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(check);
        }
      },
      { passive: true }
    );
  }

  function initDwellTracking() {
    var start = Date.now();
    var sent = false;

    function sendDwell() {
      if (sent) return;
      sent = true;
      var seconds = Math.round((Date.now() - start) / 1000);
      send("dwell_heartbeat", { seconds: seconds });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sendDwell();
    });
    window.addEventListener("pagehide", sendDwell);
  }

  function init() {
    send("lp_view");
    initCtaTracking();
    initScrollTracking();
    initDwellTracking();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
