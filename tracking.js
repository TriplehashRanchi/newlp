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

  function nearestHeadingText(el) {
    var node = el;
    while (node && node !== document.body) {
      var sib = node.previousElementSibling;
      while (sib) {
        var heading = /^H[1-3]$/.test(sib.tagName) ? sib : sib.querySelector("h1,h2,h3");
        if (heading && heading.textContent.trim()) {
          return heading.textContent.trim().slice(0, 40);
        }
        sib = sib.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  }

  // Explicit data-cta wins; otherwise the closest named <section>; otherwise the nearest
  // heading above the button in document order; otherwise a stable position index so at
  // least repeat clicks on the same button still group together.
  function ctaLabel(el) {
    if (el.dataset && el.dataset.cta) return el.dataset.cta;

    var section = el.closest("section");
    if (section && section.className) {
      var cls = String(section.className).split(" ")[0];
      if (cls) return cls;
    }

    var heading = nearestHeadingText(el);
    if (heading) return heading;

    var all = document.querySelectorAll(".buttonLink");
    var idx = Array.prototype.indexOf.call(all, el);
    return "CTA #" + (idx + 1);
  }

  function initCtaTracking() {
    document.addEventListener(
      "click",
      function (e) {
        var bookingLink = e.target.closest(".buttonLink");
        if (bookingLink) {
          send("cta_click", { label: ctaLabel(bookingLink) });

          var href = bookingLink.getAttribute("href");
          if (href && /^https?:\/\//i.test(href)) {
            bookingLink.setAttribute("href", decorateLink(href));
          }
          return;
        }

        // Free-tool links on the disqualified/gifts page (HashCal, HashForm, HashPlay) —
        // a different `.buttonLink` class, so the tracker above never saw these clicks.
        var toolLink = e.target.closest(".gift-tool-link");
        if (toolLink) {
          send("gift_tool_click", { label: toolLink.textContent.trim() || "unknown tool" });
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
    send("lp_view", {
      referrer: document.referrer || null,
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      user_agent: navigator.userAgent,
    });

    // A distinct signal for "reached the disqualified/gifts page" — lp_view alone doesn't
    // separate this from a normal landing-page visit without filtering by page in SQL.
    if (window.location.pathname.indexOf("gifts") !== -1) {
      send("gifts_page_view");
    }

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
