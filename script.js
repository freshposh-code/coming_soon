(() => {
  "use strict";

  const START_DATE = new Date("2026-10-29T00:00:00+01:00").getTime();
  const LAUNCH_DATE = new Date("2026-11-12T23:59:59+01:00").getTime();
  const STORAGE_KEY = "junuvo_notify_emails";

  const $ = (id) => document.getElementById(id);
  const els = {
    overlay: $("overlay"),
    countdown: $("countdown"),
    days: $("days"),
    hours: $("hours"),
    minutes: $("minutes"),
    seconds: $("seconds"),
    srTime: $("sr-time"),
    bar: $("progress-bar"),
    barWrap: $("progress-bar-wrap"),
    barText: $("progress-text"),
    form: $("notify-form"),
    email: $("email"),
    msg: $("form-msg"),
    year: $("year"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const last = { days: null, hours: null, minutes: null, seconds: null };
  let stopped = false;

  if (els.year) els.year.textContent = new Date().getFullYear();

  function setValue(key, value) {
    const el = els[key];
    if (!el) return;
    const text = pad(value);
    if (last[key] === text) return;
    last[key] = text;
    el.textContent = text;
    if (!reduceMotion && el.animate) {
      el.animate(
        [
          { transform: "translateY(-35%)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 350, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
    }
  }

  function updateProgress(now) {
    const total = LAUNCH_DATE - START_DATE;
    const pct = Math.min(100, Math.max(0, ((now - START_DATE) / total) * 100));
    const rounded = Math.round(pct);
    if (els.bar) els.bar.style.width = pct.toFixed(2) + "%";
    if (els.barText) els.barText.textContent = rounded + "%";
    if (els.barWrap) els.barWrap.setAttribute("aria-valuenow", String(rounded));
  }

  function tick() {
    const now = Date.now();
    const diff = LAUNCH_DATE - now;

    if (diff <= 0) {
      stopped = true;
      showLive();
      return;
    }

    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    setValue("days", days);
    setValue("hours", hours);
    setValue("minutes", minutes);
    setValue("seconds", seconds);
    updateProgress(now);

    if (seconds === 0 && els.srTime) {
      els.srTime.textContent = `${days} days, ${hours} hours and ${minutes} minutes remaining until launch.`;
    }
  }

  function loop() {
    if (stopped) return;
    try {
      tick();
    } catch (err) {
      console.error("Countdown error:", err);
    }
    if (stopped) return;
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
  }

  function showLive() {
    ["days", "hours", "minutes", "seconds"].forEach((k) => {
      if (els[k]) els[k].textContent = "00";
    });
    updateProgress(LAUNCH_DATE);
    if (!els.countdown) return;
    els.countdown.insertAdjacentHTML(
      "afterend",
      `<div class="mt-8">
        <button id="enter-btn" type="button"
          class="rounded-xl bg-brand px-8 py-4 text-sm font-bold text-white shadow-lg shadow-brand/40 transition hover:bg-blue-500 active:scale-95">
          We're live — Enter Junuvo
        </button>
      </div>`
    );
    const btn = $("enter-btn");
    if (btn) btn.addEventListener("click", closeOverlay);
  }

  function closeOverlay() {
    if (!els.overlay) return;
    els.overlay.style.opacity = "0";
    els.overlay.style.pointerEvents = "none";
    setTimeout(() => {
      els.overlay.remove();
      document.body.classList.remove("overflow-hidden");
    }, 700);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      try { tick(); } catch (err) { console.error(err); }
    }
  });

  // ---- NOTIFY FORM ----
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function message(text, type) {
    if (!els.msg) return;
    els.msg.textContent = text;
    els.msg.className =
      "mt-2 min-h-5 text-sm " + (type === "ok" ? "text-emerald-400" : "text-red-400");
  }

  function saveEmail(email) {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (list.includes(email)) return "exists";
      list.push(email);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return "saved";
    } catch {
      return "saved";
    }
  }

  if (els.form && els.email) {
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = els.email.value.trim().toLowerCase();

      if (!emailRe.test(email)) {
        message("Please enter a valid email address.", "error");
        els.email.focus();
        return;
      }

      const result = saveEmail(email);
      message(
        result === "exists"
          ? "You're already on the list. We'll notify you at launch."
          : "Thank you! We'll notify you when we launch.",
        "ok"
      );
      els.form.reset();
    });
  }

  loop();
})();