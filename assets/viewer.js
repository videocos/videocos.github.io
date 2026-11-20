/* The interactive world state: a three.js view of a codified scene. It starts when its section nears the viewport.
   Values in the console are read from the same world-space bounds the harness tools use (metres, Blender axes, Z up). */
(function () {
  "use strict";
  const root = document.getElementById("viewer");
  if (!root) return;
  const $ = s => root.querySelector(s);
  const stage = $(".v-stage"), poster = $(".v-poster"), statusEl = $(".v-status"), hintEl = $(".v-hint");
  const consolePre = $(".console pre"), consoleMode = $(".console .cbar span:last-child"), consoleFile = $(".console .cbar span:first-child");
  const tagA = $(".v-tag.a"), tagB = $(".v-tag.b"), tagD = $(".v-tag.d");
  const srcTitle = $(".v-src b"), srcText = $(".v-src span");
  const timeWrap = $(".v-time"), slider = timeWrap.querySelector("input"), playBtn = timeWrap.querySelector("button"), timeOut = timeWrap.querySelector("output");
  const pip = $(".v-pip"), pipVideo = pip ? pip.querySelector("video") : null;      /* the input video, in step with the timeline */
  const codeDetails = document.getElementById("scene-code"), codeName = codeDetails.querySelector("summary span"), codePre = codeDetails.querySelector("pre");
  const sceneBtns = [...root.querySelectorAll("[data-scene]")], modeBtns = [...root.querySelectorAll("[data-mode]")];
  const cbPath = $("#v-path"), cbCeil = $("#v-ceil"), cbSpin = $("#v-spin");
  const askWrap = $(".ask-chips"), undoBtn = root.querySelector("[data-view=undo]");
  const hl = window.VCOS.hl;
  const SCENES = window.VCOS_SCENES || {};
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let T, renderer, scene, camera, controls, raycaster, sun, model = null, mixer = null, clip = null, info = null;
  let walls = [], ceilings = [], center = null, home = null, pathMesh = null, marker = null, path = [];
  let onScreen = false, started = false, engaged = false, playing = false, frame = 1, mode = "inspect", lastTick = 0, shadowDirty = true;
  let selA = null, selB = null, boxA = null, boxB = null, line = null, loadToken = 0, lastSeek = 0, fly = null;
  let objMap = new Map(), askBoxes = [], askRun = 0, drag = null, edits = new Map();

  const setStatus = t => { statusEl.textContent = t || ""; };
  const fmt = (v, d = 3) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(d);
  const tagged = o => { while (o && !(o.userData && o.userData.kind)) o = o.parent; return o; };
  const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };

  function start() {
    if (started) return;
    started = true;
    T = window.THREE;
    if (!T || !T.GLTFLoader || !T.OrbitControls) { setStatus("The 3D library did not load; showing the still."); return; }
    try {
      renderer = new T.WebGLRenderer({antialias: true, alpha: true, powerPreference: "high-performance"});
    } catch (e) { setStatus("This browser has no WebGL; showing the still."); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = !window.matchMedia("(max-width: 720px)").matches;
    renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", "3D view of the scene: drag to orbit, scroll to zoom, click an object");
    stage.insertBefore(renderer.domElement, stage.firstChild);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(30, 1, 0.1, 200);
    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.9;
    controls.maxPolarAngle = Math.PI * 0.485; controls.minPolarAngle = 0.04; controls.enableZoom = false; controls.autoRotateSpeed = 0.55;
    scene.add(new T.HemisphereLight(0xffffff, 0xb9a890, 0.78));
    scene.add(new T.AmbientLight(0xffffff, 0.2));
    sun = new T.DirectionalLight(0xfff4e6, 1.25);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);
    raycaster = new T.Raycaster();
    new ResizeObserver(resize).observe(stage); resize();
    bind();
    load(root.dataset.first || "apartment");
    requestAnimationFrame(tick);
  }

  function resize() {
    if (!renderer) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function script(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
  }
  function bytes(b64) {
    const bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }

  async function load(key) {
    const s = SCENES[key];
    if (!s) return;
    const token = ++loadToken;
    sceneBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.scene === key)));
    setStatus(`Loading ${s.title.toLowerCase()} · ${(s.glb_bytes / 1048576).toFixed(1)} MB`);
    try {
      if (!(window.VCOS_GLB && window.VCOS_GLB[key])) await script(s.glb);
      if (token !== loadToken) return;
      const buf = bytes(window.VCOS_GLB[key]);
      new T.GLTFLoader().parse(buf, "", g => { if (token === loadToken) setup(key, s, g); }, e => setStatus("The model could not be read."));
    } catch (e) { setStatus("The model could not be loaded; showing the still."); }
  }

  function setup(key, s, gltf) {
    if (model) { scene.remove(model); model.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    [pathMesh, marker, boxA, boxB, line].forEach(o => o && scene.remove(o));
    pathMesh = marker = boxA = boxB = line = null; selA = selB = null; mixer = null; clip = null;
    info = s; model = gltf.scene; scene.add(model);
    clearAsk(); edits = new Map(); if (undoBtn) undoBtn.hidden = true; objMap = new Map();
    model.traverse(o => { if (o.userData && o.userData.kind === "obj") { objMap.set(label(o), o); if (o.name) objMap.set(o.name, o); } });
    walls = []; ceilings = [];
    model.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.side = T.FrontSide; if (o.material.vertexColors) o.material.color.setRGB(1, 1, 1); } }
      const u = o.userData || {};
      if (u.kind === "ceiling") ceilings.push(o);
      else if (typeof u.nx === "number" && typeof u.nz === "number") walls.push({o, nx: u.nx, nz: u.nz});
    });
    const lo = new T.Vector3(...s.meta.room.lo), hi = new T.Vector3(...s.meta.room.hi);
    center = lo.clone().add(hi).multiplyScalar(0.5); center.y = lo.y + 0.9;
    const r = lo.distanceTo(hi) / 2, az = (s.az || 220) * Math.PI / 180, el = 40 * Math.PI / 180;
    const dist = r / Math.sin(camera.fov * Math.PI / 360) * 0.86;
    home = new T.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), -Math.sin(az) * Math.cos(el)).multiplyScalar(dist).add(center);
    camera.position.copy(home); controls.target.copy(center); controls.minDistance = 1.2; controls.maxDistance = dist * 1.9; controls.update();
    sun.position.set(center.x - r * 0.45, lo.y + r * 1.7, center.z + r * 0.35); sun.target.position.copy(center);
    const c = sun.shadow.camera; c.left = -r * 1.15; c.right = r * 1.15; c.top = r * 1.15; c.bottom = -r * 1.15; c.near = 0.5; c.far = r * 4; c.updateProjectionMatrix();
    /* the source camera: its path and where it is now */
    path = s.meta.camera_path || [];
    if (path.length > 2) {
      const pts = [];                                       /* standing still gives repeated points, which break the spline */
      for (const p of path) { const v = new T.Vector3(p[1], p[2], p[3]); if (!pts.length || pts[pts.length - 1].distanceTo(v) > 0.03) pts.push(v); }
      const curve = new T.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
      pathMesh = new T.Mesh(new T.TubeGeometry(curve, Math.min(1400, pts.length * 3), 0.028, 6, false), new T.MeshBasicMaterial({color: 0x3d63ff}));
      scene.add(pathMesh);
      const cone = new T.ConeGeometry(0.2, 0.42, 4, 1, false); cone.translate(0, -0.21, 0);
      marker = new T.Mesh(cone, new T.MeshBasicMaterial({color: 0xff8a1f})); scene.add(marker);
    }
    if (gltf.animations && gltf.animations.length) {
      mixer = new T.AnimationMixer(model); clip = gltf.animations[0];
      const act = mixer.clipAction(clip); act.setLoop(T.LoopOnce, 1); act.clampWhenFinished = true; act.play();   /* advanced only by setTime */
    }
    slider.min = 1; slider.max = s.meta.frames; slider.value = 1; frame = 1; playing = false; playBtn.setAttribute("aria-label", "Play the timeline"); playBtn.innerHTML = PLAY;
    srcTitle.textContent = s.source; srcText.textContent = s.note;
    if (pipVideo) {
      pipVideo.pause();
      if (s.video) { pip.hidden = false; pip.style.setProperty("--par", s.video_ar || "4 / 3"); pipVideo.src = s.video; pipVideo.load(); }
      else { pip.hidden = true; pipVideo.removeAttribute("src"); }
    }
    codeName.textContent = s.code_name; codePre.innerHTML = hl(s.code);
    setFrame(1); setMode(mode); cull(true); writeConsole(); buildAsk(s);
    controls.autoRotate = cbSpin.checked && !calm;
    poster.classList.add("gone"); setStatus(""); shadowDirty = true;
    try { delete window.VCOS_GLB[key]; } catch (e) {}
  }

  /* hide the outer walls (and what hangs on them) that stand between the camera and the room */
  let lastCull = "";
  function cull(force) {
    if (!model) return;
    const dx = camera.position.x - center.x, dz = camera.position.z - center.z, n = Math.hypot(dx, dz) || 1;
    let sig = "";
    for (const w of walls) { const hide = (w.nx * dx + w.nz * dz) / n > 0.16; sig += hide ? "1" : "0"; w._hide = hide; }
    sig += cbCeil.checked ? "c" : "-";
    if (sig === lastCull && !force) return;
    lastCull = sig;
    for (const w of walls) w.o.visible = !w._hide;
    for (const o of ceilings) o.visible = cbCeil.checked;
    shadowDirty = true;
  }

  function setFrame(f, fromVideo) {
    frame = Math.max(1, Math.min(info.meta.frames, Math.round(f)));
    if (mixer && clip) { mixer.setTime(Math.min(clip.duration - 1e-3, clip.duration * (frame - 1) / Math.max(1, info.meta.frames - 1))); shadowDirty = true; }
    if (marker && path.length) {
      let i = 0; while (i < path.length - 2 && path[i + 1][0] <= frame) i++;
      const a = path[i], b = path[Math.min(i + 1, path.length - 1)], u = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (frame - a[0]) / (b[0] - a[0])));
      marker.position.set(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u);
      const d = new T.Vector3(a[4] + (b[4] - a[4]) * u, a[5] + (b[5] - a[5]) * u, a[6] + (b[6] - a[6]) * u).normalize();
      marker.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.negate());
    }
    const sec = (frame - 1) / info.meta.fps;
    slider.value = frame;
    timeOut.textContent = `frame ${String(frame).padStart(4, "0")} of ${info.meta.frames} · ${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
    if (selA) writeConsole();
    if (pipVideo && info.video && !fromVideo && pipVideo.readyState >= 1) {          /* scrubbing: the video follows, a few seeks a second */
      const now = performance.now();
      if (Math.abs(pipVideo.currentTime - sec) > 0.12 && now - lastSeek > 110) {
        lastSeek = now;
        try { pipVideo.currentTime = Math.max(0, Math.min(sec, (pipVideo.duration || sec + 1) - 0.05)); } catch (e) {}
      }
    }
  }
  function setPlaying(on) {
    playing = on; playBtn.innerHTML = on ? PAUSE : PLAY; playBtn.setAttribute("aria-label", on ? "Pause the timeline" : "Play the timeline");
    if (on && frame >= info.meta.frames) setFrame(1);
    if (!pipVideo || !info.video) return;
    if (on) {
      try { pipVideo.currentTime = (frame - 1) / info.meta.fps; } catch (e) {}
      pipVideo.playbackRate = Math.max(1, Math.min(8, info.meta.frames / info.meta.fps / 30));       /* the whole video in about half a minute */
      const p = pipVideo.play(); if (p && p.catch) p.catch(() => {});
    } else pipVideo.pause();
  }

  /* reading the state */
  const box3 = o => new T.Box3().setFromObject(o);
  const blender = v => [v.x, -v.z, v.y];
  const label = o => (o.userData.label || o.name || "object");
  function writeConsole() {
    const fr = frame > 1 ? `, frame=${frame}` : "";
    let text;
    if (mode === "move" && selA) {
      const c = box3(selA).getCenter(new T.Vector3()), b = blender(c).map(v => fmt(v, 2));
      text = `# write: edit the state, then render it\nobj = S["${label(selA)}"]\nobj.location = (${b.join(", ")})   # m, Z up\nsubmit_update()\n→ ${edits.size} object${edits.size === 1 ? "" : "s"} moved in this state`;
    } else if (mode === "measure" && selA && selB) {
      const a = box3(selA).getCenter(new T.Vector3()), b = box3(selB).getCenter(new T.Vector3());
      text = `measure_pair(a="${label(selA)}", b="${label(selB)}",\n             metric="center"${fr})\n→ distance_m  ${fmt(a.distanceTo(b))}\n  center_a    [${blender(a).map(v => fmt(v)).join(", ")}]\n  center_b    [${blender(b).map(v => fmt(v)).join(", ")}]`;
    } else if (selA) {
      const bx = box3(selA), c = bx.getCenter(new T.Vector3()), sz = bx.getSize(new T.Vector3());
      text = `inspect_entities(ids=["${label(selA)}"]${fr})\n→ category    ${selA.userData.category || "object"}\n  center      [${blender(c).map(v => fmt(v)).join(", ")}] m\n  dimensions  [${[sz.x, sz.z, sz.y].map(v => fmt(v)).join(", ")}] m`;
      if (mode === "measure") text += `\n\n# now click a second object`;
    } else {
      const n = info ? info.meta.objects.length : 0;
      text = mode === "measure" ? `# ${n} objects are in this world state.\n# Click two of them to measure\n# the distance between their centers.`
        : mode === "move" ? `# write mode: drag any object across the floor.\n# The program's state changes; the agent\n# would render the new video from it.`
        : `# ${n} objects are in this world state.\n# Click one to read its record,\n# or ask the state a question below.`;
    }
    consolePre.innerHTML = hl(text);
    consoleMode.textContent = mode;
    consoleFile.textContent = mode === "move" ? "generate.py" : "query.py";
  }
  function setMode(m) {
    mode = m; modeBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    stage.classList.toggle("moving", m === "move");
    askRun++; clearAsk(); select(null); writeConsole();
  }
  function helper(o, color) { const h = new T.Box3Helper(box3(o), color); h.material.depthTest = false; h.renderOrder = 5; scene.add(h); return h; }
  function select(o) {
    if (o === null || mode !== "measure" || (selA && selB)) {
      [boxA, boxB, line].forEach(x => x && scene.remove(x)); boxA = boxB = line = null; selA = selB = null;
    }
    if (!o) return;
    if (!selA) { selA = o; boxA = helper(o, 0x3d63ff); }
    else if (o !== selA) {
      selB = o; boxB = helper(o, 0xff8a1f);
      const g = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
      line = new T.Line(g, new T.LineBasicMaterial({color: 0xff8a1f, depthTest: false})); line.renderOrder = 6; scene.add(line);
    }
    writeConsole();
  }
  function place(tag, v) {
    const p = v.clone().project(camera);
    if (p.z > 1 || p.z < -1) { tag.style.display = "none"; return; }
    tag.style.display = "block"; tag.style.left = ((p.x * 0.5 + 0.5) * stage.clientWidth) + "px"; tag.style.top = ((-p.y * 0.5 + 0.5) * stage.clientHeight - 8) + "px";
  }
  function describe(tag, sel, box) {                       /* the name, and under it the category and size */
    if (tag._for === sel.uuid) return;
    tag._for = sel.uuid; tag.textContent = "";
    const sz = box.getSize(new T.Vector3()), b = document.createElement("b"), s = document.createElement("span");
    b.textContent = label(sel); s.textContent = `${sel.userData.category || "object"} · ${fmt(sz.x, 2)} × ${fmt(sz.z, 2)} × ${fmt(sz.y, 2)} m`;
    tag.append(b, s);
  }
  function pick(e) {                                      /* the object under the pointer, if nothing stands in front of it */
    const r = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    for (const h of raycaster.intersectObject(model, true)) {
      if (!shown(h.object)) continue;
      const o = tagged(h.object);
      return o && o.userData.kind === "obj" ? o : null;
    }
    return null;
  }
  function focusOn(o) {                                   /* move in on one object, keeping the viewing direction */
    const bx = box3(o), c = bx.getCenter(new T.Vector3()), size = bx.getSize(new T.Vector3()).length();
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = Math.max(controls.minDistance * 1.3, Math.min(controls.maxDistance, size * 2.4 + 1.3));
    const to = c.clone().add(dir.multiplyScalar(dist));
    controls.autoRotate = false; cbSpin.checked = false;
    if (calm) { controls.target.copy(c); camera.position.copy(to); return; }
    fly = {u: 0, t0: controls.target.clone(), t1: c, p0: camera.position.clone(), p1: to};
  }
  function overlays() {
    for (const hb of askBoxes) if (hb._for) hb.box.setFromObject(hb._for);
    for (const [sel, bx, tag] of [[selA, boxA, tagA], [selB, boxB, tagB]]) {
      if (!sel) { tag.style.display = "none"; tag._for = null; continue; }
      bx.box.setFromObject(sel);
      const c = bx.box.getCenter(new T.Vector3()); describe(tag, sel, bx.box); place(tag, new T.Vector3(c.x, bx.box.max.y, c.z));
    }
    if (line && selA && selB) {
      const a = boxA.box.getCenter(new T.Vector3()), b = boxB.box.getCenter(new T.Vector3());
      line.geometry.setFromPoints([a, b]); tagD.textContent = fmt(a.distanceTo(b), 2) + " m"; place(tagD, a.clone().add(b).multiplyScalar(0.5));
    } else tagD.style.display = "none";
  }

  const PLAY = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>';
  function bind() {
    let down = null;
    const el = renderer.domElement;
    el.addEventListener("pointerdown", e => {
      down = [e.clientX, e.clientY]; fly = null; engaged = true; controls.enableZoom = true; controls.autoRotate = false; cbSpin.checked = false; hintEl.textContent = HINT_ON;
      if (mode === "move" && model && e.button === 0) {
        const o = pick(e);
        if (o) {
          askRun++; clearAsk();
          const bx = box3(o), plane = new T.Plane(new T.Vector3(0, 1, 0), -bx.min.y), hit = new T.Vector3();
          raycaster.ray.intersectPlane(plane, hit);
          const wp = o.getWorldPosition(new T.Vector3());
          if (!edits.has(o)) edits.set(o, o.position.clone());
          drag = {o, plane, off: wp.sub(hit)};
          controls.enabled = false; el.setPointerCapture(e.pointerId);
          select(o); stage.classList.add("dragging");
        }
      }
    });
    el.addEventListener("pointermove", e => {
      if (!drag) return;
      const r = el.getBoundingClientRect();
      raycaster.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = new T.Vector3();
      if (!raycaster.ray.intersectPlane(drag.plane, hit)) return;
      const want = hit.add(drag.off), cur = drag.o.getWorldPosition(new T.Vector3());
      want.y = cur.y;
      drag.o.position.copy(drag.o.parent ? drag.o.parent.worldToLocal(want) : want);
      drag.o.updateMatrixWorld(true); shadowDirty = true; writeConsole();
    });
    el.addEventListener("pointerup", e => {
      if (drag) { drag = null; controls.enabled = true; stage.classList.remove("dragging"); if (undoBtn) undoBtn.hidden = !edits.size; down = null; writeConsole(); return; }
      if (!down || !model) return;
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
      if (moved > 5) return;
      const o = pick(e);
      askRun++; clearAsk();
      if (o) select(o); else { select(null); writeConsole(); }
    });
    el.addEventListener("dblclick", e => {                 /* the two clicks have selected it; now go to it */
      if (!model) return;
      const o = pick(e);
      if (!o) return;
      if (o !== selA && o !== selB) select(o);
      focusOn(o);
    });
    stage.addEventListener("pointerleave", () => { engaged = false; controls.enableZoom = false; hintEl.textContent = HINT_OFF; });
    sceneBtns.forEach(b => b.addEventListener("click", () => { if (playing) setPlaying(false); load(b.dataset.scene); }));
    modeBtns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
    cbPath.addEventListener("change", () => { if (pathMesh) pathMesh.visible = cbPath.checked; if (marker) marker.visible = cbPath.checked; });
    cbCeil.addEventListener("change", () => cull(true));
    cbSpin.addEventListener("change", () => { controls.autoRotate = cbSpin.checked; });
    slider.addEventListener("input", () => { if (playing) setPlaying(false); setFrame(+slider.value); });
    playBtn.addEventListener("click", () => setPlaying(!playing));
    root.querySelector("[data-view=reset]").addEventListener("click", () => { camera.position.copy(home); controls.target.copy(center); });
    root.querySelector("[data-view=top]").addEventListener("click", () => { const d = camera.position.distanceTo(controls.target); camera.position.set(center.x, center.y + d, center.z + 0.01); controls.target.copy(center); });
    root.querySelector("[data-view=in]").addEventListener("click", () => dolly(0.8));
    if (undoBtn) undoBtn.addEventListener("click", () => {
      for (const [o, p] of edits) { o.position.copy(p); o.updateMatrixWorld(true); }
      edits = new Map(); undoBtn.hidden = true; shadowDirty = true; select(null); writeConsole();
    });
    root.querySelector("[data-view=out]").addEventListener("click", () => dolly(1.25));
  }
  function dolly(f) {
    const v = camera.position.clone().sub(controls.target), d = v.length() * f;
    if (d < controls.minDistance || d > controls.maxDistance) return;
    camera.position.copy(controls.target).add(v.multiplyScalar(f));
  }
  /* ---- ask the state: questions written from this scene's own records, answered by the harness tools ---- */
  const SKIP = /wall|floor|ceiling|door|window|switch|outlet|cable|paper|magnet|sticky|note|fixture|^light$|hook|part of|pipe|blind|poster|artwork|sign|vent|rug|curtain|frame|shelf|cabinets and/i;
  const plural = c => /(s|x|ch|sh)$/.test(c) ? c + "es" : /[^aeiou]y$/.test(c) ? c.slice(0, -1) + "ies" : /f$/.test(c) ? c.slice(0, -1) + "ves" : c + "s";
  const nice = o => (o.category || "object").replace(/_/g, " ");
  function clearAsk() { askBoxes.forEach(b => scene && scene.remove(b)); askBoxes = []; [...(askWrap ? askWrap.children : [])].forEach(b => b.classList.remove("on")); }
  function questions(s) {
    const recs = s.meta.objects.filter(o => objMap.has(o.name) && o.size && !SKIP.test(o.category || "") && !SKIP.test(o.name));
    const vol = o => o.size[0] * o.size[1] * o.size[2];
    const qs = [];
    /* entity: count the most frequent category */
    const byCat = {};
    for (const o of recs) (byCat[o.category] = byCat[o.category] || []).push(o);
    const cat = Object.keys(byCat).filter(k => byCat[k].length >= 2 && byCat[k].length <= 40).sort((a, b) => byCat[b].length - byCat[a].length)[0];
    if (cat) qs.push({kind: "Entity", q: `How many ${plural(cat)} are in the room?`, run: () => ({objs: byCat[cat], code: [`scene_inventory(category="${cat}")`, `→ ${byCat[cat].length} entities`, `submit_answer(${byCat[cat].length})`]})});
    /* geometry: distance between the two biggest things of different kinds */
    const big = recs.slice().sort((a, b) => vol(b) - vol(a)), uniq = [];
    for (const o of big) if (!uniq.some(u => u.category === o.category)) uniq.push(o);
    if (uniq.length >= 2) {
      const [a, b] = uniq;
      qs.push({kind: "Geometry", q: `How far is the ${nice(a)} from the ${nice(b)}?`, run: () => {
        const A = objMap.get(a.name), B = objMap.get(b.name), d = box3(A).getCenter(new T.Vector3()).distanceTo(box3(B).getCenter(new T.Vector3()));
        return {objs: [a, b], line: [A, B], code: [`inspect_entities(ids=["${a.name}", "${b.name}"])`, `d = measure_pair(a="${a.name}", b="${b.name}", metric="center")`, `→ distance_m  ${fmt(d, 2)}`, `submit_answer(${fmt(d, 2)})`]};
      }});
      qs.push({kind: "Geometry", q: `What is the largest object here?`, run: () => {
        const sz = a.size;
        return {objs: [a], focus: true, code: [`scene_inventory()`, `inspect_entities(ids=[...${recs.length} objects])`, `→ largest: "${a.name}"  ${fmt(sz[0], 2)} × ${fmt(sz[2], 2)} × ${fmt(sz[1], 2)} m`, `submit_answer("${nice(a)}")`]};
      }});
    }
    /* viewpoint: stand at one object, face another, where is a third? */
    if (uniq.length >= 3) {
      const [a, b, c] = [uniq[1], uniq[0], uniq[2]];
      qs.push({kind: "Viewpoint", q: `Standing by the ${nice(a)}, facing the ${nice(b)}: is the ${nice(c)} to my left or right?`, run: () => {
        const P = n => box3(objMap.get(n.name)).getCenter(new T.Vector3());
        const pa = P(a), pb = P(b), pc = P(c), fx = pb.x - pa.x, fz = pb.z - pa.z, tx = pc.x - pa.x, tz = pc.z - pa.z;
        const side = (tx * -fz + tz * fx) > 0 ? "right" : "left";
        return {objs: [a, b, c], line: [objMap.get(a.name), objMap.get(b.name)], code: [`viewpoint_relation(observer="${a.name}",`, `                   facing="${b.name}",`, `                   target="${c.name}")`, `→ ${side}`, `submit_answer("${side}")`]};
      }});
    }
    /* history: which did the camera see first (only scenes with first-seen frames) */
    const seen = recs.filter(o => typeof o.first === "number");
    if (seen.length > 4) {
      const pool = seen.filter(o => vol(o) > 0.02).sort((a, b) => vol(b) - vol(a)).slice(0, 12);
      const a = pool[0], b = pool.find(o => o.category !== a.category && Math.abs(o.first - a.first) > 60);
      if (a && b) qs.push({kind: "History", q: `Which did the camera see first: the ${nice(a)} or the ${nice(b)}?`, run: () => {
        const first = a.first < b.first ? a : b;
        setFrame(first.first);
        return {objs: [a, b], code: [`camera_history(ids=["${a.name}", "${b.name}"])`, `→ first seen  ${a.name}: frame ${a.first}`, `              ${b.name}: frame ${b.first}`, `submit_answer("${nice(first)}")`]};
      }});
    }
    return qs;
  }
  function buildAsk(s) {
    if (!askWrap) return;
    askWrap.textContent = "";
    for (const q of questions(s)) {
      const b = document.createElement("button"); b.type = "button";
      const k = document.createElement("i"); k.textContent = q.kind; b.append(k, document.createTextNode(q.q));
      b.addEventListener("click", () => ask(q, b)); askWrap.appendChild(b);
    }
  }
  function ask(q, btn) {
    if (mode !== "inspect") setMode("inspect");
    select(null); clearAsk(); btn.classList.add("on");
    const run = ++askRun, res = q.run(), lines = [`# Q: ${q.q}`].concat(res.code);
    controls.autoRotate = false; cbSpin.checked = false;
    /* frame the objects the question touches */
    const all = new T.Box3();
    res.objs.forEach(r => { const o = objMap.get(r.name); if (o) all.union(box3(o)); });
    if (!all.isEmpty()) {
      const c = all.getCenter(new T.Vector3()), size = all.getSize(new T.Vector3()).length();
      const dir = camera.position.clone().sub(controls.target).normalize();
      const dist = Math.max(controls.minDistance * 1.4, Math.min(controls.maxDistance, size * 1.25 + 1.4));
      const to = c.clone().add(dir.multiplyScalar(dist));
      if (calm) { controls.target.copy(c); camera.position.copy(to); } else fly = {u: 0, t0: controls.target.clone(), t1: c, p0: camera.position.clone(), p1: to};
    }
    let shown = 0, chars = 0;
    const full = lines.join("\n"), answerAt = full.lastIndexOf("submit_answer");
    const step = () => {
      if (run !== askRun) return;
      chars = Math.min(full.length, chars + (calm ? full.length : 3));
      consolePre.innerHTML = hl(full.slice(0, chars)) + (chars < full.length ? '<span class="caret"></span>' : "");
      consoleMode.textContent = "agent";
      /* light the objects as the tool calls that touch them are typed */
      if (shown === 0 && chars > lines[0].length + 4) {
        shown = 1;
        res.objs.forEach((r, i) => setTimeout(() => {
          if (run !== askRun) return;
          const o = objMap.get(r.name); if (!o) return;
          const hb = helper(o, i === 0 || res.objs.length > 3 ? 0xff8a1f : i === 1 ? 0x3d63ff : 0x10b981); hb._for = o; askBoxes.push(hb);
        }, calm ? 0 : Math.min(60, 900 / res.objs.length) * i));
        if (res.line) {
          const g = new T.BufferGeometry().setFromPoints(res.line.map(o => box3(o).getCenter(new T.Vector3())));
          const ln = new T.Line(g, new T.LineBasicMaterial({color: 0xff8a1f, depthTest: false})); ln.renderOrder = 6; scene.add(ln); askBoxes.push(ln);
        }
        if (res.focus && res.objs[0]) { const o = objMap.get(res.objs[0].name); if (o) { selA = o; boxA = helper(o, 0x3d63ff); } }
      }
      if (chars < full.length) setTimeout(step, 16);
    };
    step();
  }

  const HINT_OFF = "Drag to orbit · click the scene, then scroll to zoom · click an object to inspect it · double-click to fly to it";
  const HINT_ON = "Scroll to zoom · drag to orbit · right-drag to pan · click an object to inspect it · double-click to fly to it";
  hintEl.textContent = HINT_OFF;

  function tick(t) {
    requestAnimationFrame(tick);
    if (!onScreen || !model) { lastTick = t; return; }
    const dt = Math.min(0.1, (t - lastTick) / 1000); lastTick = t;
    if (playing) {                                          /* the input video sets the pace when it is playing; a timer otherwise */
      const live = !!(pipVideo && info.video && !pipVideo.paused && pipVideo.readyState >= 2);
      const next = live ? 1 + pipVideo.currentTime * info.meta.fps : frame + dt * info.meta.frames / 30;
      if (next >= info.meta.frames || (live && pipVideo.ended)) { setFrame(info.meta.frames, true); setPlaying(false); } else setFrame(next, live);
    }
    if (fly) {
      fly.u = Math.min(1, fly.u + dt / 0.65); const k = fly.u * fly.u * (3 - 2 * fly.u);
      controls.target.lerpVectors(fly.t0, fly.t1, k); camera.position.lerpVectors(fly.p0, fly.p1, k);
      if (fly.u >= 1) fly = null;
    }
    controls.update(); cull(false); overlays();
    if (shadowDirty && renderer.shadowMap.enabled) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    renderer.render(scene, camera);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => es.forEach(e => { onScreen = e.isIntersecting; if (onScreen) start(); }), {rootMargin: "500px 0px"}).observe(stage);
  } else { onScreen = true; start(); }
})();
