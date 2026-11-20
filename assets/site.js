/* VideoCoS project page: shared helpers, the wordmark, result clips and galleries, paper sheets, citation.
   The 3D view lives in viewer.js. */
(function () {
  "use strict";
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const FN = "scene_inventory|inspect_entities|measure_pair|viewpoint_relation|track_motion|camera_history|submit_answer|submit_update|run_python|S\\.\\w+|A\\.\\w+|box|prism|pierced_wall|build_object|animate";
  const RE = new RegExp(`(#.*$)|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*')|\\b(for|in|if|else|elif|def|return|import|from|as|lambda|not|and|or|None|True|False)\\b|\\b(${FN})\\b|(?<![\\w.])(-?\\d+\\.?\\d*|\\.\\d+)\\b`, "gm");
  const hl = src => esc(src).replace(RE, (m, c, s, k, f, n) =>
    c ? `<i class="c">${c}</i>` : s ? `<i class="s">${s}</i>` : k ? `<i class="k">${k}</i>` : f ? `<i class="f">${f}</i>` : `<i class="n">${n}</i>`);
  window.VCOS = {hl, esc};
  document.querySelectorAll("pre[data-hl]").forEach(p => { p.innerHTML = hl(p.textContent); });

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tryPlay = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  /* things that play only while on screen */
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
    const t = e.target; e.isIntersecting ? t._play && t._play() : t._pause && t._pause();
  }), {rootMargin: "80px 0px", threshold: 0.25}) : null;
  const watch = el => { if (io) io.observe(el); else if (el._play) el._play(); };

  /* result strips: the panes of one example play together */
  document.querySelectorAll(".strip").forEach(strip => {
    const vids = [...strip.querySelectorAll("video")];
    if (!vids.length) return;
    vids.forEach(v => { v.muted = true; v.loop = true; v.playsInline = true; if (calm) v.controls = true; });
    const lead = vids[0];
    lead.addEventListener("timeupdate", () => {
      for (const v of vids.slice(1)) {
        if (v.readyState < 2 || !isFinite(v.duration)) continue;
        const want = lead.currentTime % v.duration;
        if (Math.abs(v.currentTime - want) > 0.18) v.currentTime = want;
      }
    });
    strip._play = () => { if (!calm) vids.forEach(tryPlay); };
    strip._pause = () => vids.forEach(v => v.pause());
    watch(strip);
  });

  /* galleries: one grid video per case, the cases on tabs. The cells are labelled in HTML over the video. */
  document.querySelectorAll("[data-gallery]").forEach(g => {
    const data = g.querySelector('script[type="application/json"]');
    if (!data) return;
    const cases = JSON.parse(data.textContent), tabs = g.querySelector(".tabs"), mosaic = g.querySelector(".mosaic"), video = mosaic.querySelector("video");
    const capK = g.querySelector(".cap b"), capX = g.querySelector(".cap span"), cells = [...g.querySelectorAll(".labels > div")];
    video.muted = true; video.loop = true; video.playsInline = true; if (calm) video.controls = true;
    let seen = false;
    function show(i, play) {
      const c = cases[i];
      [...tabs.children].forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      video.poster = `assets/compare/${c.f}.jpg`; video.src = `assets/compare/${c.f}.mp4`;
      if (capK) capK.textContent = c.k || ""; if (capX) capX.textContent = c.x || "";
      const goal = g.querySelector(".labels .goal span"); if (goal) goal.textContent = (c.x || "").trim();
      cells.forEach((cell, k) => { const v = cell.querySelector(".void"); if (v) v.hidden = !(c.blank || []).includes(k); });
      if (play && !calm) tryPlay(video);
    }
    cases.forEach((c, i) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = c.t;
      b.addEventListener("click", () => show(i, true)); tabs.appendChild(b);
    });
    show(0, false);
    mosaic.addEventListener("click", () => { if (video.paused) tryPlay(video); else video.pause(); });
    mosaic._play = () => { seen = true; if (!calm) tryPlay(video); };
    mosaic._pause = () => video.pause();
    watch(mosaic);
  });

  /* paper sheets open at full size */
  const dlg = document.querySelector("dialog.zoom");
  if (dlg && dlg.showModal) {
    const big = dlg.querySelector("img");
    document.querySelectorAll(".sheet button").forEach(b => b.addEventListener("click", () => {
      const im = b.querySelector("img"); big.src = im.currentSrc || im.src; big.alt = im.alt; dlg.showModal();
    }));
    dlg.addEventListener("click", () => dlg.close());
  }

  /* citation */
  const copy = document.getElementById("copy-bib");
  if (copy) copy.addEventListener("click", async () => {
    const text = document.getElementById("bibtex").textContent;
    try { await navigator.clipboard.writeText(text); copy.textContent = "Copied"; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(document.getElementById("bibtex")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = "Selected: press Ctrl/⌘ C"; }
    setTimeout(() => { copy.textContent = "Copy BibTeX"; }, 2200);
  });
})();
