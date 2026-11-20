/* VideoCoS project page: the paper's Table 1 and Figures 1, 3 and 7, rebuilt as interactive figures.
   Numbers in Figure 7 are transcribed from the paper figure; the top-left line values were read off the plot (±0.3). */
(function () {
  "use strict";
  const V = window.VCOS_VIZ;
  if (!V) return;
  const {svgEl, h, lin, tw, setAttrs, vbar, spread, showTip, hideTip, hoverable, seg, legendOf, css, calm} = V;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const hl = s => window.VCOS.hl(s);
  const go = sel => { const t = $(sel); if (t) { t.scrollIntoView({behavior: calm ? "auto" : "smooth", block: "start"}); t.classList.remove("hl-flash"); void t.offsetWidth; t.classList.add("hl-flash"); } };
  const zoom = (src, alt) => { const d = $("dialog.zoom"); if (!d || !d.showModal) { open(src); return; } const im = d.querySelector("img"); im.src = src; im.alt = alt || ""; d.showModal(); };
  function paperBtn(parent, src, label) {
    const b = h("button", "btn small paperbtn", parent, label || "Paper figure"); b.type = "button";
    b.addEventListener("click", () => zoom(src, label)); return b;
  }
  const html = (tag, cls, parent, markup) => { const e = h(tag, cls, parent); e.innerHTML = markup; return e; };

  /* =====================================================================
     Table 1: the seven tasks, as a map over the state s_t = (E, g_t, c_t)
     ===================================================================== */
  (function taskMap() {
    const root = $("#taskmap");
    if (!root) return;
    const R = V.READ.reasoners["Gemini-3.8 Flash"];
    const T = [
      {ab: "EQ", fam: "read", name: "Entity querying", op: "𝓔", comp: ["E"], det: "count distinct objects across frames", src: "VSI-Bench-Debiased", n: 251, go: "#res-read", kpi: V.sgn(R.ours[0] - R.video[0]), kpiL: "pts, Gemini code vs. video"},
      {ab: "GQ", fam: "read", name: "Geometric querying", op: "g<sub>t</sub>", comp: ["g"], det: "object/room size and absolute/relative distance", src: "VSI-Bench-Debiased", n: 1297, go: "#res-read", kpi: V.sgn(R.ours[1] - R.video[1]), kpiL: "pts, Gemini code vs. video"},
      {ab: "VQ", fam: "read", name: "Viewpoint querying", op: "g<sub>t</sub> in a query-defined reference frame", comp: ["g"], det: "relative direction and route planning", src: "VSI-Bench-Debiased", n: 496, go: "#res-read", kpi: V.sgn(R.ours[2] - R.video[2]), kpiL: "pts, Gemini code vs. video"},
      {ab: "HQ", fam: "read", name: "History querying", op: "𝓔, g<sub>1:T</sub>, c<sub>1:T</sub>", comp: ["E", "g", "c"], det: "order in which objects first become visible", src: "VSI-Bench-Debiased", n: 318, go: "#res-read", kpi: V.sgn(R.ours[3] - R.video[3]), kpiL: "pts, Gemini code vs. video"},
      {ab: "NVS", fam: "write", name: "Novel-view synthesis", op: "c<sub>1:T</sub> → c′<sub>1:T</sub>", comp: ["c"], det: "observed video → novel-view video", src: "Kubric-4D", n: 300, go: "#res-nvs", kpi: "0.254", kpiL: "object mIoU at 42°, best baseline 0.020"},
      {ab: "GCP", fam: "write", name: "Goal-conditioned planning", op: "g<sub>1</sub> → g′<sub>1:T′</sub>", comp: ["g"], det: "observed frame + goal → video", src: "Ego2Act", n: 110, go: "#res-gcp", kpi: "68.2", kpiL: "task completion T, second after Seedance-2.0"},
      {ab: "FP", fam: "write", name: "Future prediction", op: "g<sub>1:T</sub> → g′<sub>T+1:T′</sub>", comp: ["g"], det: "observed video → future video", src: "Physics-IQ", n: 66, go: "#res-fp", kpi: "11.1", kpiL: "rigid trajectory error, Cosmos3 10.3–10.5"}
    ];
    const COMP = {E: {sym: "𝓔", name: "entities", ex: "chair, table, …"}, g: {sym: "g<sub>t</sub>", name: "geometry", ex: "3D pose, size, …"}, c: {sym: "c<sub>t</sub>", name: "camera", ex: "pose, intrinsics, …"}};
    root.classList.add("tmap");
    const bar = h("div", "tm-state", root);
    html("span", "tm-st", bar, "World state&nbsp; <i>s<sub>t</sub></i> = (");
    const compBtns = {};
    Object.entries(COMP).forEach(([k, c], i) => {
      const b = html("button", "tm-comp c-" + k, bar, `<b>${c.sym}</b><span>${c.name}<small>${c.ex}</small></span>`); b.type = "button";
      b.setAttribute("aria-pressed", "false"); compBtns[k] = b;
      b.addEventListener("click", () => pick(cur === k ? null : k));
      b.addEventListener("pointerenter", () => { if (!cur) light(k); }); b.addEventListener("pointerleave", () => { if (!cur) light(null); });
      if (i < 2) h("span", "tm-comma", bar, ",");
    });
    h("span", "tm-st", bar, ")");
    h("span", "tm-hint", bar, "Pick a component to see which tasks read or write it");
    const cols = h("div", "tm-cols", root);
    const maxN = Math.max(...T.map(t => t.n));
    const cards = [];
    ["read", "write"].forEach(fam => {
      const col = h("div", "tm-col " + fam, cols);
      html("div", "tm-colhead", col, fam === "read" ? `<span class="chip read">Read</span><span>query the state · VSI-Bench-Debiased</span>` : `<span class="chip write">Write</span><span>edit and render the state</span>`);
      T.filter(t => t.fam === fam).forEach((t, i) => {
        const cd = h("button", "tm-card glow rv d" + Math.min(3, i), col); cd.type = "button"; cd.dataset.comp = t.comp.join(" ");
        html("div", "tm-top", cd, `<span class="tm-ab">${t.ab}</span><span class="tm-name">${t.name}</span><span class="tm-kpi"><b>${t.kpi}</b><small>${t.kpiL}</small></span>`);
        html("div", "tm-op", cd, `<span class="tm-lab">state operation</span><span class="tm-math">${t.op}</span>`);
        html("p", "tm-det", cd, t.det + (fam === "write" ? ` · <span class="tm-src">${t.src}</span>` : ""));
        const nb = html("div", "tm-n", cd, `<span class="tm-nbar"><i style="--w:${(t.n / maxN * 100).toFixed(1)}%"></i></span><span class="tm-nval"><b>${t.n.toLocaleString("en-US")}</b> samples</span>`);
        cd.addEventListener("pointermove", e => { const r = cd.getBoundingClientRect(); cd.style.setProperty("--mx", (e.clientX - r.left) + "px"); cd.style.setProperty("--my", (e.clientY - r.top) + "px"); });
        cd.addEventListener("click", () => go(t.go));
        cd.setAttribute("aria-label", `${t.name}: ${t.n} samples. Go to its results.`);
        cards.push(cd);
      });
    });
    h("p", "note tm-note", root, "Table 1 of the paper, interactive. Bars are the number of evaluation samples; the figure on each card is its headline result. Click a card to jump to it.");
    paperBtn(root, "assets/paper/tab1_tasks.png", "Paper table");
    let cur = null;
    function light(k) {
      Object.entries(compBtns).forEach(([q, b]) => b.classList.toggle("on", q === k));
      root.classList.toggle("filtering", !!k);
      cards.forEach(c => c.classList.toggle("match", !!k && c.dataset.comp.split(" ").includes(k)));
    }
    function pick(k) { cur = k; Object.entries(compBtns).forEach(([q, b]) => b.setAttribute("aria-pressed", String(q === k))); light(k); }
    /* bars grow when seen */
    if ("IntersectionObserver" in window) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { root.classList.add("seen"); o.disconnect(); } }, {threshold: .25}).observe(root);
    else root.classList.add("seen");
  })();

  /* =====================================================================
     Figure 1: latent vs. executable state, and the help/hurt radar
     ===================================================================== */
  (function fig1() {
    const root = $("#fig1x");
    if (!root) return;
    root.classList.add("f1");
    /* left: where the state lives */
    const L = h("div", "f1-left vizcard", root);
    const lh = h("div", "viz-head", L);
    html("h3", "f1-title", lh, "Where does the state live?");
    const dia = h("div", "f1-dia", L);
    dia.innerHTML = `
      <div class="f1-video"><div class="f1-film"><video muted loop playsinline preload="metadata" src="assets/compare/view_45663164.mp4" data-off="0"></video><video muted loop playsinline preload="metadata" src="assets/compare/view_45663164.mp4" data-off="0.34"></video><video muted loop playsinline preload="metadata" src="assets/compare/view_45663164.mp4" data-off="0.67"></video></div><span>Raw video</span></div>
      <div class="f1-arrow"><svg viewBox="0 0 40 14"><path d="M0 7h34M28 1l7 6-7 6"/></svg></div>
      <div class="f1-mid">
        <div class="f1-pane latent">
          <div class="f1-ph"><b>(a) Latent-space state</b><span class="f1-tags bad">✕ Implicit · Entangled · Per-frame</span></div>
          <div class="f1-latent"><div class="f1-feats"><i></i><i></i><i></i><i></i></div><div class="f1-model">Video-language model /<br>video diffusion model</div></div>
          <div class="f1-outs"><span class="o-ans">Answer</span><em>or</em><span class="o-vid">Video</span></div>
          <p class="f1-cap">The state stays inside the network’s features: it can’t be inspected, edited or kept between questions.</p>
        </div>
        <div class="f1-pane exec">
          <div class="f1-ph"><b>(b) Executable world state <em>ours</em></b><span class="f1-tags good">✓ Explicit · Factorized · Persistent</span></div>
          <div class="f1-exec">
            <div class="f1-codify">Video<br>codification</div>
            <div class="f1-blend"><svg viewBox="0 0 48 48"><path d="M24 4l18 10v20L24 44 6 34V14z"/><path d="M6 14l18 10 18-10M24 24v20"/></svg><span>scene.blender</span></div>
            <div class="f1-files">
              <button type="button" class="f1-file read" data-f="q"><b>query.py</b><code>measure_pair("chair", "table")</code><span class="f1-o">→ Answer</span></button>
              <button type="button" class="f1-file write" data-f="g"><b>generate.py</b><code>set_pose(mug, shelf_top, frame=48)</code><span class="f1-o">→ Video</span></button>
            </div>
          </div>
          <div class="f1-ws"><span>World state <i>s<sub>t</sub></i> = (𝓔, g<sub>t</sub>, c<sub>t</sub>)</span><em>Entities 𝓔 · chair, table…</em><em>Geometry g<sub>t</sub> · 3D pose, size…</em><em>Camera c<sub>t</sub> · pose, intrinsics…</em></div>
        </div>
      </div>`;
    /* the raw video: one clip, three moments, like a film strip */
    const vids = $$(".f1-film video", L);
    vids.forEach(v => {
      v.muted = true;
      v.addEventListener("loadedmetadata", () => { try { v.currentTime = v.duration * +v.dataset.off; } catch (e) {} }, {once: true});
    });
    const playAll = on => vids.forEach(v => { if (on && !calm) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(es => playAll(es[0].isIntersecting), {threshold: .2}).observe(L);
    /* right: the radar */
    const Rc = h("div", "f1-right vizcard", root);
    const rh = h("div", "viz-head", Rc);
    html("h3", "f1-title", rh, "When does it help or hurt?");
    const reasoner = "Gemini-3.8 Flash";                 /* one backbone, as in the paper's figure */
    html("span", "f1-backbone", rh, "Backbone: <b>Gemini 3.8</b>");
    const box = h("div", "viz-chart", Rc), svg = svgEl("svg", {role: "img", "aria-label": "Radar: performance with an executable state relative to the same model without one"}, box);
    const lg = h("div", "viz-legend", Rc);
    h("p", "viz-note", Rc, "Each spoke is the score with the state divided by the score without it; the grey ring is “no change”. Read spokes compare Gemini 3.8 on video; novel views compare the best diffusion model; planning and prediction compare MiniMax-H3 alone. Hover a spoke for the numbers, click it for the results.");
    const btns = h("div", "f1-btns", Rc); paperBtn(btns, "assets/paper/fig1_teaser.png", "Paper figure");
    let g = null; const pts = new Map();
    function draw(anim) {
      const W = Math.max(320, box.clientWidth || 520), H = Math.min(480, W * .86), cx = W / 2, cy = H / 2 + 4, Rr = Math.min(W * .27, H * .36), base = Rr * .56;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      const items = V.helpItems(reasoner), n = items.length;
      const ang = i => -Math.PI / 2 + (i + .5) / n * Math.PI * 2;
      const rad = it => Math.min(Rr, base * it.ratio);
      if (!g) { g = {bg: svgEl("g", null, svg), poly: svgEl("path", {class: "rd-poly"}, svg), pts: svgEl("g", null, svg), lab: svgEl("g", {class: "rd-lab"}, svg)}; }
      g.bg.textContent = ""; g.lab.textContent = "";
      /* group arcs */
      const groups = [];
      items.forEach((it, i) => { const last = groups[groups.length - 1]; if (last && last.name === it.group) last.end = i; else groups.push({name: it.group, fam: it.fam, start: i, end: i}); });
      groups.forEach(G => {
        const a0 = -Math.PI / 2 + G.start / n * Math.PI * 2 + .03, a1 = -Math.PI / 2 + (G.end + 1) / n * Math.PI * 2 - .03, r = Rr + 12;
        svgEl("path", {d: `M${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r}A${r},${r} 0 0 1 ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r}`, class: "rd-arc " + G.fam}, g.bg);
      });
      svgEl("circle", {cx, cy, r: Rr, class: "rd-outer"}, g.bg);
      svgEl("circle", {cx, cy, r: base, class: "rd-base"}, g.bg);
      [.5, 1.5].forEach(k => svgEl("circle", {cx, cy, r: base * k, class: "rd-ring"}, g.bg));
      items.forEach((it, i) => {
        const a = ang(i);
        svgEl("line", {x1: cx, y1: cy, x2: cx + Math.cos(a) * Rr, y2: cy + Math.sin(a) * Rr, class: "rd-spoke"}, g.bg);
        const lx = cx + Math.cos(a) * (Rr + 26), ly = cy + Math.sin(a) * (Rr + 26);
        const t = svgEl("text", {x: lx, y: ly + 4, "text-anchor": Math.abs(Math.cos(a)) < .2 ? "middle" : Math.cos(a) > 0 ? "start" : "end", class: "rd-axis " + it.fam}, g.lab);
        t.textContent = it.axis;
      });
      svgEl("text", {x: cx, y: cy + 4, "text-anchor": "middle", class: "rd-mid"}, g.lab).textContent = "without";
      /* the polygon, tweened point by point */
      const to = {};
      items.forEach((it, i) => { const a = ang(i), r = rad(it); to["x" + i] = cx + Math.cos(a) * r; to["y" + i] = cy + Math.sin(a) * r; });
      tw(g.poly, to, (nd, q) => {
        nd.setAttribute("d", "M" + items.map((_, i) => q["x" + i] + "," + q["y" + i]).join("L") + "Z");
        items.forEach((_, i) => { const p = pts.get(i); if (p) p.setAttribute("transform", `translate(${q["x" + i]},${q["y" + i]})`); });
      }, anim ? 700 : 0);
      items.forEach((it, i) => {
        let p = pts.get(i);
        if (!p) {
          p = svgEl("g", {class: "rd-pt"}, g.pts); pts.set(i, p);
          svgEl("circle", {r: 15, class: "hit"}, p); svgEl("circle", {r: 6, class: "dot"}, p); svgEl("text", {y: -11, "text-anchor": "middle", class: "rd-val"}, p);
          hoverable(p, () => { const q = V.helpItems(reasoner)[i], f = v => v.toFixed(q.dec || 1);
            return {title: q.axis + " · " + q.group, rows: [{color: css("--s-video"), value: f(q.a) + q.unit, label: q.from}, {color: css("--brand"), value: f(q.b) + q.unit, label: q.to}, {color: "", value: (q.pct > 0 ? "+" : "") + q.pct.toFixed(1) + "%", label: q.pct >= 0 ? "helps" : "hurts"}]}; });
          p.addEventListener("click", () => go(V.helpItems(reasoner)[i].go));
        }
        p.querySelector(".dot").style.fill = it.pct >= 0 ? css("--read-fill") : css("--coral");
        const tv = p.querySelector(".rd-val");
        tv.textContent = it.ratio > Rr / base ? `${it.ratio.toFixed(1)}× ▸` : (it.pct > 0 ? "+" : it.pct < 0 ? "−" : "") + Math.abs(Math.round(it.pct)) + "%";
        tv.setAttribute("class", "rd-val " + (it.pct >= 0 ? "pos" : "neg"));
        const pp = p.getAttribute("transform"); if (!pp) p.setAttribute("transform", `translate(${to["x" + i]},${to["y" + i]})`);
      });
      legendOf(lg, [{label: "with an executable state", color: css("--brand"), line: true}, {label: "without (same model)", color: css("--s-video"), dash: true}, {label: "helps", color: css("--read-fill")}, {label: "hurts", color: css("--coral")}]);
    }
    draw(false);
    new ResizeObserver(() => draw(false)).observe(box);
    document.addEventListener("vcos:theme", () => draw(false));
  })();

  /* =====================================================================
     Figure 3: the method, explorable
     ===================================================================== */
  (function fig3() {
    const root = $("#fig3x");
    if (!root) return;
    root.classList.add("f3");
    root.innerHTML = `
    <div class="f3-row">
      <section class="f3-a vizcard">
        <header><span class="f3-k">1a</span><h3>Video perception extraction</h3></header>
        <div class="f3-mods">
          <div class="f3-mod" data-m="geo"><b>Geometry</b><small>Depth Anything 3</small><span>depth maps · camera poses · world frame &amp; structure</span></div>
          <div class="f3-mod" data-m="sem"><b>Semantics</b><small>Qwen 3.8 &amp; SAM 3</small><span>segmentation &amp; tracking</span></div>
          <div class="f3-mod" data-m="obj"><b>3D objects</b><small>Fusion &amp; SAM 3D</small><span>3D boxes · 3D meshes</span></div>
        </div>
        <div class="f3-files-h">Read-only evidence files <small>hover one to see where it comes from</small></div>
        <div class="f3-files">
          <button type="button" data-m="vid" data-d="the input frames themselves">Frames<small>RGB</small></button>
          <button type="button" data-m="geo" data-d="per-frame camera poses and intrinsics">Cameras<small>JSON</small></button>
          <button type="button" data-m="geo" data-d="per-frame metric depth">Depth<small>NumPy</small></button>
          <button type="button" data-m="geo" data-d="the fused point cloud of the room">Point cloud<small>NumPy</small></button>
          <button type="button" data-m="geo" data-d="the floor and the room’s planes, in a gravity-aligned world frame">Floor &amp; planes<small>JSON</small></button>
          <button type="button" data-m="sem" data-d="per-object tracks and masks across frames">Tracks &amp; masks<small>RGB &amp; NumPy</small></button>
          <button type="button" data-m="obj" data-d="a 3D bounding box per tracked object">3D box<small>JSON</small></button>
          <button type="button" data-m="obj" data-d="reconstructed object meshes">3D meshes<small>NumPy &amp; JSON</small></button>
        </div>
        <p class="f3-desc" aria-live="polite">The agent can read these files; it cannot change them.</p>
      </section>
      <div class="f3-pipe" aria-hidden="true"><i></i><i></i><i></i></div>
      <section class="f3-b vizcard">
        <header><span class="f3-k">1b</span><h3>Code agent execution loop</h3><button type="button" class="btn small f3-run">▶ Run the loop</button></header>
        <div class="f3-loop">
          <svg class="f3-ring" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="78"/><circle class="f3-orb" r="7" cx="100" cy="22"/></svg>
          <button type="button" class="f3-step s1" data-s="0"><span class="n">1</span><b>Look at evidence</b><small>Read frames, crops &amp; records; resolve duplicate or false tracks</small></button>
          <button type="button" class="f3-step s2" data-s="1"><span class="n">2</span><b>Write code</b><small>Edit geometry, pose &amp; materials</small></button>
          <button type="button" class="f3-step s3" data-s="2"><span class="n">3</span><b>Execute</b><small>in a sandboxed Blender</small></button>
          <button type="button" class="f3-step s4" data-s="3"><span class="n">4</span><b>Check &amp; render</b><small>source vs. rendered</small></button>
          <div class="f3-center"><b class="f3-iter">iteration 0</b><span class="f3-say">coding agent</span></div>
        </div>
        <div class="f3-console"><div class="cb"><span>scene.py</span><span class="f3-who">coding agent</span></div><pre class="mono"></pre></div>
        <ul class="f3-checks"><li data-c="0">Collision / support</li><li data-c="1">Dynamics</li><li data-c="2">Object coverage</li></ul>
        <p class="note">Repeat until all checks pass or time runs out.</p>
      </section>
    </div>
    <div class="f3-ews"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l18 10v20L24 44 6 34V14z"/><path d="M6 14l18 10 18-10M24 24v20"/></svg><div><b>Executable world state</b><span>a live Blender process</span></div><span class="f3-ready">ready ✓</span></div>
    <section class="f3-c vizcard">
      <header><span class="f3-k">2</span><h3>Reading and writing within the executable world state</h3></header>
      <div class="f3-io">
        <div class="f3-agent"><b>Reasoning agent</b><span>calls tools, reads results, writes code and answers. It never sees the frames.</span></div>
        <div class="f3-wire"><span class="call">tool calling →</span><span class="res">← tool results</span><i class="pk"></i></div>
        <div class="f3-tools"></div>
      </div>
      <div class="f3-out"><div class="f3-term"><div class="cb"><span>harness</span><span class="f3-tk">pick a tool</span></div><pre class="mono"># Click a tool to call it on the live scene.</pre></div>
        <div class="f3-outs"><div class="f3-o read"><b>Reading</b><span>Answer: the table is in front of the right sofa.</span></div><div class="f3-o write"><b>Writing</b><span>Code → rendering → simulated video</span></div></div></div>
    </section>`;
    const pf = $(".paper-f3"); if (pf) paperBtn(pf, "assets/paper/fig3_method.png", "Paper figure");
    /* evidence files ↔ modules */
    const desc = $(".f3-desc", root), DEF = desc.textContent;
    $$(".f3-files button", root).forEach(b => {
      const on = () => { $$(".f3-mod", root).forEach(m => m.classList.toggle("on", m.dataset.m === b.dataset.m)); b.classList.add("on"); desc.innerHTML = `<b>${b.firstChild.textContent}</b>: ${b.dataset.d}${b.dataset.m === "vid" ? "" : `, from the <b>${$(`.f3-mod[data-m=${b.dataset.m}] b`, root).textContent}</b> module`}.`; };
      const off = () => { $$(".f3-mod, .f3-files button", root).forEach(m => m.classList.remove("on")); desc.textContent = DEF; };
      b.addEventListener("pointerenter", on); b.addEventListener("focus", on); b.addEventListener("pointerleave", off); b.addEventListener("blur", off);
    });
    $$(".f3-mod", root).forEach(m => {
      m.addEventListener("pointerenter", () => $$(".f3-files button", root).forEach(b => b.classList.toggle("on", b.dataset.m === m.dataset.m)));
      m.addEventListener("pointerleave", () => $$(".f3-files button", root).forEach(b => b.classList.remove("on")));
    });
    /* the loop */
    const steps = $$(".f3-step", root), orb = $(".f3-orb", root), con = $(".f3-console pre", root), who = $(".f3-who", root), iterEl = $(".f3-iter", root), say = $(".f3-say", root);
    const checks = $$(".f3-checks li", root), ews = $(".f3-ews", root), runBtn = $(".f3-run", root);
    const K = (window.VCOS_SCENES || {}).kitchen;
    const pickLines = (re, n) => K ? K.code.split("\n").filter(l => re.test(l)).slice(0, n).join("\n") : "";
    const ITER = [   /* three passes: what the agent reads, writes, and what the checks say */
      {look: `structure: {"floor": {"z": 0.0, "x_range": [-1.38, 1.25], ...}}\n# 111 tracks · 3 look like duplicates`, code: pickLines(/^A\.add_floor|^env\(/, 3) || `A.add_floor(...)`, fail: [0], msg: "✗ collision: two cabinets overlap"},
      {look: `# crops of track 41 and 57: the same cabinet\n# merge them`, code: pickLines(/^A\.|^env\(/, 6).split("\n").slice(3, 6).join("\n") || `A.box_mesh(...)`, fail: [2], msg: "✗ object coverage: 4 tracks not yet placed"},
      {look: `# remaining tracks: kettle, towel, 2 magnets`, code: `A.arrange_room(...)`, fail: [], msg: "✓ all checks pass"}
    ];
    let running = false, runTok = 0;
    const POS = [0, 90, 180, 270];
    function orbTo(i) { const a = (POS[i] - 90) * Math.PI / 180; orb.setAttribute("cx", 100 + Math.cos(a) * 78); orb.setAttribute("cy", 100 + Math.sin(a) * 78); }
    function activate(i) { steps.forEach((s, k) => s.classList.toggle("on", k === i)); orbTo(i); }
    const wait = ms => new Promise(r => setTimeout(r, calm ? 0 : ms));
    async function typeTo(el, text, alive) {
      if (calm) { el.innerHTML = hl(text); return; }
      for (let i = 0; i <= text.length; i += 3) { if (!alive()) return; el.innerHTML = hl(text.slice(0, i)) + '<span class="caret"></span>'; await wait(12); }
      el.innerHTML = hl(text);
    }
    async function run() {
      const tok = ++runTok; running = true; runBtn.textContent = "■ Stop"; ews.classList.remove("ready"); checks.forEach(c => c.className = "");
      for (let it = 0; it < ITER.length; it++) {
        const I = ITER[it]; if (tok !== runTok) return;
        iterEl.textContent = `iteration ${it + 1}`;
        activate(0); who.textContent = say.textContent = "coding agent · reading"; checks.forEach(c => c.className = ""); await typeTo(con, I.look, () => tok === runTok); await wait(700);
        activate(1); who.textContent = say.textContent = "coding agent · writing"; await typeTo(con, I.code, () => tok === runTok); await wait(600);
        activate(2); who.textContent = say.textContent = "Blender · executing"; con.innerHTML = hl(I.code + "\n# executing in sandboxed Blender …"); await wait(900);
        activate(3); who.textContent = say.textContent = "system · checking";
        for (let c = 0; c < checks.length; c++) { if (tok !== runTok) return; await wait(330); checks[c].className = I.fail.includes(c) ? "bad" : "ok"; }
        con.innerHTML = hl(I.code + "\n# " + I.msg); await wait(900);
        if (I.fail.length) { say.textContent = "repair ↺"; await wait(500); }
      }
      if (tok !== runTok) return;
      steps.forEach(s => s.classList.remove("on")); say.textContent = "done"; ews.classList.add("ready"); running = false; runBtn.textContent = "↻ Run again";
    }
    runBtn.addEventListener("click", () => { if (running) { runTok++; running = false; runBtn.textContent = "▶ Run the loop"; return; } run(); });
    steps.forEach((s, i) => s.addEventListener("click", () => { runTok++; running = false; runBtn.textContent = "▶ Run the loop"; activate(i); const txt = [ITER[0].look, ITER[0].code, ITER[0].code + "\n# executing in sandboxed Blender …", "# render the scene through the source camera\n# compare it with the frames; check collision,\n# support, dynamics and object coverage"][i]; con.innerHTML = hl(txt); }));
    activate(0); con.innerHTML = hl("# Press “Run the loop” to watch the agent build the scene.");
    if ("IntersectionObserver" in window && !calm) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(run, 400); } }, {threshold: .45}).observe($(".f3-b", root));
    /* tools */
    const TOOLS = [
      {n: "scene_inventory", t: "Find objects", call: `scene_inventory(category="chair")`, out: `→ 4 entities: chair_1, chair_2, chair_3, chair_4`, k: "read"},
      {n: "inspect_entity", t: "Inspect shape", call: `inspect_entity("table")`, out: `→ table · center [0.41, 1.20, 0.38] m\n  dimensions [1.60, 0.80, 0.76] m`, k: "read"},
      {n: "measure_pair", t: "Distance", call: `measure_pair("chair_2", "table")`, out: `→ distance_m 1.50`, k: "read"},
      {n: "viewpoint_relation", t: "Viewpoint offsets", call: `viewpoint_relation(observer="sofa", facing="tv",\n                   target="lamp")`, out: `→ left · 38° off the facing direction`, k: "read"},
      {n: "camera_history", t: "History", call: `camera_history(ids=["lamp", "sofa"])`, out: `→ first seen  lamp: frame 112\n              sofa: frame 340`, k: "read"},
      {n: "track_motion", t: "Motion & speed", call: `track_motion("ball", frames=(1, 90))`, out: `→ path 2.31 m · peak speed 1.8 m/s`, k: "read"},
      {n: "reset_scene", t: "Restore state", call: `reset_scene()`, out: `→ scene restored to the codified state`, k: "write"},
      {n: "run_python", t: "Execute code", call: `run_python("""\nmug = bpy.data.objects["mug"]\nset_pose(mug, shelf_top, frame=48)\n""")`, out: `→ ok · scene diff: mug.location, 48 keyframes`, k: "write"},
      {n: "submit_update", t: "Save scene", call: `submit_update()`, out: `→ rendering 120 frames ▸ simulated video`, k: "write"}
    ];
    const tl = $(".f3-tools", root), term = $(".f3-term pre", root), tk = $(".f3-tk", root), wire = $(".f3-wire", root);
    TOOLS.forEach(T => {
      const b = html("button", "f3-tool " + T.k, tl, `<b>${T.t}</b><code>${T.n}()</code>`); b.type = "button";
      b.addEventListener("click", async () => {
        const tok = ++toolTok;
        $$(".f3-tool", root).forEach(x => x.classList.toggle("on", x === b));
        tk.textContent = T.k === "read" ? "read · query" : "write · edit";
        wire.classList.remove("back"); wire.classList.add("go"); void wire.offsetWidth;
        await typeTo(term, "# example call (illustrative values)\n" + T.call, () => tok === toolTok);
        if (tok !== toolTok) return;
        wire.classList.remove("go"); void wire.offsetWidth; wire.classList.add("back");
        await wait(500); if (tok !== toolTok) return;
        term.innerHTML = hl("# example call (illustrative values)\n" + T.call + "\n" + T.out);
        $$(".f3-o", root).forEach(o => o.classList.toggle("on", o.classList.contains(T.k)));
      });
    });
    let toolTok = 0;
  })();

  /* =====================================================================
     Figure 7: analysis of reads, as linked views
     ===================================================================== */
  (function fig7() {
    const root = $("#fig7x");
    if (!root) return;
    root.classList.add("f7");
    const HM = {
      cols: [["Object count", "Entity"], ["Object size", "Geometry"], ["Room size", "Geometry"], ["Absolute distance", "Geometry"], ["Relative distance", "Geometry"], ["Relative direction", "Viewpoint"], ["Route plan", "Viewpoint"], ["Appearance order", "History"], ["All questions", "All"]],
      rows: [
        {k: "Count", grp: "State accuracy", d: "object-count accuracy of the scene", v: [.26, .01, -.00, .06, .01, .06, .00, .23, .08], box: 0},
        {k: "Size", grp: "State accuracy", d: "object-size accuracy of the scene", v: [.02, .36, -.01, .31, -.02, .08, .00, .07, .19], box: 1},
        {k: "Dist.", grp: "State accuracy", d: "distance accuracy of the scene", v: [-.06, .08, -.03, .54, .15, .19, -.05, .01, .28], box: 3},
        {k: "Area", grp: "State accuracy", d: "room-area accuracy of the scene", v: [-.07, .13, .56, .02, .02, -.08, -.03, -.09, .18], box: 2},
        {k: "LS", grp: "Visual similarity", d: "visual similarity of the render (LS)", v: [-.09, .11, .05, -.01, -.02, .02, -.01, -.02, .07]},
        {k: "DV", grp: "Visual similarity", d: "visual similarity of the render (DV)", v: [-.05, -.03, -.03, .06, -.04, .02, -.02, -.06, -.03]}
      ]
    };
    const DB = {
      Entity: {t: "Entity · count", x: "object counts matching", rows: [["exact", 87.4, 77.5], ["off by 1", 53.9, 62.0], ["off by ≥ 2", 30.1, 47.0], ["none in scene", 26.9, 31.5, 1]]},
      Geometry: {t: "Geometry · size, distance", x: "relative size/distance error", rows: [["< 10%", 92.2, 63.4], ["10–25%", 73.7, 62.4], ["25–50%", 42.1, 52.6], ["≥ 50%", 24.9, 36.4], ["object absent", 45.1, 50.3, 1]]},
      Viewpoint: {t: "Viewpoint · relative direction", x: "angle error of the object’s direction", rows: [["< 15°", 98.6, 79.7], ["15–45°", 83.6, 72.7], ["45–90°", 71.4, 61.9], ["≥ 90°", 38.9, 55.6], ["object absent", 71.4, 62.6, 1]]},
      History: {t: "History · appearance order", x: "object order pairs matching", rows: [["order right", 95.6, 93.4], ["1 pair wrong", 52.7, 74.5], ["≥ 2 pairs wrong", 34.8, 63.8], ["absent or unseen", 63.1, 74.8, 1]]}
    };
    const KOBJ = {k: [2, 3, 4], video: [91.1, 83.1, 77.6], code: [84.5, 72.4, 64.4]};
    const PERC = {tasks: ["Entity", "Geometry", "Viewpoint", "History", "All"], s: [
      {key: "video", label: "Video", color: "--s-video", v: [59.6, 60.2, 63.2, 77.7, 63.1]},
      {key: "raw", label: "Raw perception", color: "--s-alt", v: [52.3, 52.5, 66.9, 54.1, 56.3]},
      {key: "code", label: "Code (VideoCoS)", color: "--brand", v: [53.7, 61.1, 80.7, 64.5, 65.5]}]};

    root.innerHTML = `
      <div class="f7-grid">
        <section class="vizcard f7-hm"><div class="viz-head"><h3 class="f1-title">What predicts a right answer?</h3><div class="f7-hmctl"></div></div><div class="viz-chart"><svg role="img" aria-label="Spearman correlation between scene metrics and question accuracy"></svg></div><p class="viz-note">Spearman correlation between a scene’s metrics and QA accuracy, across the 3 codified scenes of each room. Boxed: the state metric that matches the question. Click a column to see how much error that question tolerates →</p></section>
        <section class="vizcard f7-db"><div class="viz-head"><h3 class="f1-title">How much error can code tolerate?</h3></div><div class="f7-dbctl"></div><div class="viz-chart"><svg role="img" aria-label="Accuracy with code and with video, by the error of the scene on the queried value"></svg></div><div class="viz-legend"></div><p class="viz-note f7-dbnote"></p></section>
        <section class="vizcard f7-k"><div class="viz-head"><h3 class="f1-title">Errors compound</h3></div><div class="viz-chart"><svg role="img" aria-label="Appearance-order accuracy against the number of objects in the question"></svg></div><div class="viz-legend"></div><p class="viz-note">Appearance-order accuracy against the number of objects a question orders. Values read off the paper’s plot (±0.3).</p></section>
        <section class="vizcard f7-p"><div class="viz-head"><h3 class="f1-title">Raw perception isn’t enough</h3></div><div class="viz-chart"><svg role="img" aria-label="Gemini accuracy given the video, raw perception outputs, or the codified scene"></svg></div><div class="viz-legend"></div><p class="viz-note">Gemini-3.8 Flash given the video, the raw perception outputs, or the codified scene. Perception trails video when raw and leads once codified.</p></section>
      </div>`;
    const pf = $(".paper-f7"); if (pf) paperBtn(pf, "assets/paper/fig7_analysis.png", "Paper figure");

    /* --- heatmap --- */
    const hmSec = $(".f7-hm", root), hmSvg = $("svg", hmSec), hmBox = $(".viz-chart", hmSec);
    let hmFocus = "all", selCol = 5;
    seg($(".f7-hmctl", root), "Rows", [{key: "all", label: "All rows"}, {key: "state", label: "State accuracy"}, {key: "vis", label: "Visual similarity"}], hmFocus, k => { hmFocus = k; drawHM(); });
    function mix(a, b, t) {
      const p = c => { c = c.replace("#", ""); if (c.length === 3) c = c.split("").map(x => x + x).join(""); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
      const A = p(a), B = p(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`;
    }
    const hcol = v => v >= 0 ? mix(css("--raise"), css("--hm-pos"), Math.min(1, v / .6)) : mix(css("--raise"), css("--hm-neg"), Math.min(1, -v / .6));
    function drawHM() {
      const W = Math.max(520, hmBox.clientWidth || 640), lw = 92, top = 74, cw = (W - lw - 8) / 9, ch = Math.min(46, cw * .82), gapRow = 14;
      const H = top + ch * 6 + gapRow + 50;
      hmSvg.setAttribute("viewBox", `0 0 ${W} ${H}`); hmSvg.setAttribute("height", H); hmSvg.textContent = "";
      const yOf = r => top + r * ch + (r >= 4 ? gapRow : 0);
      /* column groups */
      const groups = [["Entity", 0, 0], ["Geometry", 1, 4], ["Viewpoint", 5, 6], ["History", 7, 7], ["", 8, 8]];
      groups.forEach(([n, a, b]) => {
        if (!n) return;
        const x0 = lw + a * cw + 4, x1 = lw + (b + 1) * cw - 4;
        svgEl("line", {x1: x0, x2: x1, y1: 24, y2: 24, class: "f7-gl"}, hmSvg);
        svgEl("text", {x: (x0 + x1) / 2, y: 17, "text-anchor": "middle", class: "f7-gt"}, hmSvg).textContent = n;
      });
      HM.cols.forEach(([c], j) => {
        const g = svgEl("g", {class: "f7-colh" + (j === selCol ? " sel" : ""), tabindex: 0, role: "button", "aria-label": "Show error tolerance for " + c}, hmSvg);
        svgEl("rect", {x: lw + j * cw + 1, y: 28, width: cw - 2, height: top - 30, rx: 6, class: "f7-colbg"}, g);
        const words = c.split(" ");
        words.forEach((w, k) => svgEl("text", {x: lw + (j + .5) * cw, y: 46 + k * 14, "text-anchor": "middle", class: "f7-ct"}, g).textContent = w);
        const fam = HM.cols[j][1];
        const pickCol = () => { selCol = j; if (DB[fam]) setFam(fam, true); drawHM(); };
        g.addEventListener("click", pickCol); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickCol(); } });
      });
      [["State accuracy", 0, 3], ["Visual similarity", 4, 5]].forEach(([n, a, b]) => {
        const y0 = yOf(a) + 4, y1 = yOf(b) + ch - 4;
        svgEl("line", {x1: 10, x2: 10, y1: y0, y2: y1, class: "f7-gl"}, hmSvg);
        const t = svgEl("text", {x: 0, y: 0, "text-anchor": "middle", class: "f7-gt", transform: `translate(4 ${(y0 + y1) / 2}) rotate(-90)`}, hmSvg); t.textContent = n;
      });
      HM.rows.forEach((r, i) => {
        const dim = (hmFocus === "state" && i >= 4) || (hmFocus === "vis" && i < 4);
        svgEl("text", {x: lw - 10, y: yOf(i) + ch / 2 + 4, "text-anchor": "end", class: "f7-rt" + (dim ? " dim" : "")}, hmSvg).textContent = r.k;
        r.v.forEach((v, j) => {
          const g = svgEl("g", {class: "f7-cell" + (dim ? " dim" : "") + (j === selCol ? " colsel" : "")}, hmSvg);
          const x = lw + j * cw, y = yOf(i);
          const rc = svgEl("rect", {x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 4}, g); rc.style.fill = hcol(v);
          const tt = svgEl("text", {x: x + cw / 2, y: y + ch / 2 + 4, "text-anchor": "middle", class: "f7-cv" + (Math.abs(v) >= .3 ? " inv" : "") + (Math.abs(v) >= .1 ? " strong" : "")}, g);
          tt.textContent = (v > 0 || Object.is(v, 0) ? "+" : v < 0 ? "−" : "−") + Math.abs(v).toFixed(2).slice(1);
          if (r.box === j) svgEl("rect", {x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 4, class: "f7-box"}, g);
          hoverable(g, () => ({title: `${HM.cols[j][0]} questions`, rows: [{color: hcol(v), value: "ρ = " + (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2), label: r.d}].concat(r.box === j ? [{color: "", value: "matching", label: "the state metric this question needs"}] : [])}));
          g.addEventListener("click", () => { selCol = j; const fam = HM.cols[j][1]; if (DB[fam]) setFam(fam, true); drawHM(); });
        });
      });
      /* colour scale */
      const sy = H - 26, sx0 = lw, sx1 = Math.min(W - 10, lw + 300);
      for (let k = 0; k < 60; k++) { const v = -.6 + 1.2 * k / 59; const r = svgEl("rect", {x: sx0 + (sx1 - sx0) * k / 60, y: sy, width: (sx1 - sx0) / 60 + .5, height: 9}, hmSvg); r.style.fill = hcol(v); }
      [-.6, -.3, 0, .3, .6].forEach(v => svgEl("text", {x: sx0 + (sx1 - sx0) * (v + .6) / 1.2, y: sy + 23, "text-anchor": "middle", class: "f7-st"}, hmSvg).textContent = (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1));
    }

    /* --- dumbbells --- */
    const dbSec = $(".f7-db", root), dbSvg = $("svg", dbSec), dbBox = $(".viz-chart", dbSec), dbNote = $(".f7-dbnote", root);
    let fam = "Viewpoint";
    const famSeg = seg($(".f7-dbctl", root), "Question family", Object.keys(DB).map(k => ({key: k, label: k})), fam, k => setFam(k, true));
    function setFam(k, anim) {
      fam = k; $$("button", famSeg).forEach(b => b.setAttribute("aria-pressed", String(b.textContent === k)));
      drawDB(anim);
      if (anim) { dbSec.classList.remove("hl-flash"); void dbSec.offsetWidth; dbSec.classList.add("hl-flash"); }
    }
    const dbNodes = new Map();
    function drawDB(anim) {
      const D = DB[fam], W = Math.max(320, dbBox.clientWidth || 460), lw = Math.min(130, W * .3), rowH = 40, m = {t: 26, b: 36, r: 46};
      const H = m.t + m.b + rowH * 5 + 12;
      dbSvg.setAttribute("viewBox", `0 0 ${W} ${H}`); dbSvg.setAttribute("height", H);
      let ax = dbSvg.querySelector(".axis"); if (!ax) { ax = svgEl("g", {class: "axis"}, dbSvg); }
      ax.textContent = "";
      const x = lin(0, 100, lw, W - m.r);
      [0, 25, 50, 75, 100].forEach(t => { svgEl("line", {x1: x(t), x2: x(t), y1: m.t - 8, y2: H - m.b, class: "grid"}, ax); svgEl("text", {x: x(t), y: H - m.b + 16, "text-anchor": "middle"}, ax).textContent = t; });
      svgEl("text", {x: (lw + W - m.r) / 2, y: H - 4, "text-anchor": "middle", class: "axt"}, ax).textContent = "accuracy (%)";
      svgEl("text", {x: 4, y: 12, class: "axt"}, ax).textContent = D.x;
      /* where does code stop leading? */
      const graded = D.rows.filter(r => !r[3]);
      let lastLead = -1; for (let i = 0; i < graded.length; i++) { if (graded[i][1] > graded[i][2]) lastLead = i; else break; }
      const yOf = i => m.t + i * rowH + (D.rows[i][3] ? 12 : 0);
      if (lastLead >= 0 && lastLead < graded.length - 1) {
        const yb = (yOf(lastLead) + yOf(lastLead + 1)) / 2 + rowH / 2;
        svgEl("line", {x1: 4, x2: W - 4, y1: yb, y2: yb, class: "f7-tol"}, ax);
        svgEl("text", {x: W - 4, y: yb - 5, "text-anchor": "end", class: "f7-toltx"}, ax).textContent = "code leads above this line";
      }
      for (let i = 0; i < 5; i++) {
        let n = dbNodes.get(i);
        if (!n) {
          n = svgEl("g", {class: "f7-row"}, dbSvg); dbNodes.set(i, n);
          n._lab = svgEl("text", {"text-anchor": "end", class: "f7-rl"}, n);
          n._bar = svgEl("line", {class: "f7-bar"}, n);
          n._v = svgEl("circle", {r: 6.5, class: "f7-dv"}, n); n._c = svgEl("circle", {r: 6.5, class: "f7-dc"}, n);
          n._tv = svgEl("text", {class: "f7-tv"}, n); n._tc = svgEl("text", {class: "f7-tc"}, n);
          n._hit = svgEl("rect", {fill: "transparent", x: 0, height: rowH}, n);
          hoverable(n, () => { const r = DB[fam].rows[i]; if (!r) return {title: "", rows: []}; return {title: `${DB[fam].t} · ${r[0]}`, rows: [{color: css("--brand"), value: r[1].toFixed(1), label: "code input"}, {color: css("--s-video"), value: r[2].toFixed(1), label: "video input"}, {color: "", value: V.sgn(r[1] - r[2]), label: r[1] > r[2] ? "code leads" : "video leads"}]}; });
        }
        const r = D.rows[i];
        n.style.opacity = r ? 1 : 0; n.style.pointerEvents = r ? "auto" : "none";
        if (!r) continue;
        n._hit.setAttribute("width", W);
        const y = yOf(i), cy = rowH / 2;
        n._lab.textContent = r[0]; n._lab.setAttribute("x", lw - 12); n._lab.setAttribute("y", cy + 4);
        n._lab.setAttribute("class", "f7-rl" + (r[3] ? " muted" : ""));
        const lead = r[1] >= r[2];
        n._bar.setAttribute("class", "f7-bar " + (lead ? "code" : "video"));
        tw(n, {y, c: x(r[1]), v: x(r[2])}, (nd, q) => {
          nd.setAttribute("transform", `translate(0,${q.y})`);
          nd._bar.setAttribute("x1", q.c); nd._bar.setAttribute("x2", q.v); nd._bar.setAttribute("y1", cy); nd._bar.setAttribute("y2", cy);
          nd._c.setAttribute("cx", q.c); nd._c.setAttribute("cy", cy); nd._v.setAttribute("cx", q.v); nd._v.setAttribute("cy", cy);
          const cRight = q.c >= q.v;
          nd._tc.setAttribute("x", q.c + (cRight ? 11 : -11)); nd._tc.setAttribute("text-anchor", cRight ? "start" : "end"); nd._tc.setAttribute("y", cy + 4);
          nd._tv.setAttribute("x", q.v + (cRight ? -11 : 11)); nd._tv.setAttribute("text-anchor", cRight ? "end" : "start"); nd._tv.setAttribute("y", cy + 4);
        }, anim ? 650 : 0);
        n._tc.textContent = r[1].toFixed(1); n._tv.textContent = r[2].toFixed(1);
        n._c.style.fill = css("--brand"); n._v.style.fill = css("--s-video");
      }
      legendOf($(".viz-legend", dbSec), [{label: "code input", color: css("--brand")}, {label: "video input", color: css("--s-video")}]);
      const tolTxt = {Entity: "Code wins only when the scene’s count is exact.", Geometry: "Code input tolerates up to 25% error in size and distance.", Viewpoint: "Code input tolerates up to 90° error in direction.", History: "One wrong pair in the order already hands the lead to video."};
      dbNote.textContent = tolTxt[fam] + " Hover a row for the numbers.";
    }

    /* --- k objects --- */
    const kSec = $(".f7-k", root), kSvg = $("svg", kSec), kBox = $(".viz-chart", kSec);
    function drawK() {
      const W = Math.max(300, kBox.clientWidth || 420), H = 250, m = {l: 36, r: 92, t: 14, b: 36};
      kSvg.setAttribute("viewBox", `0 0 ${W} ${H}`); kSvg.setAttribute("height", H); kSvg.textContent = ""; kSec._lines = [];
      const x = lin(1.7, 4.3, m.l, W - m.r), y = lin(60, 95, H - m.b, m.t);
      const ax = svgEl("g", {class: "axis"}, kSvg);
      [60, 70, 80, 90].forEach(t => { svgEl("line", {x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "grid"}, ax); svgEl("text", {x: m.l - 6, y: y(t) + 4, "text-anchor": "end"}, ax).textContent = t; });
      KOBJ.k.forEach(k => svgEl("text", {x: x(k), y: H - m.b + 16, "text-anchor": "middle", class: "cat"}, ax).textContent = k);
      svgEl("text", {x: (m.l + W - m.r) / 2, y: H - 3, "text-anchor": "middle", class: "axt"}, ax).textContent = "objects in the question";
      KOBJ.k.forEach((k, i) => {
        svgEl("line", {x1: x(k), x2: x(k), y1: y(KOBJ.video[i]) + 6, y2: y(KOBJ.code[i]) - 6, class: "f7-gap"}, kSvg);
        svgEl("text", {x: x(k) + 7, y: (y(KOBJ.video[i]) + y(KOBJ.code[i])) / 2 + 4, class: "f7-gaptx"}, kSvg).textContent = V.sgn(KOBJ.code[i] - KOBJ.video[i]);
      });
      [["video", "--s-video", "Video input"], ["code", "--brand", "Code input"]].forEach(([key, col, lab]) => {
        const p = svgEl("path", {d: "M" + KOBJ.k.map((k, i) => x(k) + "," + y(KOBJ[key][i])).join("L"), class: "sline" + (key === "code" ? " ours" : "")}, kSvg);
        p.style.stroke = css(col);
        if (!calm && !kSec._seen) { const L = 600; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = "stroke-dashoffset 1.2s ease"; kSec._lines = (kSec._lines || []).concat(p); }
        KOBJ.k.forEach((k, i) => { const c = svgEl("circle", {cx: x(k), cy: y(KOBJ[key][i]), r: 5, class: "sdot"}, kSvg); c.style.fill = css(col); });
        svgEl("text", {x: W - m.r + 8, y: y(KOBJ[key][2]) + 4, class: key === "code" ? "strong" : ""}, kSvg).textContent = lab;
      });
      const hit = svgEl("rect", {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent"}, kSvg);
      const hair = svgEl("line", {class: "hair", y1: m.t, y2: H - m.b}, kSvg);
      hit.addEventListener("pointermove", e => {
        const r = kSvg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
        let i = 0, bd = 1e9; KOBJ.k.forEach((k, j) => { const d = Math.abs(x(k) - px); if (d < bd) { bd = d; i = j; } });
        hair.setAttribute("x1", x(KOBJ.k[i])); hair.setAttribute("x2", x(KOBJ.k[i])); hair.classList.add("on");
        showTip(e, `${KOBJ.k[i]} objects`, [{color: css("--s-video"), value: "≈ " + KOBJ.video[i].toFixed(1), label: "video input"}, {color: css("--brand"), value: "≈ " + KOBJ.code[i].toFixed(1), label: "code input"}, {color: "", value: V.sgn(KOBJ.code[i] - KOBJ.video[i]), label: "gap"}]);
      });
      hit.addEventListener("pointerleave", () => { hair.classList.remove("on"); hideTip(); });
      legendOf($(".viz-legend", kSec), [{label: "Video input", color: css("--s-video"), line: true}, {label: "Code input", color: css("--brand"), line: true}]);
    }

    /* --- raw perception vs code --- */
    const pSec = $(".f7-p", root), pSvg = $("svg", pSec), pBox = $(".viz-chart", pSec);
    function drawP() {
      const W = Math.max(300, pBox.clientWidth || 420), H = 250, m = {l: 30, r: 6, t: 18, b: 30};
      pSvg.setAttribute("viewBox", `0 0 ${W} ${H}`); pSvg.setAttribute("height", H); pSvg.textContent = ""; pSec._bars = [];
      const y = lin(0, 90, H - m.b, m.t), gw = (W - m.l - m.r) / 5, bw = Math.min(22, gw * .26);
      const ax = svgEl("g", {class: "axis"}, pSvg);
      [0, 25, 50, 75].forEach(t => { svgEl("line", {x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t ? "grid" : "zero"}, ax); svgEl("text", {x: m.l - 6, y: y(t) + 4, "text-anchor": "end"}, ax).textContent = t; });
      PERC.tasks.forEach((t, i) => svgEl("text", {x: m.l + gw * (i + .5), y: H - m.b + 17, "text-anchor": "middle", class: "cat" + (i === 4 ? " strong" : "")}, ax).textContent = t);
      PERC.tasks.forEach((t, i) => PERC.s.forEach((s, j) => {
        const bx = m.l + gw * (i + .5) - (3 * bw + 4) / 2 + j * (bw + 2), v = s.v[i];
        const p = svgEl("path", {class: "mark"}, pSvg); p.style.fill = css(s.color);
        const grow = !calm && !pSec._seen;
        tw(p, {h: grow ? y(0) : y(v)}, (nd, q) => nd.setAttribute("d", vbar(bx, bw, y(0), q.h)), 0);
        if (grow) pSec._bars = (pSec._bars || []).concat([[p, y(v), bx, bw, y(0)]]);
        hoverable(p, () => ({title: `Gemini-3.8 Flash · ${t}`, rows: PERC.s.map(q => ({color: css(q.color), value: q.v[i].toFixed(1), label: q.label}))}));
        if (j === 2) svgEl("text", {x: bx + bw / 2, y: y(v) - 6, "text-anchor": "middle", class: "f7-pl"}, pSvg).textContent = v.toFixed(1);
      }));
      legendOf($(".viz-legend", pSec), PERC.s.map(s => ({label: s.label, color: css(s.color)})));
    }
    function growP() {
      (pSec._bars || []).forEach(([p, to, bx, bw, y0]) => tw(p, {h: to}, (nd, q) => nd.setAttribute("d", vbar(bx, bw, y0, q.h)), 900));
      pSec._bars = [];
    }
    function all(anim) { drawHM(); drawDB(anim); drawK(); drawP(); }
    all(false);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); kSec._seen = true; (kSec._lines || []).forEach(p => p.style.strokeDashoffset = 0); } }, {threshold: .4}).observe(kSec);
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); pSec._seen = true; growP(); } }, {threshold: .4}).observe(pSec);
    } else { kSec._seen = pSec._seen = true; }
    let rT = 0; new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(() => all(false), 60); }).observe(root);
    document.addEventListener("vcos:theme", () => all(false));
  })();
})();
