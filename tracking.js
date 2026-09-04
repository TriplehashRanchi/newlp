(function () {
  "use strict";

  var API = "/api/track";
  var VID_KEY = "th_vid";
  var UTM_KEY = "th_utm";

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

  var KNOWN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

  // Captures every query param present on landing, not just a fixed allowlist — so a new
  // platform's click id (ttclid, li_fat_id, msclkid, whatever comes next) is tracked without
  // needing a code change. Known keys still get pulled out into their own columns for filtering.
  function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var raw = {};
    params.forEach(function (value, key) {
      if (value) raw[key] = value;
    });

    var hasIncoming = Object.keys(raw).length > 0;
    var stored = getStoredUtm();
    var merged = hasIncoming ? raw : stored;

    if (hasIncoming) {
      try {
        localStorage.setItem(UTM_KEY, JSON.stringify(raw));
      } catch (e) {}
    }

    var structured = {};
    KNOWN_KEYS.forEach(function (k) {
      structured[k] = merged[k] || null;
    });
    structured.raw = merged;
    return structured;
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
      raw_params: utm.raw || null,
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

  // Append vid + every captured param onto outbound CTA links so hashcal can carry them
  // forward, whatever platform they came from — not just the ones we thought to name.
  function decorateLink(href) {
    try {
      var url = new URL(href, window.location.href);
      var utm = captureUtm();
      url.searchParams.set("vid", getVid());
      Object.keys(utm.raw || {}).forEach(function (k) {
        if (utm.raw[k]) url.searchParams.set(k, utm.raw[k]);
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
