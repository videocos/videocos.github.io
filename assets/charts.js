/* VideoCoS project page: the paper's tables as interactive charts and sortable tables.
   Every number below is transcribed from Tables 2-5 of the paper. Plain SVG, no chart library. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------------- data (from the paper) ---------------- */
  const READ = {
    tasks: ["Entity", "Geometry", "Viewpoint", "History", "Average"],
    reasoners: {
      "Qwen3.8-27B":      {video: [51.7, 56.1, 59.0, 74.5, 58.6], bvb: [58.1, 52.1, 64.8, 64.4, 57.4], ours: [54.1, 56.1, 60.2, 62.0, 57.6]},
      "GPT-5.6 Luna":     {video: [49.4, 50.3, 40.6, 68.6, 50.0], bvb: [59.0, 53.9, 68.9, 63.8, 59.5], ours: [54.0, 58.1, 62.5, 64.5, 59.6]},
      "Gemini-3.8 Flash": {video: [59.6, 60.2, 63.2, 77.7, 63.1], bvb: [58.5, 56.0, 79.3, 69.2, 63.8], ours: [53.7, 61.1, 80.7, 64.5, 65.5]}
    },
    series: [
      {key: "video", label: "Video input", color: "--s-video"},
      {key: "bvb", label: "Code · BVB scene", color: "--s-alt"},
      {key: "ours", label: "Code · VideoCoS scene", color: "--brand"}
    ]
  };
  const NVS = {
    shifts: [{deg: 42, name: "Low"}, {deg: 97, name: "Medium"}, {deg: 128, name: "High"}],
    gt: {miou: [0.604, 0.619, 0.618]},
    series: [
      {key: "tc", label: "TrajectoryCrafter", color: "--s-alt", psnr: [10.88, 10.45, 10.19], miou: [0.020, 0.004, 0.004]},
      {key: "rcm", label: "ReCamMaster", color: "--s-alt2", psnr: [11.68, 10.47, 9.34], miou: [0.016, 0.003, 0.001]},
      {key: "cog", label: "CogNVS", color: "--s-video", psnr: [11.49, 11.04, 10.69], miou: [0.008, 0.001, 0.001]},
      {key: "ours", label: "VideoCoS · Blender", color: "--brand", ours: true, psnr: [12.87, 12.98, 12.67], miou: [0.254, 0.230, 0.224]}
    ]
  };
  const GCP = [   /* [T, P] for short, long, total, then Final */
    {name: "Seedance-2.0", s: [87.8, 92.2], l: [74.0, 87.8], t: [77.3, 88.9], f: 81.5},
    {name: "Kling-v3-Pro", s: [62.4, 88.6], l: [57.6, 87.7], t: [58.8, 87.9], f: 69.5},
    {name: "Grok-1.5", s: [71.0, 81.2], l: [61.1, 87.5], t: [63.4, 86.0], f: 71.5},
    {name: "Wan-2.7", s: [72.3, 85.0], l: [61.6, 83.3], t: [64.1, 83.7], f: 70.6},
    {name: "Cosmos-3", s: [19.6, 52.0], l: [13.1, 63.1], t: [14.6, 60.2], f: 19.2},
    {name: "MiniMax-H3", s: [63.4, 79.6], l: [51.5, 79.1], t: [54.3, 79.2], f: 62.7},
    {name: "VideoCoS · Blender", ours: 1, s: [81.3, 53.5], l: [64.2, 48.9], t: [68.2, 50.0], f: 52.5},
    {name: "VideoCoS · Blender + MiniMax-H3", ours: 2, s: [78.3, 67.5], l: [58.8, 70.0], t: [63.5, 69.4], f: 60.1}
  ];
  const FP = {
    metrics: [
      {key: 0, label: "Physics-IQ · all", short: "PIQ all", up: true},
      {key: 1, label: "Physics-IQ · rigid", short: "PIQ rigid", up: true},
      {key: 2, label: "Physics-IQ · non-rigid", short: "PIQ non-rigid", up: true},
      {key: 3, label: "Trajectory error · rigid", short: "ADE rigid", up: false},
      {key: 4, label: "Trajectory error · non-rigid", short: "ADE non-rigid", up: false}
    ],
    rows: [
      {name: "Cosmos3-Super", v: [59.3, 56.8, 64.2, 10.3, 5.4]},
      {name: "Cosmos3-Nano", v: [56.3, 53.5, 61.1, 10.5, 5.5]},
      {name: "Physical Registry", v: [48.8, 46.4, 49.8, 11.9, 5.3]},
      {name: "MiniMax-H3", v: [38.6, 39.8, 38.9, 16.9, 7.7]},
      {name: "VideoCoS · Blender", ours: 1, v: [37.5, 45.1, 31.1, 11.1, 9.9]},
      {name: "VideoCoS · Blender + MiniMax-H3", ours: 2, v: [51.9, 57.8, 48.5, 11.6, 8.0]}
    ]
  };

  /* ---------------- helpers ---------------- */
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const h = (tag, cls, parent, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  const lin = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
  const ease = t => 1 - Math.pow(1 - t, 3);
  const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1);

  /* tween numeric values on a node; `apply` draws them */
  function tw(node, to, apply, dur) {
    dur = dur == null ? 700 : dur;
    const from = node._cur ? Object.assign({}, node._cur) : Object.assign({}, to);
    for (const k in to) if (from[k] == null) from[k] = to[k];
    cancelAnimationFrame(node._raf);
    if (calm || !dur || !node._cur) { node._cur = Object.assign({}, to); apply(node, node._cur); return; }
    const t0 = performance.now();
    const step = now => {
      const u = Math.min(1, (now - t0) / dur), e = ease(u), v = {};
      for (const k in to) v[k] = from[k] + (to[k] - from[k]) * e;
      node._cur = v; apply(node, v);
      if (u < 1) node._raf = requestAnimationFrame(step);
    };
    node._raf = requestAnimationFrame(step);
  }
  const setAttrs = (n, v) => { for (const k in v) n.setAttribute(k, v[k]); };
  function vbar(x, w, y0, y1) {                 /* vertical bar, rounded at the data end */
    const hgt = Math.abs(y1 - y0), r = Math.min(4, hgt, w / 2);
    if (hgt < 0.5) return `M${x},${y0}h${w}`;
    return y1 < y0
      ? `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`
      : `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
  }
  function hbar(y, hh, x0, x1) {                /* horizontal bar, rounded at the data end */
    const w = Math.abs(x1 - x0), r = Math.min(4, w, hh / 2);
    if (w < 0.5) return `M${x0},${y}v${hh}`;
    return x1 > x0
      ? `M${x0},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y + hh - r}Q${x1},${y + hh} ${x1 - r},${y + hh}H${x0}Z`
      : `M${x0},${y}H${x1 + r}Q${x1},${y} ${x1},${y + r}V${y + hh - r}Q${x1},${y + hh} ${x1 + r},${y + hh}H${x0}Z`;
  }
  function spread(items, gap, lo, hi) {         /* push labels apart vertically */
    items.sort((a, b) => a.y - b.y);
    for (let it = 0; it < 30; it++) {
      let moved = false;
      for (let i = 1; i < items.length; i++) {
        const d = items[i].y - items[i - 1].y;
        if (d < gap) { const p = (gap - d) / 2; items[i].y += p; items[i - 1].y -= p; moved = true; }
      }
      for (const t of items) t.y = Math.max(lo, Math.min(hi, t.y));
      if (!moved) break;
    }
    return items;
  }

  /* one tooltip for the page */
  const tip = h("div", "ctip", document.body);
  tip.setAttribute("role", "tooltip");
  function showTip(evt, title, rows) {
    tip.textContent = "";
    if (title) h("div", "ctip-t", tip, title);
    for (const r of rows) {
      const row = h("div", "ctip-r", tip);
      const k = h("i", "ctip-k", row); k.style.background = r.color || "transparent";
      h("b", null, row, r.value);
      h("span", null, row, r.label);
    }
    tip.classList.add("on");
    let x, y;
    if (evt && evt.clientX != null && evt.type !== "focus") { x = evt.clientX; y = evt.clientY; }
    else { const b = evt.target.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top; }
    const tw_ = tip.offsetWidth, th = tip.offsetHeight;
    let left = x + 16, top = y - th - 12;
    if (left + tw_ > innerWidth - 8) left = x - tw_ - 16;
    if (top < 8) top = y + 18;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  const hideTip = () => tip.classList.remove("on");
  function hoverable(node, getTip) {
    node.setAttribute("tabindex", "0");
    const on = e => { const t = getTip(); showTip(e, t.title, t.rows); node.classList.add("hot"); };
    const off = () => { hideTip(); node.classList.remove("hot"); };
    node.addEventListener("pointermove", on); node.addEventListener("focus", on);
    node.addEventListener("pointerleave", off); node.addEventListener("blur", off);
  }

  /* ---------------- the card: controls, chart | table | paper ---------------- */
  function card(root, opts) {
    root.classList.add("vizcard");
    const head = h("div", "viz-head", root);
    const ctrl = h("div", "viz-ctrl", head);
    const views = h("div", "seg viz-views", head);
    views.setAttribute("role", "group"); views.setAttribute("aria-label", "View");
    const body = h("div", "viz-body", root);
    const chart = h("div", "viz-chart", body);
    const svg = svgEl("svg", {role: "img"}, chart);
    const legend = h("div", "viz-legend", root);
    const table = h("div", "viz-table", body);
    const paper = h("div", "viz-paper", body);
    if (opts.paper) { const im = h("img", null, paper); im.loading = "lazy"; im.src = opts.paper; im.alt = opts.paperAlt || ""; }
    table.hidden = paper.hidden = true;
    let view = "chart";
    const viewBtns = [["chart", "Chart"], ["table", "Table"]].concat(opts.paper ? [["paper", "Paper"]] : []).map(([k, t]) => {
      const b = h("button", null, views, t); b.type = "button"; b.setAttribute("aria-pressed", String(k === "chart"));
      b.addEventListener("click", () => {
        view = k; viewBtns.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        chart.hidden = k !== "chart"; legend.hidden = k !== "chart"; table.hidden = k !== "table"; paper.hidden = k !== "paper";
        if (k === "table") opts.table(table); else if (k === "chart") opts.draw(false);
      });
      return b;
    });
    if (opts.note) h("p", "viz-note", root, opts.note);
    return {root, ctrl, svg, legend, chart, table, get view() { return view; }};
  }
  function seg(parent, label, items, initial, onPick) {
    const g = h("div", "seg viz-seg", parent);
    g.setAttribute("role", "group"); g.setAttribute("aria-label", label);
    const btns = items.map(it => {
      const b = h("button", null, g, it.label); b.type = "button"; b.setAttribute("aria-pressed", String(it.key === initial));
      if (it.title) b.title = it.title;
      b.addEventListener("click", () => { btns.forEach(x => x.setAttribute("aria-pressed", String(x === b))); onPick(it.key); });
      return b;
    });
    return g;
  }
  function legendOf(el, items) {
    el.textContent = "";
    for (const it of items) {
      const s = h("span", null, el);
      const k = h("i", it.line ? "lk line" : it.dash ? "lk dash" : "lk", s); k.style.setProperty("--c", it.color);
      s.appendChild(document.createTextNode(it.label));
    }
  }
  /* a sortable table; cols: {key,label,num,up,get(row)}; rows: data objects with .ours */
  function sortable(el, cols, rows, opts) {
    opts = opts || {};
    let sortKey = null, dir = -1;
    const best = {};
    cols.forEach(c => {
      if (!c.num) return;
      const vals = rows.filter(r => !r.ref).map(c.get).filter(v => v != null);
      best[c.key] = c.up === false ? Math.min(...vals) : Math.max(...vals);
    });
    function draw() {
      el.textContent = "";
      const wrap = h("div", "tscroll", el), t = h("table", "dtable", wrap), th = h("thead", null, t), tr = h("tr", null, th), tb = h("tbody", null, t);
      cols.forEach(c => {
        const cell = h("th", c.num ? "num" : null, tr);
        if (c.group) cell.dataset.group = c.group;
        const b = h("button", null, cell, c.label + (c.num ? (c.up === false ? " ↓" : " ↑") : ""));
        b.type = "button";
        if (sortKey === c.key) { b.dataset.dir = dir > 0 ? "asc" : "desc"; cell.setAttribute("aria-sort", dir > 0 ? "ascending" : "descending"); }
        b.addEventListener("click", () => { if (sortKey === c.key) dir = -dir; else { sortKey = c.key; dir = c.num ? (c.up === false ? 1 : -1) : 1; } draw(); });
      });
      const list = rows.slice();
      if (sortKey) {
        const c = cols.find(x => x.key === sortKey);
        list.sort((a, b) => { const va = c.get(a), vb = c.get(b); if (va == null) return 1; if (vb == null) return -1; return (va > vb ? 1 : va < vb ? -1 : 0) * dir; });
      }
      for (const r of list) {
        const row = h("tr", r.ours ? "ours" : r.ref ? "ref" : null, tb);
        cols.forEach(c => {
          const v = c.get(r), td = h("td", c.num ? "num" : null, row);
          td.textContent = v == null ? "–" : c.fmt ? c.fmt(v) : v;
          if (c.num && v != null && v === best[c.key] && !r.ref) td.classList.add("best");
          if (opts.tone) { const t = opts.tone(r, c, v); if (t) td.classList.add(t); }
        });
      }
      if (opts.foot) h("p", "tfoot", el, opts.foot);
    }
    draw();
  }

  /* ---------------- chart 1: reads (Table 2) ---------------- */
  function readChart(root) {
    let reasoner = "Gemini-3.8 Flash", mode = "score";
    const c = card(root, {paper: "assets/paper/tab2_read.png", paperAlt: "Table 2 of the paper",
      note: "VSI-Bench-Debiased. Δ is the change in accuracy from giving the same reasoner the codified scene instead of the video.",
      draw: d => draw(d), table: el => readTable(el)});
    seg(c.ctrl, "Reasoner", Object.keys(READ.reasoners).map(k => ({key: k, label: k})), reasoner, k => { reasoner = k; draw(true); });
    seg(c.ctrl, "Measure", [{key: "score", label: "Accuracy"}, {key: "delta", label: "Δ vs video"}], mode, k => { mode = k; draw(true); });
    const marks = new Map(), labels = new Map();
    let gAxis, gMarks, gLabels;
    function draw(anim) {
      const W = c.chart.clientWidth || 700, H = 340, m = {l: 40, r: 10, t: 22, b: 40};
      const svg = c.svg;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      svg.setAttribute("aria-label", `Accuracy of ${reasoner} on four read tasks`);
      if (!gAxis) { gAxis = svgEl("g", {class: "axis"}, svg); gMarks = svgEl("g", null, svg); gLabels = svgEl("g", {class: "vlabels"}, svg); }
      gAxis.textContent = "";
      const R = READ.reasoners[reasoner];
      const dom = mode === "score" ? [0, 90] : [-25, 25];
      const y = lin(dom[0], dom[1], H - m.b, m.t);
      const ticks = mode === "score" ? [0, 20, 40, 60, 80] : [-20, -10, 0, 10, 20];
      for (const t of ticks) {
        svgEl("line", {x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? "zero" : "grid"}, gAxis);
        svgEl("text", {x: m.l - 8, y: y(t) + 4, "text-anchor": "end"}, gAxis).textContent = mode === "score" ? t : (t > 0 ? "+" : "") + t;
      }
      const gw = (W - m.l - m.r) / READ.tasks.length;
      READ.tasks.forEach((t, i) => {
        const lab = svgEl("text", {x: m.l + gw * (i + .5), y: H - m.b + 22, "text-anchor": "middle", class: "cat" + (i === 4 ? " strong" : "")}, gAxis);
        lab.textContent = t;
      });
      if (true) svgEl("line", {x1: m.l + gw * 4, x2: m.l + gw * 4, y1: m.t - 6, y2: H - m.b, class: "sep"}, gAxis);
      const shown = mode === "score" ? READ.series : READ.series.slice(1);
      const bw = Math.min(30, gw * .72 / 3), gap = 3;
      READ.tasks.forEach((t, i) => {
        READ.series.forEach((s, j) => {
          const key = i + "-" + s.key;
          let node = marks.get(key);
          if (!node) {
            node = svgEl("path", {class: "mark"}, gMarks); marks.set(key, node);
            hoverable(node, () => {
              const r = READ.reasoners[reasoner], v = r[s.key][i], d = v - r.video[i];
              return {title: `${reasoner} · ${READ.tasks[i]}`, rows: READ.series.map((q, qi) => ({
                color: css(q.color), value: r[q.key][i].toFixed(1) + (qi ? `  (${sgn(r[q.key][i] - r.video[i])})` : ""), label: q.label}))};
            });
          }
          node.style.fill = css(s.color);
          const k = shown.indexOf(s), n = shown.length;
          const x = k < 0 ? m.l + gw * (i + .5) : m.l + gw * (i + .5) - (n * bw + (n - 1) * gap) / 2 + k * (bw + gap);
          const v = mode === "score" ? R[s.key][i] : (k < 0 ? 0 : R[s.key][i] - R.video[i]);
          node.style.opacity = k < 0 ? 0 : 1; node.style.pointerEvents = k < 0 ? "none" : "auto";
          tw(node, {x, w: k < 0 ? 0 : bw, y0: y(0 < dom[0] ? dom[0] : 0), y1: y(v)}, (nd, q) => nd.setAttribute("d", vbar(q.x, q.w, q.y0, q.y1)), anim ? 700 : 0);
          /* direct labels: VideoCoS always; BVB too in the delta view */
          const lk = key;
          let lab = labels.get(lk);
          if (!lab) { lab = svgEl("text", {"text-anchor": "middle"}, gLabels); labels.set(lk, lab); }
          const showLab = s.key === "ours" || (mode === "delta" && s.key === "bvb");
          lab.style.opacity = showLab ? 1 : 0;
          lab.textContent = mode === "score" ? R[s.key][i].toFixed(1) : sgn(v);
          lab.setAttribute("class", mode === "delta" ? (v >= 0 ? "pos" : "neg") : "plain");
          const ly = mode === "score" || v >= 0 ? y(v) - 7 : y(v) + 15;
          tw(lab, {x: x + bw / 2, y: ly}, setAttrs, anim ? 700 : 0);
        });
      });
      legendOf(c.legend, shown.map(s => ({label: s.label, color: css(s.color)})));
    }
    draw(false);
    new ResizeObserver(() => { if (c.view === "chart") draw(false); }).observe(c.chart);
    document.addEventListener("vcos:theme", () => draw(false));
    function readTable(el) {
      const rows = [];
      for (const [rn, r] of Object.entries(READ.reasoners)) {
        rows.push({reasoner: rn, state: "Video", v: r.video, ref: false, base: r.video});
        rows.push({reasoner: rn, state: "Code (BVB)", v: r.bvb, base: r.video});
        rows.push({reasoner: rn, state: "Code (VideoCoS)", v: r.ours, ours: true, base: r.video});
      }
      const cols = [{key: "r", label: "Reasoner", get: r => r.reasoner}, {key: "s", label: "State", get: r => r.state}]
        .concat(READ.tasks.map((t, i) => ({key: "t" + i, label: t, num: true, get: r => r.v[i], fmt: v => v.toFixed(1)})));
      sortable(el, cols, rows, {
        tone: (r, c, v) => (c.num && r.state !== "Video") ? (v > r.base[+c.key.slice(1)] ? "up" : v < r.base[+c.key.slice(1)] ? "down" : null) : null,
        foot: "Click a column to sort. Green and red mark gains and losses against the same reasoner on video; bold is the column's best."});
    }
  }

  /* ---------------- chart 2: novel-view synthesis (Table 3) ---------------- */
  function nvsChart(root) {
    let metric = "miou";
    const c = card(root, {paper: "assets/paper/tab3_nvs.png", paperAlt: "Table 3 of the paper",
      note: "Kubric-4D. The camera moves 42°, 97° or 128° away from the input view. Object mIoU measures whether the objects land where they should; the dashed line is the score of the ground-truth render.",
      draw: d => draw(d), table: el => nvsTable(el)});
    seg(c.ctrl, "Metric", [{key: "miou", label: "Object mIoU ↑"}, {key: "psnr", label: "PSNR ↑"}], metric, k => { metric = k; draw(true); });
    let g;
    const lines = new Map();
    function draw(anim) {
      const W = c.chart.clientWidth || 700, H = 340, m = {l: 50, r: 150, t: 22, b: 42};
      const svg = c.svg;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      svg.setAttribute("aria-label", `Novel-view synthesis, ${metric === "miou" ? "object mIoU" : "PSNR"} against camera shift`);
      if (!g) { g = {axis: svgEl("g", {class: "axis"}, svg), gt: svgEl("g", null, svg), lines: svgEl("g", null, svg), dots: svgEl("g", null, svg), labs: svgEl("g", {class: "elabels"}, svg), hair: svgEl("line", {class: "hair"}, svg), hit: svgEl("rect", {fill: "transparent"}, svg)}; bindHover(); }
      g.axis.textContent = ""; g.gt.textContent = ""; g.dots.textContent = ""; g.labs.textContent = "";
      const dom = metric === "miou" ? [0, 0.7] : [8, 14];
      const ticks = metric === "miou" ? [0, .1, .2, .3, .4, .5, .6, .7] : [8, 9, 10, 11, 12, 13, 14];
      const x = lin(30, 140, m.l, W - m.r), y = lin(dom[0], dom[1], H - m.b, m.t);
      for (const t of ticks) {
        svgEl("line", {x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "grid"}, g.axis);
        svgEl("text", {x: m.l - 8, y: y(t) + 4, "text-anchor": "end"}, g.axis).textContent = metric === "miou" ? t.toFixed(1) : t;
      }
      NVS.shifts.forEach(s => {
        svgEl("text", {x: x(s.deg), y: H - m.b + 20, "text-anchor": "middle", class: "cat"}, g.axis).textContent = `${s.name} · ${s.deg}°`;
      });
      svgEl("text", {x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", class: "axt"}, g.axis).textContent = "camera shift from the input view";
      if (metric === "miou") {
        const pts = NVS.shifts.map((s, i) => [x(s.deg), y(NVS.gt.miou[i])]);
        svgEl("path", {d: "M" + pts.map(p => p.join(",")).join("L"), class: "gtline"}, g.gt);
        svgEl("text", {x: W - m.r + 10, y: pts[2][1] + 4, class: "gtlab"}, g.gt).textContent = "Ground-truth render";
      }
      const labs = [];
      NVS.series.forEach(s => {
        let p = lines.get(s.key);
        if (!p) { p = svgEl("path", {class: "sline" + (s.ours ? " ours" : "")}, g.lines); lines.set(s.key, p); }
        p.style.stroke = css(s.color);
        const vals = s[metric];
        const to = {}; vals.forEach((v, i) => { to["x" + i] = x(NVS.shifts[i].deg); to["y" + i] = y(v); });
        tw(p, to, (nd, q) => nd.setAttribute("d", `M${q.x0},${q.y0}L${q.x1},${q.y1}L${q.x2},${q.y2}`), anim ? 750 : 0);
        vals.forEach((v, i) => {
          const d = svgEl("circle", {cx: x(NVS.shifts[i].deg), cy: y(v), r: s.ours ? 5.5 : 4, class: "sdot"}, g.dots);
          d.style.fill = css(s.color);
          if (anim && !calm) { d.style.opacity = 0; setTimeout(() => { d.style.opacity = 1; }, 560); }
        });
        labs.push({s, y: y(vals[2])});
      });
      spread(labs, 15, m.t, H - m.b);
      labs.forEach(l => {
        const t = svgEl("text", {x: W - m.r + 10, y: l.y + 4, class: l.s.ours ? "strong" : ""}, g.labs);
        t.textContent = l.s.label;
      });
      if (metric === "miou") {
        const o = NVS.series[3].miou[0], b = Math.max(...NVS.series.slice(0, 3).map(s => s.miou[0]));
        const callout = svgEl("text", {x: x(42) + 10, y: y(o) - 14, class: "callout"}, g.labs);
        callout.textContent = `${(o / b).toFixed(1)}× the best diffusion model`;
      }
      g.hit.setAttribute("x", m.l); g.hit.setAttribute("y", m.t); g.hit.setAttribute("width", W - m.l - m.r); g.hit.setAttribute("height", H - m.t - m.b);
      g.hair.setAttribute("y1", m.t); g.hair.setAttribute("y2", H - m.b);
      g._x = x;
      legendOf(c.legend, NVS.series.map(s => ({label: s.label, color: css(s.color), line: true})).concat(metric === "miou" ? [{label: "Ground-truth render", color: css("--faint"), dash: true}] : []));
    }
    function bindHover() {
      const move = e => {
        const r = c.svg.getBoundingClientRect(), vb = c.svg.viewBox.baseVal, px = (e.clientX - r.left) * vb.width / r.width;
        let best = 0, bd = 1e9;
        NVS.shifts.forEach((s, i) => { const d = Math.abs(g._x(s.deg) - px); if (d < bd) { bd = d; best = i; } });
        const sx = g._x(NVS.shifts[best].deg);
        g.hair.setAttribute("x1", sx); g.hair.setAttribute("x2", sx); g.hair.classList.add("on");
        const rows = NVS.series.slice().sort((a, b) => b[metric][best] - a[metric][best]).map(s => ({color: css(s.color), value: metric === "miou" ? s.miou[best].toFixed(3) : s.psnr[best].toFixed(2), label: s.label}));
        if (metric === "miou") rows.push({color: "", value: NVS.gt.miou[best].toFixed(3), label: "Ground-truth render"});
        showTip(e, `${NVS.shifts[best].name} shift · ${NVS.shifts[best].deg}°`, rows);
      };
      g.hit.addEventListener("pointermove", move);
      g.hit.addEventListener("pointerleave", () => { g.hair.classList.remove("on"); hideTip(); });
    }
    draw(false);
    new ResizeObserver(() => { if (c.view === "chart") draw(false); }).observe(c.chart);
    document.addEventListener("vcos:theme", () => draw(false));
    function nvsTable(el) {
      const rows = [{name: "Ground truth", ref: true, psnr: [null, null, null], miou: NVS.gt.miou}].concat(NVS.series.map(s => ({name: s.label, ours: s.ours, psnr: s.psnr, miou: s.miou})));
      const cols = [{key: "n", label: "Method", get: r => r.name}];
      NVS.shifts.forEach((s, i) => {
        cols.push({key: "p" + i, label: `${s.name} PSNR`, num: true, get: r => r.psnr[i], fmt: v => v.toFixed(2), group: s.name});
        cols.push({key: "m" + i, label: `${s.name} mIoU`, num: true, get: r => r.miou[i], fmt: v => v.toFixed(3), group: s.name});
      });
      sortable(el, cols, rows, {foot: "Click a column to sort. Bold is the best method in each column; the ground-truth row is a reference."});
    }
  }

  /* ---------------- chart 3: goal-conditioned planning (Table 4) ---------------- */
  function gcpChart(root) {
    let split = "t";
    const c = card(root, {paper: "assets/paper/tab4_gcp.png", paperAlt: "Table 4 of the paper",
      note: "Ego2Act. T is task completion and P is physical plausibility. Generators sit high on P; planning in the state reaches high T, and rendering the plan with MiniMax-H3 trades some of it for plausibility.",
      draw: d => draw(d), table: el => gcpTable(el)});
    seg(c.ctrl, "Tasks", [{key: "s", label: "Short (≤ 15 s)"}, {key: "l", label: "Long (> 15 s)"}, {key: "t", label: "All"}], split, k => { split = k; draw(true); });
    let g; const dots = new Map(), tags = new Map();
    function draw(anim) {
      const W = c.chart.clientWidth || 700, H = 380, m = {l: 50, r: 24, t: 20, b: 46};
      const svg = c.svg;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      svg.setAttribute("aria-label", "Task completion against physical plausibility on Ego2Act");
      if (!g) {
        g = {axis: svgEl("g", {class: "axis"}, svg), arrow: svgEl("g", null, svg), dots: svgEl("g", null, svg), tags: svgEl("g", {class: "elabels"}, svg)};
        const defs = svgEl("defs", null, svg), mk = svgEl("marker", {id: "arrowhead", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse"}, defs);
        svgEl("path", {d: "M0,0L10,5L0,10z", class: "ahead"}, mk);
      }
      g.axis.textContent = ""; g.arrow.textContent = "";
      const x = lin(0, 100, m.l, W - m.r), y = lin(40, 100, H - m.b, m.t);
      for (let t = 0; t <= 100; t += 20) {
        svgEl("line", {x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, class: "grid"}, g.axis);
        svgEl("text", {x: x(t), y: H - m.b + 18, "text-anchor": "middle"}, g.axis).textContent = t;
      }
      for (let t = 40; t <= 100; t += 10) {
        svgEl("line", {x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "grid"}, g.axis);
        svgEl("text", {x: m.l - 8, y: y(t) + 4, "text-anchor": "end"}, g.axis).textContent = t;
      }
      svgEl("text", {x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", class: "axt"}, g.axis).textContent = "task completion T →";
      const yl = svgEl("text", {x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", class: "axt", transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})`}, g.axis);
      yl.textContent = "physical plausibility P →";
      const a = GCP[6][split], b = GCP[7][split];
      const ar = svgEl("path", {class: "arrowline", d: `M${x(a[0])},${y(a[1])}L${x(b[0])},${y(b[1])}`, "marker-end": "url(#arrowhead)"}, g.arrow);
      const dx = x(b[0]) - x(a[0]), dy = y(b[1]) - y(a[1]), L = Math.hypot(dx, dy) || 1;
      ar.setAttribute("d", `M${x(a[0]) + dx / L * 10},${y(a[1]) + dy / L * 10}L${x(b[0]) - dx / L * 11},${y(b[1]) - dy / L * 11}`);
      if (anim && !calm) { ar.style.strokeDasharray = L; ar.style.strokeDashoffset = L; requestAnimationFrame(() => setTimeout(() => { ar.style.transition = "stroke-dashoffset .6s ease .45s"; ar.style.strokeDashoffset = 0; }, 20)); }
      const at = svgEl("text", {x: (x(a[0]) + x(b[0])) / 2 + 10, y: (y(a[1]) + y(b[1])) / 2, class: "callout"}, g.arrow);
      at.textContent = "render the plan with MiniMax-H3";
      const over = +at.getAttribute("x") + at.getComputedTextLength() - (W - 6);
      if (over > 0) at.setAttribute("x", Math.max(4, +at.getAttribute("x") - over));          /* on a narrow chart, slide it back inside */
      const tagList = [];
      GCP.forEach(r => {
        let d = dots.get(r.name);
        if (!d) {
          d = svgEl("g", {class: "pt" + (r.ours ? " ours" + r.ours : "")}, g.dots); dots.set(r.name, d);
          svgEl("circle", {r: 16, class: "hit"}, d); svgEl("circle", {r: r.ours ? 7 : 6, class: "dot"}, d);
          hoverable(d, () => ({title: r.name, rows: [
            {color: "", value: r[split][0].toFixed(1), label: "task completion T"},
            {color: "", value: r[split][1].toFixed(1), label: "physical plausibility P"},
            {color: "", value: r.f.toFixed(1), label: "Final, all tasks (mean √TP)"}]}));
        }
        d.querySelector(".dot").style.fill = r.ours === 1 ? css("--brand") : r.ours === 2 ? css("--ours2") : css("--s-video");
        const px = x(r[split][0]), py = y(r[split][1]);
        tw(d, {x: px, y: py}, (nd, q) => nd.setAttribute("transform", `translate(${q.x},${q.y})`), anim ? 750 : 0);
        tagList.push({r, x: px, y: py});
      });
      /* labels: right of the dot, nudged apart */
      g.tags.textContent = "";
      spread(tagList, 15, m.t + 6, H - m.b - 4).forEach(t => {
        const right = t.x < W - 210;
        const el = svgEl("text", {x: t.x + (right ? 12 : -12), y: t.y + 4, "text-anchor": right ? "start" : "end", class: t.r.ours ? "strong" : ""}, g.tags);
        el.textContent = t.r.name.replace("VideoCoS · ", "VideoCoS · ");
        if (anim && !calm) { el.style.opacity = 0; setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = 1; }, 600); }
      });
      legendOf(c.legend, [{label: "Video generators", color: css("--s-video")}, {label: "VideoCoS · Blender", color: css("--brand")}, {label: "VideoCoS · Blender + MiniMax-H3", color: css("--ours2")}]);
    }
    draw(false);
    new ResizeObserver(() => { if (c.view === "chart") draw(false); }).observe(c.chart);
    document.addEventListener("vcos:theme", () => draw(false));
    function gcpTable(el) {
      const cols = [{key: "n", label: "Method", get: r => r.name}];
      [["s", "Short"], ["l", "Long"], ["t", "Total"]].forEach(([k, n]) => {
        cols.push({key: k + "T", label: `${n} T`, num: true, get: r => r[k][0], fmt: v => v.toFixed(1)});
        cols.push({key: k + "P", label: `${n} P`, num: true, get: r => r[k][1], fmt: v => v.toFixed(1)});
      });
      cols.push({key: "f", label: "Final", num: true, get: r => r.f, fmt: v => v.toFixed(1)});
      sortable(el, cols, GCP, {foot: "Click a column to sort. Final averages the per-video √(T·P)."});
    }
  }

  /* ---------------- chart 4: future prediction (Table 5) ---------------- */
  function fpChart(root) {
    let metric = 3;
    const c = card(root, {paper: "assets/paper/tab5_fp.png", paperAlt: "Table 5 of the paper",
      note: "Physics-IQ. Rigid covers rolling, falling, colliding and magnet-driven motion; non-rigid covers deformation, fracture and liquids. Rows re-sort, best first, as you switch the metric.",
      draw: d => draw(d), table: el => fpTable(el)});
    seg(c.ctrl, "Metric", FP.metrics.map(q => ({key: q.key, label: q.short + (q.up ? " ↑" : " ↓"), title: q.label})), metric, k => { metric = k; draw(true); });
    let g; const rows = new Map();
    function draw(anim) {
      const W = c.chart.clientWidth || 700, rowH = 44, m = {l: Math.min(250, W * .36), r: 60, t: 10, b: 30};
      const H = m.t + m.b + rowH * FP.rows.length;
      const svg = c.svg;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      const M = FP.metrics[metric];
      svg.setAttribute("aria-label", `Future prediction, ${M.label}`);
      if (!g) { g = {axis: svgEl("g", {class: "axis"}, svg), rows: svgEl("g", null, svg)}; }
      g.axis.textContent = "";
      const max = Math.max(...FP.rows.map(r => r.v[metric])) * 1.12;
      const x = lin(0, max, m.l, W - m.r);
      const step = max > 30 ? 10 : 2;
      for (let t = 0; t <= max; t += step) {
        svgEl("line", {x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, class: t ? "grid" : "zero"}, g.axis);
        svgEl("text", {x: x(t), y: H - m.b + 18, "text-anchor": "middle"}, g.axis).textContent = t;
      }
      svgEl("text", {x: W - m.r, y: H - 2, "text-anchor": "end", class: "axt"}, g.axis).textContent = M.up ? "higher is better" : "lower is better";
      const order = FP.rows.slice().sort((a, b) => M.up ? b.v[metric] - a.v[metric] : a.v[metric] - b.v[metric]);
      order.forEach((r, i) => {
        let n = rows.get(r.name);
        if (!n) {
          n = svgEl("g", {class: "frow" + (r.ours ? " ours" : "")}, g.rows); rows.set(r.name, n);
          n._hit = svgEl("rect", {fill: "transparent"}, n);
          n._name = svgEl("text", {"text-anchor": "end", class: "rname"}, n); n._name.textContent = r.name;
          n._bar = svgEl("path", {class: "mark"}, n);
          n._val = svgEl("text", {class: "rval"}, n);
          n._rank = svgEl("text", {"text-anchor": "end", class: "rrank"}, n);
          hoverable(n, () => ({title: r.name, rows: FP.metrics.map(q => ({color: q.key === metric ? css("--brand") : "", value: r.v[q.key].toFixed(1), label: q.label + (q.up ? " ↑" : " ↓")}))}));
        }
        n._bar.style.fill = r.ours === 1 ? css("--brand") : r.ours === 2 ? css("--ours2") : css("--s-video");
        n._hit.setAttribute("x", 0); n._hit.setAttribute("width", W); n._hit.setAttribute("height", rowH);
        n._name.setAttribute("x", m.l - 12); n._name.setAttribute("y", rowH / 2 + 5);
        n._rank.setAttribute("x", 18); n._rank.setAttribute("y", rowH / 2 + 5); n._rank.textContent = i + 1;
        const v = r.v[metric];
        tw(n, {y: m.t + i * rowH}, (nd, q) => nd.setAttribute("transform", `translate(0,${q.y})`), anim ? 650 : 0);
        tw(n._bar, {x1: x(v)}, (nd, q) => nd.setAttribute("d", hbar(rowH * .24, rowH * .52, x(0), q.x1)), anim ? 650 : 0);
        n._val.textContent = v.toFixed(1);
        tw(n._val, {x: x(v) + 8}, (nd, q) => { nd.setAttribute("x", q.x); nd.setAttribute("y", rowH / 2 + 5); }, anim ? 650 : 0);
      });
      legendOf(c.legend, [{label: "Video generators", color: css("--s-video")}, {label: "VideoCoS · Blender", color: css("--brand")}, {label: "VideoCoS · Blender + MiniMax-H3", color: css("--ours2")}]);
    }
    draw(false);
    new ResizeObserver(() => { if (c.view === "chart") draw(false); }).observe(c.chart);
    document.addEventListener("vcos:theme", () => draw(false));
    function fpTable(el) {
      const cols = [{key: "n", label: "Method", get: r => r.name}].concat(FP.metrics.map(q => ({key: "m" + q.key, label: q.short, num: true, up: q.up, get: r => r.v[q.key], fmt: v => v.toFixed(1)})));
      sortable(el, cols, FP.rows, {foot: "Click a column to sort. Physics-IQ: higher is better; trajectory error (ADE): lower is better."});
    }
  }

  /* ---------------- the ten axes of Figure 1: the same model with and without an executable state ---------------- */
  function helpItems(reasoner) {
    const rel = (a, b, up) => (up === false ? (a - b) / a : (b - a) / a) * 100;
    const r = READ.reasoners[reasoner];
    const axes = ["Counting", "Geometry", "Viewpoint", "History"];
    const read = READ.tasks.slice(0, 4).map((t, i) => ({fam: "read", group: "Read · querying", axis: axes[i], task: t + " querying", a: r.video[i], b: r.ours[i], up: true,
      from: `${reasoner} on video`, to: `${reasoner} on the VideoCoS scene`, unit: " acc.", go: "#res-read"}));
    const bestPsnr = Math.max(...NVS.series.slice(0, 3).map(s => s.psnr[0])), bestMiou = Math.max(...NVS.series.slice(0, 3).map(s => s.miou[0]));
    return read.concat([
      {fam: "write", group: "Write · novel view", axis: "Image quality", task: "Novel view · image quality", a: bestPsnr, b: NVS.series[3].psnr[0], up: true, from: "best diffusion NVS model (42°)", to: "VideoCoS · Blender", dec: 2, unit: " dB PSNR", go: "#res-nvs"},
      {fam: "write", group: "Write · novel view", axis: "Object placement", task: "Novel view · object placement", a: bestMiou, b: NVS.series[3].miou[0], up: true, from: "best diffusion NVS model (42°)", to: "VideoCoS · Blender", dec: 3, unit: " mIoU", go: "#res-nvs"},
      {fam: "write", group: "Write · planning", axis: "Goal completion", task: "Planning · goal completion", a: GCP[5].t[0], b: GCP[7].t[0], up: true, from: "MiniMax-H3 alone", to: "VideoCoS plan + MiniMax-H3", unit: " T", go: "#res-gcp"},
      {fam: "write", group: "Write · planning", axis: "Physical realism", task: "Planning · physical realism", a: GCP[5].t[1], b: GCP[7].t[1], up: true, from: "MiniMax-H3 alone", to: "VideoCoS plan + MiniMax-H3", unit: " P", go: "#res-gcp"},
      {fam: "write", group: "Write · prediction", axis: "Physical understanding", task: "Prediction · physical understanding", a: FP.rows[3].v[0], b: FP.rows[5].v[0], up: true, from: "MiniMax-H3 alone", to: "VideoCoS plan + MiniMax-H3", unit: " Physics-IQ", go: "#res-fp"},
      {fam: "write", group: "Write · prediction", axis: "Trajectory accuracy", task: "Prediction · trajectory accuracy", a: FP.rows[3].v[3], b: FP.rows[5].v[3], up: false, from: "MiniMax-H3 alone", to: "VideoCoS plan + MiniMax-H3", unit: " ADE (lower is better)", go: "#res-fp"}
    ]).map(d => Object.assign(d, {pct: rel(d.a, d.b, d.up), ratio: d.up === false ? d.a / d.b : d.b / d.a}));
  }

  /* ---------------- chart 5: where the state helps and hurts (summary) ---------------- */
  function helpChart(root) {
    let reasoner = "Gemini-3.8 Flash";
    const items = () => helpItems(reasoner);
    const c = card(root, {
      note: "The ten axes of Figure 1: relative change from giving the same model an executable state (for novel views, against the best diffusion model at a 42° shift). Bars past ±60% are clipped; hover for the raw numbers, click a bar to jump to its results.",
      draw: d => draw(d), table: el => {
        const cols = [{key: "f", label: "Family", get: r => r.fam}, {key: "t", label: "Task", get: r => r.task}, {key: "w", label: "Without", get: r => r.from}, {key: "a", label: "Score", num: true, get: r => r.a, fmt: v => v.toFixed(3).replace(/\.?0+$/, "")}, {key: "b", label: "With state", num: true, get: r => r.b, fmt: v => v.toFixed(3).replace(/\.?0+$/, "")}, {key: "p", label: "Change %", num: true, get: r => r.pct, fmt: v => (v > 0 ? "+" : "") + v.toFixed(1) + "%"}];
        sortable(el, cols, items(), {tone: (r, col) => col.key === "p" ? (r.pct > 0 ? "up" : "down") : null});
      }});
    seg(c.ctrl, "Reasoner for the read tasks", Object.keys(READ.reasoners).map(k => ({key: k, label: k})), reasoner, k => { reasoner = k; draw(true); });
    let g; const bars = new Map();
    function draw(anim) {
      const W = c.chart.clientWidth || 700, rowH = 34, m = {l: Math.min(260, W * .4), r: 70, t: 30, b: 28};
      const list = items(), H = m.t + m.b + rowH * list.length + 14;
      const svg = c.svg;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
      svg.setAttribute("aria-label", "Where executable world states help and hurt, relative change per task");
      if (!g) { g = {axis: svgEl("g", {class: "axis"}, svg), bars: svgEl("g", null, svg)}; }
      g.axis.textContent = "";
      const lim = 60, x = lin(-lim, lim, m.l, W - m.r);
      [-60, -30, 0, 30, 60].forEach(t => {
        svgEl("line", {x1: x(t), x2: x(t), y1: m.t - 6, y2: H - m.b, class: t ? "grid" : "zero"}, g.axis);
        svgEl("text", {x: x(t), y: H - m.b + 18, "text-anchor": "middle"}, g.axis).textContent = (t > 0 ? "+" : "") + t + "%";
      });
      svgEl("text", {x: x(-lim / 2), y: 16, "text-anchor": "middle", class: "hurt"}, g.axis).textContent = "← hurts";
      svgEl("text", {x: x(lim / 2), y: 16, "text-anchor": "middle", class: "help"}, g.axis).textContent = "helps →";
      list.forEach((d, i) => {
        const yy = m.t + i * rowH + (d.fam === "write" ? 14 : 0);
        if (i === 4) svgEl("line", {x1: 8, x2: W - 8, y1: yy - 7, y2: yy - 7, class: "sep"}, g.axis);
        if (i === 0 || i === 4) { const ft = svgEl("text", {x: 8, y: yy + rowH / 2 + 4, class: "fam " + d.fam}, g.axis); ft.textContent = d.fam === "read" ? "READ" : "WRITE"; }
        let n = bars.get(i);
        if (!n) {
          n = svgEl("g", {class: "hrow"}, g.bars); bars.set(i, n);
          n._hit = svgEl("rect", {fill: "transparent", height: rowH}, n);
          n._name = svgEl("text", {"text-anchor": "end", class: "rname"}, n);
          n._bar = svgEl("path", {class: "mark"}, n);
          n._val = svgEl("text", {class: "rval"}, n);
          hoverable(n, () => { const q = items()[i]; const f = v => v.toFixed(q.dec || 1);
            return {title: q.task, rows: [{color: css("--s-video"), value: f(q.a) + q.unit, label: q.from}, {color: css("--brand"), value: f(q.b) + q.unit, label: q.to}, {color: "", value: (q.pct > 0 ? "+" : "") + q.pct.toFixed(1) + "%", label: "relative change"}]}; });
          n.addEventListener("click", () => { const t = document.querySelector(items()[i].go); if (t) t.scrollIntoView({behavior: calm ? "auto" : "smooth", block: "start"}); });
        }
        n.setAttribute("transform", `translate(0,${yy})`);
        n._hit.setAttribute("width", W);
        n._name.setAttribute("x", m.l - 14); n._name.setAttribute("y", rowH / 2 + 4); n._name.textContent = d.task;
        const clipped = Math.max(-lim, Math.min(lim, d.pct));
        n._bar.style.fill = d.pct >= 0 ? css("--read-fill") : css("--coral");
        tw(n._bar, {x1: x(clipped)}, (nd, q) => nd.setAttribute("d", hbar(rowH * .2, rowH * .6, x(0), q.x1)), anim ? 700 : 0);
        n._val.textContent = (d.pct > 0 ? "+" : "") + (Math.abs(d.pct) >= 100 ? Math.round(d.pct) : d.pct.toFixed(1)) + "%" + (Math.abs(d.pct) > lim ? " ▸" : "");
        n._val.setAttribute("text-anchor", d.pct >= 0 ? "start" : "end");
        n._val.setAttribute("class", "rval " + (d.pct >= 0 ? "pos" : "neg"));
        tw(n._val, {x: x(clipped) + (d.pct >= 0 ? 8 : -8)}, (nd, q) => { nd.setAttribute("x", q.x); nd.setAttribute("y", rowH / 2 + 4); }, anim ? 700 : 0);
      });
      legendOf(c.legend, [{label: "helps", color: css("--read-fill")}, {label: "hurts", color: css("--coral")}]);
    }
    draw(false);
    new ResizeObserver(() => { if (c.view === "chart") draw(false); }).observe(c.chart);
    document.addEventListener("vcos:theme", () => draw(false));
  }

  window.VCOS_VIZ = {svgEl, h, lin, tw, setAttrs, vbar, hbar, spread, showTip, hideTip, hoverable, card, seg, legendOf, sortable, css, sgn, calm, READ, NVS, GCP, FP, helpItems};
  const make = {read: readChart, nvs: nvsChart, gcp: gcpChart, fp: fpChart, help: helpChart};
  document.querySelectorAll("[data-viz]").forEach(el => { const f = make[el.dataset.viz]; if (f) f(el); });
})();
