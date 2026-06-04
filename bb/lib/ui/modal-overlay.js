(() => {
  const id = "bb-reactish-dashboard";
  document.getElementById(id)?.remove();

  const saved = JSON.parse(localStorage.getItem("bbdash-layout") || "{}");
  const collapsed = JSON.parse(localStorage.getItem("bbdash-collapsed") || "{}");

  const root = document.createElement("div");
  root.id = id;
  root.innerHTML = `
<style>
#${id}{position:fixed;inset:0;z-index:999999;pointer-events:none;font-family:Consolas,monospace}
#bbdash-panel{position:absolute;top:${saved.top ?? "70px"};left:${saved.left ?? "auto"};right:${saved.left ? "auto" : "40px"};width:${saved.width ?? "720px"};height:${saved.height ?? "auto"};max-height:82vh;overflow:auto;resize:both;pointer-events:auto;background:rgba(8,12,20,.96);border:1px solid #7c3aed;box-shadow:0 0 28px rgba(124,58,237,.35);color:#d1d5db;border-radius:10px}
#bbdash-header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:move;background:linear-gradient(90deg,rgba(124,58,237,.35),rgba(6,182,212,.12));border-bottom:1px solid rgba(124,58,237,.55)}
#bbdash-title{font-weight:bold;color:white;letter-spacing:.08em}
#bbdash-actions button{margin-left:6px}
#bbdash-body{padding:14px}
#bbdash-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bb-card{background:rgba(15,23,42,.85);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:0;overflow:hidden}
.bb-card-wide{grid-column:1/-1}
.bb-card-head{display:flex;justify-content:space-between;align-items:center;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer}
.bb-card-title{font-size:12px;color:#a78bfa;letter-spacing:.08em;text-transform:uppercase}
.bb-card-toggle{color:#6b7280}
.bb-card-body{padding:10px}
.bb-row{display:grid;grid-template-columns:115px 1fr;gap:8px;padding:3px 0}
.bb-label{color:#6b7280}.bb-value{color:#e5e7eb}
.bb-green{color:#10b981}.bb-cyan{color:#06b6d4}.bb-purple{color:#a78bfa}.bb-yellow{color:#f59e0b}.bb-red{color:#ef4444}.bb-gray{color:#6b7280}.bb-blue{color:#60a5fa}
.bb-chip{display:inline-block;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:2px 8px;margin:3px;font-size:12px}
.bb-section{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)}
textarea{width:100%;min-height:95px;background:#020617;color:#d1d5db;border:1px solid #374151;border-radius:6px;padding:8px;font-family:Consolas,monospace}
button{background:#111827;color:#d1d5db;border:1px solid #374151;border-radius:6px;padding:5px 9px;cursor:pointer}
button:hover{border-color:#7c3aed}
pre{white-space:pre-wrap;color:#9ca3af}
</style>

<div id="bbdash-panel">
  <div id="bbdash-header">
    <div id="bbdash-title">DAEMON OVERLAY</div>
    <div id="bbdash-actions">
      <button id="bbdash-min">_</button>
      <button id="bbdash-close">X</button>
    </div>
  </div>

  <div id="bbdash-body">
    <div id="bbdash-render"></div>

    <div class="bb-section">
      <div class="bb-label">Paste /data/ui/dashboard-state.txt JSON here:</div>
      <textarea id="bbdash-input"></textarea><br><br>
      <button id="bbdash-load">Load State</button>
      <button id="bbdash-clear">Clear State</button>
      <button id="bbdash-save-layout">Save Layout</button>
      <button id="bbdash-expand-all">Expand All</button>
      <button id="bbdash-collapse-all">Collapse All</button>
    </div>
  </div>
</div>`;

  document.body.appendChild(root);

  const $ = x => document.getElementById(x);
  const panel = $("bbdash-panel");
  const body = $("bbdash-body");
  const renderEl = $("bbdash-render");
  const inputEl = $("bbdash-input");

  const row = (label, value, cls = "") =>
    `<div class="bb-row"><div class="bb-label">${label}</div><div class="bb-value ${cls}">${value}</div></div>`;

  const card = (key, title, html, wide = false) => {
    const isClosed = collapsed[key] === true;
    return `
<div class="bb-card ${wide ? "bb-card-wide" : ""}" data-card="${key}">
  <div class="bb-card-head" data-toggle-card="${key}">
    <div class="bb-card-title">${title}</div>
    <div class="bb-card-toggle">${isClosed ? "+" : "−"}</div>
  </div>
  <div class="bb-card-body" style="display:${isClosed ? "none" : "block"}">
    ${html}
  </div>
</div>`;
  };

  const fmtMoney = n => Number.isFinite(Number(n))
    ? "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "unknown";

  const fmtNum = n => Number.isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "unknown";

  const fmtPct = n => Number.isFinite(Number(n))
    ? `${(Number(n) * 100).toFixed(1)}%`
    : "unknown";

  const yesNo = v => v ? "YES" : "NO";
  const ynClass = v => v ? "bb-green" : "bb-red";

  function getState() {
    try {
      return JSON.parse(localStorage.getItem("bbDashboardState") || "null");
    } catch {
      return null;
    }
  }

  function saveCollapsed() {
    localStorage.setItem("bbdash-collapsed", JSON.stringify(collapsed));
  }

  function saveLayout() {
    const r = panel.getBoundingClientRect();
    localStorage.setItem("bbdash-layout", JSON.stringify({
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`
    }));
  }

  function bindCardToggles() {
    document.querySelectorAll("[data-toggle-card]").forEach(el => {
      el.onclick = () => {
        const key = el.getAttribute("data-toggle-card");
        collapsed[key] = !collapsed[key];
        saveCollapsed();
        render();
      };
    });
  }

  function render() {
    const s = getState();
    if (s && Number(s.schemaVersion ?? 0) < 2) {
      renderEl.innerHTML = `
        <div id="bbdash-grid">
          ${card("oldState", "Old State Loaded", `
            <div class="bb-red">This modal has old schemaVersion ${s.schemaVersion ?? "unknown"} saved in localStorage.</div>
            <div class="bb-section">Click <b>Clear State</b>, then paste the new /data/ui/dashboard-state.txt JSON.</div>
          `, true)}
        </div>`;
      bindCardToggles();
      return;
    }
    if (!s) {
      renderEl.innerHTML = `
<div id="bbdash-grid">
  ${card("noState", "No State Loaded", `
    <div class="bb-red">No dashboard state loaded yet.</div>
    <pre>cat /data/ui/dashboard-state.txt</pre>
  `, true)}
</div>`;
      bindCardToggles();
      return;
    }

    renderEl.innerHTML = `<div id="bbdash-grid">${[
      widgetCore(s),
      widgetBitnode(s),
      widgetPlayer(s),
      widgetDaemon(s),
      widgetTargetIntel(s),
      widgetPolicy(s),
      widgetServers(s),
      widgetLanes(s),
      widgetReadiness(s),
      widgetVictory(s),
      widgetCapabilities(s),
      widgetWidgets(s),
      widgetUpdated(s),
    ].join("")}</div>`;

    bindCardToggles();
  }

  function widgetCore(s) {
    const p = s.progression ?? {};
    return card("core", "Core State", [
      row("Phase", p.phase ?? "UNKNOWN", "bb-purple"),
      row("Mode", p.mode ?? "UNKNOWN", "bb-green"),
      row("Priority", p.priority ?? "UNKNOWN", "bb-cyan"),
      row("Posture", p.posture ?? "UNKNOWN", "bb-yellow"),
      row("Next", p.nextAction ?? "none", "bb-gray"),
    ].join(""), true);
  }

  function widgetBitnode(s) {
    const b = s.bitnode ?? {};
    return card("bitnode", "BitNode", [
      row("Node", `BN${b.number ?? "?"}`, "bb-purple"),
      row("Name", b.name ?? "Unknown"),
      row("Strategy", b.strategy ?? "UNKNOWN", "bb-cyan"),
    ].join(""));
  }

  function widgetPlayer(s) {
    const p = s.player ?? {};
    return card("player", "Player", [
      row("Money", fmtMoney(p.money), "bb-green"),
      row("Hacking", fmtNum(p.hacking), "bb-blue"),
    ].join(""));
  }

  function widgetDaemon(s) {
    const d = s.daemon ?? {};
    return card("daemon", "Daemon", [
      row("Status", d.status ?? "unknown", d.status === "running" ? "bb-green" : "bb-red"),
      row("Target", d.target ?? "none", "bb-yellow"),
      row("Override", d.targetOverride ?? "none", "bb-cyan"),
      row("Controller", d.controller ?? "unknown", "bb-gray"),
      row("Reason", d.reason ?? "none", "bb-gray"),
    ].join(""), true);
  }

  function widgetTargetIntel(s) {
    const t = s.target ?? {};
    return card("target", "Target Intel", [
      row("Name", t.name ?? "none", "bb-yellow"),
      row("Money", `${fmtMoney(t.money)} / ${fmtMoney(t.maxMoney)}`, "bb-green"),
      row("Money %", fmtPct(t.moneyPercent), "bb-green"),
      row("Security", `${fmtNum(t.security)} / min ${fmtNum(t.minSecurity)}`, "bb-red"),
      row("Sec Diff", fmtNum(t.securityDiff), Number(t.securityDiff) <= 0.1 ? "bb-green" : "bb-yellow"),
      row("Weaken", `${fmtNum((t.weakenTime ?? 0) / 1000)}s`, "bb-cyan"),
      row("Prep Need", fmtPct(t.prepNeed), "bb-yellow"),
    ].join(""));
  }

  function widgetPolicy(s) {
    const p = s.policy ?? {};
    return card("policy", "Spending Policy", [
      row("Reserve", fmtMoney(p.reserveMoney), "bb-green"),
      chipLine({
        Servers: p.allowServerPurchases,
        Stocks: p.allowStockTrading,
        Hacknet: p.allowHacknet,
        HomeRAM: p.allowHomeRam,
        EXEs: p.allowExePurchases,
        Augs: p.allowAugmentPurchases,
        Reset: p.allowReset,
        Travel: p.allowIntTravel,
      }),
    ].join(""), true);
  }

  function widgetServers(s) {
    const srv = s.servers ?? {};
    return card("servers", "Servers", [
      row("Rooted", srv.rootedCount ?? 0, "bb-green"),
      row("Purchased", srv.purchasedCount ?? 0, "bb-cyan"),
      row("Cloud", srv.cloudCount ?? 0, "bb-purple"),
    ].join(""));
  }

  function widgetLanes(s) {
    const l = s.lanes ?? {};
    return card("lanes", "Lane Allocation", [
      row("Multi", yesNo(l.multiTargetEnabled), ynClass(l.multiTargetEnabled)),
      row("Money 1", fmtPct(l.primaryMoneyRamPercent), "bb-green"),
      row("Money 2", fmtPct(l.secondaryMoneyRamPercent), "bb-green"),
      row("EXP", fmtPct(l.expRamPercent), "bb-blue"),
      row("Adaptive", yesNo(l.adaptive), ynClass(l.adaptive)),
      row("Reason", l.reason ?? "none", "bb-gray"),
    ].join(""), true);
  }

  function widgetReadiness(s) {
    const r = s.readiness ?? {};
    return card("readiness", "BN4 Readiness", [
      row("Goal", r.goal ?? "unknown", "bb-purple"),
      row("Ready", `${r.readyCount ?? 0}/${r.totalChecks ?? 0}`, r.ready ? "bb-green" : "bb-yellow"),
      row("Overall", yesNo(r.ready), ynClass(r.ready)),
      row("Hacking", `${fmtNum(r.hacking)} / ${fmtNum(r.hackingTarget)}`, r.hackingReady ? "bb-green" : "bb-yellow"),
      row("Money", `${fmtMoney(r.money)} / ${fmtMoney(r.moneyTarget)}`, r.moneyReady ? "bb-green" : "bb-yellow"),
      row("Home RAM", yesNo(r.homeRamReady), ynClass(r.homeRamReady)),
      row("Augs", `${fmtNum(r.augmentCount)} / ${fmtNum(r.augmentTarget)}`, r.augReady ? "bb-green" : "bb-yellow"),
    ].join(""));
  }

  function widgetVictory(s) {
    const v = s.victory ?? {};
    return card("victory", "Victory Plan", [
      row("Stage", v.stage ?? "unknown", "bb-purple"),
      row("Next", v.nextAction ?? "none", "bb-gray"),
      row("Hack Goal", fmtNum(v.hackingTarget), "bb-blue"),
      row("Daedalus", yesNo(v.hasDaedalus), ynClass(v.hasDaedalus)),
      row("Red Pill", yesNo(v.hasRedPill), ynClass(v.hasRedPill)),
      row("World", v.worldDaemon ?? "w0r1d_d43m0n", "bb-yellow"),
      row("Can Use", yesNo(v.canUseWorldDaemon), ynClass(v.canUseWorldDaemon)),
    ].join(""), true);
  }

  function widgetCapabilities(s) {
    const c = s.capabilities ?? {};
    return card("capabilities", "Capabilities", chipLine(c), true);
  }

  function widgetWidgets(s) {
    const visible = s.widgets?.visible ?? [];
    const emphasized = new Set(s.widgets?.emphasized ?? []);
    const html = visible.map(w =>
      `<span class="bb-chip ${emphasized.has(w) ? "bb-yellow" : ""}">${emphasized.has(w) ? "★ " : ""}${w}</span>`
    ).join("");

    return card("widgets", "Visible Widgets", html || `<span class="bb-gray">none</span>`, true);
  }

  function widgetUpdated(s) {
    return card("updated", "Updated", [
      row("UI", s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString() : "unknown", "bb-gray"),
      row("Daemon", s.daemonUpdatedAt ? new Date(s.daemonUpdatedAt).toLocaleTimeString() : "unknown", "bb-gray"),
      row("Schema", s.schemaVersion ?? "?", "bb-cyan"),
      row("Source", s.sourceVersion ?? "?", "bb-cyan"),
    ].join(""), true);
  }

  function chipLine(obj) {
    return Object.entries(obj ?? {}).map(([k, v]) =>
      `<span class="bb-chip ${v ? "bb-green" : "bb-gray"}">${k}${v ? "✓" : "·"}</span>`
    ).join("");
  }

  $("bbdash-close").onclick = () => root.remove();

  $("bbdash-min").onclick = () => {
    body.style.display = body.style.display === "none" ? "block" : "none";
    $("bbdash-min").textContent = body.style.display === "none" ? "+" : "_";
    saveLayout();
  };

  $("bbdash-load").onclick = () => {
    try {
      localStorage.setItem("bbDashboardState", JSON.stringify(JSON.parse(inputEl.value)));
      render();
    } catch {
      alert("Invalid JSON");
    }
  };

  $("bbdash-clear").onclick = () => {
    localStorage.removeItem("bbDashboardState");
    render();
  };

  $("bbdash-save-layout").onclick = saveLayout;

  $("bbdash-expand-all").onclick = () => {
    Object.keys(collapsed).forEach(k => collapsed[k] = false);
    saveCollapsed();
    render();
  };

  $("bbdash-collapse-all").onclick = () => {
    [
      "core", "bitnode", "player", "daemon", "target", "policy",
      "servers", "lanes", "readiness", "victory", "capabilities",
      "widgets", "updated", "noState"
    ].forEach(k => collapsed[k] = true);

    saveCollapsed();
    render();
  };

  let dragging = false, ox = 0, oy = 0;

  $("bbdash-header").onmousedown = e => {
    if (e.target.tagName === "BUTTON") return;

    dragging = true;
    const r = panel.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;

    panel.style.left = `${r.left}px`;
    panel.style.top = `${r.top}px`;
    panel.style.right = "auto";

    e.preventDefault();
  };

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    panel.style.left = `${e.clientX - ox}px`;
    panel.style.top = `${e.clientY - oy}px`;
  });

  document.addEventListener("mouseup", () => {
    if (dragging) saveLayout();
    dragging = false;
  });

  //
  // AUTO REFRESH
  //

  let lastRefresh = 0;

  setInterval(() => {
    try {
      const raw = localStorage.getItem("bbDashboardState");

      if (!raw) return;

      const parsed = JSON.parse(raw);

      const updatedAt = parsed?.updatedAt ?? 0;

      if (updatedAt !== lastRefresh) {
        lastRefresh = updatedAt;
        render();
      }
    } catch (error) {
      console.error("Dashboard auto-refresh failed", error);
    }
  }, 2000);

  render();
})();