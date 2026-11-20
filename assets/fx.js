/* VideoCoS project page: page-level motion and interaction.
   Hero world-state canvas, counters, scroll progress, reveal, theme, the codify/read/write stepper,
   the novel-view wipe, and the pointer glow on cards. */
(function () {
  "use strict";
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------- theme ---------- */
  const themeBtn = $("#theme");
  const saved = localStorage.getItem("vcos-theme");
  if (saved) document.documentElement.dataset.theme = saved;
  const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const paintThemeBtn = () => { if (themeBtn) { themeBtn.setAttribute("aria-pressed", String(isDark())); themeBtn.title = isDark() ? "Switch to light" : "Switch to dark"; } };
  paintThemeBtn();
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next; localStorage.setItem("vcos-theme", next); paintThemeBtn();
    document.dispatchEvent(new Event("vcos:theme"));
  });

  /* ---------- scroll progress + active section ---------- */
  const bar = $(".progress i");
  const links = $$(".bar nav a");
  const secs = links.map(a => $(a.getAttribute("href"))).filter(Boolean);
  let ticking = false;
  function onScroll() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = s;
    links.forEach(a => a.classList.toggle("on", cur && a.getAttribute("href") === "#" + cur.id));
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, {passive: true});
  onScroll();

  /* ---------- reveal on scroll ---------- */
  const rv = $$(".rv");
  if ("IntersectionObserver" in window && !calm) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {rootMargin: "0px 0px -8% 0px", threshold: 0.08});
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add("in"));

  /* ---------- counters ---------- */
  const nums = $$("[data-count]");
  function runCount(el) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    const fmt = v => pre + v.toLocaleString("en-US", {minimumFractionDigits: dec, maximumFractionDigits: dec}) + suf;
    if (calm) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 1400 + Math.random() * 400;
    const step = now => { const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 4); el.textContent = fmt(to * e); if (u < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); } }), {threshold: 0.6});
    nums.forEach(n => io.observe(n));
  } else nums.forEach(runCount);

  /* ---------- pointer glow on cards ---------- */
  $$(".glow").forEach(el => el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }));
  /* tilt on finding boxes */
  if (!calm) $$(".tilt").forEach(el => {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect(), u = (e.clientX - r.left) / r.width - .5, v = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${u * 7}deg) rotateX(${-v * 7}deg) translateY(-3px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });

  /* ---------- hero: a codified room, drawn as its bounding boxes ---------- */
  (function hero() {
    const cvs = $("#hero-canvas");
    if (!cvs) return;
    const S = (window.VCOS_SCENES || {})[cvs.dataset.scene || "kitchen"];
    if (!S) return;
    const ctx = cvs.getContext("2d");
    const objs = S.meta.objects.filter(o => o.size && Math.max(...o.size) > 0.08);
    const lo = S.meta.room.lo, hi = S.meta.room.hi;
    const C = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2 * 0.6, (lo[2] + hi[2]) / 2];
    const R = Math.hypot(hi[0] - lo[0], hi[2] - lo[2]) / 2;
    const path = (S.meta.camera_path || []).map(p => [p[1], p[2], p[3]]);
    const readout = $("#hero-readout");
    let W = 0, H = 0, dpr = 1, yaw = 0.7, pitch = 0.62, tYaw = 0, tPitch = 0, mx = -1, my = -1, visible = true, t0 = performance.now(), hot = null;
    function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = cvs.clientWidth; H = cvs.clientHeight; cvs.width = W * dpr; cvs.height = H * dpr; }
    new ResizeObserver(size).observe(cvs); size();
    const host = cvs.parentElement;
    host.addEventListener("pointermove", e => { const r = cvs.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; tYaw = (mx / W - .5) * 1.2; tPitch = (my / H - .5) * 0.35; });
    host.addEventListener("pointerleave", () => { mx = my = -1; tYaw = 0; tPitch = 0; });
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cvs);
    let cy = 0, cp = 0;
    function project(p, cam) {
      const dx = p[0] - cam.e[0], dy = p[1] - cam.e[1], dz = p[2] - cam.e[2];
      const x = dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2], y = dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2], z = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
      if (z < 0.1) return null;
      const s = cam.focal / z;
      return [cam.cx + x * s, cam.cy - y * s, z];
    }
    const E = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const t = Math.max(0, (now - t0) / 1000);
      cy += ((calm ? 0 : t * 0.06) + tYaw - cy) * 0.05; cp += (tPitch - cp) * 0.05;
      const a = yaw + cy, el = pitch + cp, d = R * 2.35;
      const e = [C[0] + Math.cos(a) * Math.cos(el) * d, C[1] + Math.sin(el) * d, C[2] + Math.sin(a) * Math.cos(el) * d];
      let f = [C[0] - e[0], C[1] - e[1], C[2] - e[2]]; const fl = Math.hypot(...f); f = f.map(v => v / fl);
      let r = [f[2], 0, -f[0]]; const rl = Math.hypot(...r); r = r.map(v => -v / rl);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      /* place the room right of centre on wide screens, so the title stays clear */
      const wide = W > 980;
      const cam = {e, f, r, u, focal: Math.min(W, H * 1.6) * (wide ? 0.62 : 0.72), cx: wide ? W * 0.5 : W * 0.5, cy: H * 0.5};
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const brand = css("--brand"), write = css("--write-fill"), line = css("--grid-ink") || "rgba(120,130,160,.3)";
      /* floor grid */
      ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.globalAlpha = 0.55; ctx.beginPath();
      for (let gx = Math.floor(lo[0]) - 1; gx <= Math.ceil(hi[0]) + 1; gx += 0.5) { const p = project([gx, 0, lo[2] - 1], cam), q = project([gx, 0, hi[2] + 1], cam); if (p && q) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); } }
      for (let gz = Math.floor(lo[2]) - 1; gz <= Math.ceil(hi[2]) + 1; gz += 0.5) { const p = project([lo[0] - 1, 0, gz], cam), q = project([hi[0] + 1, 0, gz], cam); if (p && q) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); } }
      ctx.stroke(); ctx.globalAlpha = 1;
      /* boxes, far to near; the one nearest the pointer lights up */
      const drawn = [];
      for (const o of objs) {
        const c = o.center, s = o.size, v = [];
        for (let i = 0; i < 8; i++) v.push(project([c[0] + (i & 1 ? .5 : -.5) * s[0], c[1] + (i & 2 ? .5 : -.5) * s[1], c[2] + (i & 4 ? .5 : -.5) * s[2]], cam));
        if (v.some(p => !p)) continue;
        const pc = project(c, cam);
        drawn.push({o, v, pc, z: pc[2]});
      }
      drawn.sort((p, q) => q.z - p.z);
      let best = null, bd = 70;
      if (mx >= 0) for (const b of drawn) { const dd = Math.hypot(b.pc[0] - mx, b.pc[1] - my); if (dd < bd) { bd = dd; best = b; } }
      const wave = calm ? 1 : Math.min(1, t / 2.2);                     /* the room "codifies" in on load */
      drawn.forEach((b, i) => {
        if (i / drawn.length > wave) return;
        const isHot = best === b;
        ctx.beginPath();
        for (const [p, q] of E) { ctx.moveTo(b.v[p][0], b.v[p][1]); ctx.lineTo(b.v[q][0], b.v[q][1]); }
        ctx.strokeStyle = isHot ? write : brand; ctx.lineWidth = isHot ? 2 : 1;
        ctx.globalAlpha = isHot ? 1 : 0.22 + 0.25 * Math.max(0, 1 - b.z / (R * 3.5));
        ctx.stroke();
        if (isHot) {
          ctx.globalAlpha = 0.14; ctx.fillStyle = write; ctx.beginPath();
          const top = [2, 3, 7, 6].map(k => b.v[k]); ctx.moveTo(top[0][0], top[0][1]); top.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      /* the source camera's path, traced on a loop */
      if (path.length > 4) {
        const n = path.length, head = calm ? n - 1 : Math.floor(((t * 0.08) % 1) * n);
        ctx.beginPath(); let started = false;
        for (let i = 0; i <= head; i += 2) { const p = project(path[i], cam); if (!p) { started = false; continue; } if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]); }
        ctx.strokeStyle = write; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.65; ctx.stroke(); ctx.globalAlpha = 1;
        const hp = project(path[head], cam);
        if (hp) { ctx.fillStyle = write; ctx.beginPath(); ctx.arc(hp[0], hp[1], 4, 0, 7); ctx.fill(); ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(hp[0], hp[1], 10 + 3 * Math.sin(t * 4), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      }
      /* readout: what the agent would read */
      if (readout) {
        if (best && best.o !== hot) {
          hot = best.o;
          const nm = String(hot.name).replace(/"/g, ""), sz = hot.size;
          readout.innerHTML = window.VCOS.hl(`inspect_entities(ids=["${nm}"])\n→ ${hot.category}  ·  ${sz[0].toFixed(2)} × ${sz[2].toFixed(2)} × ${sz[1].toFixed(2)} m`);
          readout.classList.add("on");
          readout.style.left = Math.min(W - 300, Math.max(8, best.pc[0] + 18)) + "px"; readout.style.top = Math.max(8, best.pc[1] - 56) + "px";
        } else if (!best && hot) { hot = null; readout.classList.remove("on"); }
        if (best) { readout.style.left = Math.min(W - 300, Math.max(8, best.pc[0] + 18)) + "px"; readout.style.top = Math.max(8, best.pc[1] - 56) + "px"; }
      }
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- codify / read / write stepper ---------- */
  (function stepper() {
    const root = $("#pipe");
    if (!root) return;
    const steps = $$(".pipe-step", root), codeEl = $(".pipe-code pre", root), fileEl = $(".pipe-code .fname", root), outEl = $(".pipe-out", root);
    const flow = $(".pipe-flow", root);
    const K = (window.VCOS_SCENES || {}).kitchen;
    const codifyLines = K ? K.code.split("\n").filter(l => /^(A\.|cream|def env|# )/.test(l)).slice(0, 7).join("\n") : "A.add_floor(...)";
    const DATA = [
      {file: "scene.py · written by the codification agent", code: `# evidence: depth, camera poses, tracks, 3D boxes\nimport codify.assets as A\nev = A.load_evidence()\n${codifyLines}\n# ... execute in Blender, render, compare, repair`, out: "✓ executed in Blender · 111 objects · render checked against the frames"},
      {file: "query.py · the reasoning agent reads", code: `# Q: how far is the chair from the table?\ninspect_entities(["chair", "table"])\nd = measure_pair("chair", "table")\nsubmit_answer(d)            # 1.5 m`, out: "→ answer submitted: 1.5 m · the agent never sees a frame"},
      {file: "generate.py · the reasoning agent writes", code: `# Goal: put the mug on the shelf\nmug = bpy.data.objects["mug"]\nset_pose(mug, shelf_top, frame=48)\nsimulate(frames=120)\nsubmit_update()             # render video`, out: "→ state updated · Blender renders the new video ▸"}
    ];
    let cur = -1, typing = null, auto = !calm, timer = null, t0 = 0;
    const DUR = 7000;
    function type(text, done) {
      cancelAnimationFrame(typing);
      if (calm) { codeEl.innerHTML = window.VCOS.hl(text); done(); return; }
      let i = 0; const start = performance.now();
      const step = now => {
        i = Math.min(text.length, Math.floor((now - start) / 9));
        codeEl.innerHTML = window.VCOS.hl(text.slice(0, i)) + '<span class="caret"></span>';
        if (i < text.length) typing = requestAnimationFrame(step); else { codeEl.innerHTML = window.VCOS.hl(text) + '<span class="caret"></span>'; done(); }
      };
      typing = requestAnimationFrame(step);
    }
    function go(i) {
      cur = i;
      steps.forEach((s, k) => { s.setAttribute("aria-selected", String(k === i)); s.classList.toggle("done", k < i); const tb = s.querySelector(".pipe-timer i"); if (tb) tb.style.transform = "scaleX(0)"; });
      root.dataset.step = i; if (flow) flow.dataset.step = i;
      fileEl.textContent = DATA[i].file; outEl.classList.remove("on"); outEl.textContent = DATA[i].out;
      type(DATA[i].code, () => outEl.classList.add("on"));
      t0 = performance.now();
    }
    steps.forEach((s, i) => s.addEventListener("click", () => { auto = false; root.classList.add("manual"); go(i); }));
    function loop(now) {
      requestAnimationFrame(loop);
      if (!auto || cur < 0) return;
      const u = (now - t0) / DUR;
      const tb = steps[cur].querySelector(".pipe-timer i");
      if (tb) tb.style.transform = `scaleX(${Math.min(1, u)})`;
      if (u >= 1) go((cur + 1) % DATA.length);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { if (es[0].isIntersecting && cur < 0) { go(0); requestAnimationFrame(loop); } }, {threshold: 0.3}).observe(root);
    } else go(0);
  })();

  /* ---------- novel-view wipe ---------- */
  (function wipe() {
    const root = $("#wipe");
    if (!root) return;
    const stage = $(".wipe-stage", root), left = $(".wipe-left", root), right = $(".wipe-right", root), handle = $(".wipe-handle", root);
    const lTag = $(".wipe-tag.l", root), rTag = $(".wipe-tag.r", root);
    let scn = "02912", method = "ours", pos = 0.5;
    const NAMES = {input: "Input view", cognvs: "CogNVS", recammaster: "ReCamMaster", ours: "VideoCoS"};
    function load() {
      const t = right.currentTime || 0;
      left.poster = `assets/results/t5_scn${scn}_${method}.jpg`; left.src = `assets/results/t5_scn${scn}_${method}.mp4`;
      if (right.dataset.scn !== scn) { right.poster = `assets/results/t5_scn${scn}_target.jpg`; right.src = `assets/results/t5_scn${scn}_target.mp4`; right.dataset.scn = scn; }
      else left.addEventListener("loadedmetadata", () => { try { left.currentTime = t % left.duration; } catch (e) {} }, {once: true});
      lTag.textContent = NAMES[method]; lTag.classList.toggle("ours", method === "ours");
      if (!calm) [left, right].forEach(v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); });
    }
    [left, right].forEach(v => { v.muted = true; v.loop = true; v.playsInline = true; });
    right.addEventListener("timeupdate", () => { if (left.readyState >= 2 && isFinite(left.duration)) { const want = right.currentTime % left.duration; if (Math.abs(left.currentTime - want) > 0.15) left.currentTime = want; } });
    function set(p) { pos = Math.max(0.02, Math.min(0.98, p)); stage.style.setProperty("--p", (pos * 100) + "%"); handle.setAttribute("aria-valuenow", Math.round(pos * 100)); }
    let drag = false;
    const at = e => { const r = stage.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
    stage.addEventListener("pointerdown", e => { drag = true; stage.setPointerCapture(e.pointerId); at(e); root.classList.add("touched"); });
    stage.addEventListener("pointermove", e => { if (drag) at(e); });
    stage.addEventListener("pointerup", () => { drag = false; });
    handle.addEventListener("keydown", e => { if (e.key === "ArrowLeft") set(pos - .05); if (e.key === "ArrowRight") set(pos + .05); });
    $$("[data-wscn]", root).forEach(b => b.addEventListener("click", () => { scn = b.dataset.wscn; $$("[data-wscn]", root).forEach(x => x.setAttribute("aria-pressed", String(x === b))); load(); }));
    $$("[data-wm]", root).forEach(b => b.addEventListener("click", () => { method = b.dataset.wm; $$("[data-wm]", root).forEach(x => x.setAttribute("aria-pressed", String(x === b))); load(); }));
    set(0.5);
    /* a little sweep the first time it scrolls in, to say "drag me" */
    if ("IntersectionObserver" in window) new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) { left.pause(); right.pause(); return; }
      if (!right.src) load(); else if (!calm) { left.play().catch(() => {}); right.play().catch(() => {}); }
      if (!root.dataset.swept && !calm) {
        root.dataset.swept = 1; const t0 = performance.now();
        const sw = now => { if (root.classList.contains("touched")) return; const u = (now - t0) / 1600; set(0.5 + Math.sin(u * Math.PI * 2) * 0.28 * (1 - u)); if (u < 1) requestAnimationFrame(sw); else set(0.5); };
        requestAnimationFrame(sw);
      }
    }, {threshold: 0.4}).observe(root);
    else load();
  })();
})();
