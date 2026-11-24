/*!
 * Tickless agent console: inbox, analytics, knowledge, troubleshooters,
 * macros, status incidents, widget settings, install.
 * Demo mode (no server): data lives in this browser and syncs live with the
 * demo site in other tabs. Server mode: multi-user, realtime, AI assist.
 */
(function () {
  "use strict";
  const Core = window.TicklessCore, Seed = window.TicklessSeed, E = Core.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const app = {
    store: null, remote: false, ai: false, view: "overview", arg: null, sel: null, filter: "needs", q: "", range: 30,
    me: LS.get("tickless:me") || "ag_alex", kbTab: "articles", mode: "reply", draft: {}, testQ: "", flowPrev: null,
  };
  const st = () => app.store.state;
  const S = () => st().settings;
  const meName = () => ((S().team || []).find((a) => a.id === app.me) || { name: "Agent" }).name;

  /* ------------------------------------------------------------ utils */
  const MIN = 60000;
  function ago(ts) {
    const d = Math.max(0, Date.now() - ts) / MIN;
    if (d < 1) return "now"; if (d < 60) return Math.floor(d) + "m";
    if (d < 1440) return Math.floor(d / 60) + "h"; return Math.floor(d / 1440) + "d";
  }
  function dur(min) {
    if (min == null) return "—";
    if (min < 1) return Math.round(min * 60) + "s";
    if (min < 60) return Math.round(min) + "m";
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + "h" + (m ? " " + m + "m" : "");
  }
  const num = (n) => n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "K" : Math.round(n).toLocaleString("en-US");
  const money = (n) => "$" + num(n);
  const pct = (x) => x == null ? "—" : Math.round(x * 100) + "%";
  const time = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const initials = (n) => (n || "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "?";
  const AV = ["#2a78d6", "#1b8a63", "#6250d6", "#b4562a", "#8a5a00", "#a8457a", "#3b6b8f", "#5b6b2f"];
  const avColor = (n) => AV[[...(n || "?")].reduce((s, c) => s + c.charCodeAt(0), 0) % AV.length];
  const flag = (cc) => cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "";
  const LANG = { en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese" };
  const MOOD = { angry: "😡 Angry", negative: "🙁 Negative", neutral: "😐 Neutral", positive: "🙂 Positive" };
  const PRIO = { urgent: 3, high: 2, normal: 1, low: 0 };
  const firstName = (c) => ((c.visitor && c.visitor.name) || "there").split(" ")[0];
  const lastPublic = (c) => { for (let i = c.messages.length - 1; i >= 0; i--) if (c.messages[i].role !== "note") return c.messages[i]; return null; };
  const needsReply = (c) => c.status === "open" && (lastPublic(c) || {}).role !== "agent";
  const slaMin = () => (S().handoff && S().handoff.slaMinutes) || 30;
  function waitingSince(c) {
    let t = null;
    for (let i = c.messages.length - 1; i >= 0; i--) { const m = c.messages[i]; if (m.role === "agent") break; if (m.role === "visitor") t = m.at; }
    return Math.max(t || c.escalatedAt || c.createdAt, c.escalatedAt || 0);
  }
  function toast(msg) {
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    $("#toasts").appendChild(el); setTimeout(() => el.remove(), 3200);
  }
  const dispatch = (op) => app.store.dispatch(op);
  const fill = (tpl, c) => {
    const vars = { first: c.visitor && c.visitor.name ? firstName(c) : "", name: (c.visitor && c.visitor.name) || "", agent: meName().split(" ")[0], brand: S().brand || "" };
    return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] != null ? vars[k] : m)).replace(/ +([,.!?])/g, "$1");
  };

  /* ------------------------------------------------------------ boot */
  async function boot() {
    const th = LS.get("tickless:theme");
    if (th) document.documentElement.setAttribute("data-theme", th);
    $("#theme").onclick = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
      const next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next); LS.set("tickless:theme", next); render();
    };
    let health = null;
    try { const r = await fetch(location.origin + "/api/health", { cache: "no-store" }); if (r.ok) health = await r.json(); } catch (e) { /* static hosting: demo mode */ }
    if (health && health.ok && health.app === "tickless") {
      app.remote = true; app.ai = !!health.ai;
      const token = LS.get("tickless:token");
      if (!token) return login();
      try { app.store = await new Core.RemoteStore({ api: location.origin, role: "admin", token }).init(); }
      catch (e) { LS.set("tickless:token", null); return login("That token didn't work."); }
    } else {
      app.store = new Core.LocalStore("demo", () => Seed.workspace());
    }
    $("#mode").textContent = app.remote ? "Connected to your Tickless server. Changes sync to every agent in real time." : "Demo mode: data lives in this browser and syncs live with the demo site. Run the server for teams + AI.";
    const chip = $("#ai-chip");
    chip.textContent = app.ai ? "AI: Claude connected" : "AI: local engine";
    chip.className = "chip" + (app.ai ? " on" : "");
    chip.title = app.ai ? "Answers and agent assist use Claude via your server" : "No server AI: answers come from the built-in search engine. See Install to connect AI.";
    const me = $("#me");
    me.innerHTML = (S().team || []).map((a) => `<option value="${E(a.id)}">${E(a.name)}</option>`).join("");
    me.value = app.me; me.onchange = () => { app.me = me.value; LS.set("tickless:me", app.me); render(); };
    app.store.subscribe(onOp);
    document.addEventListener("pointermove", tipMove); document.addEventListener("focusin", tipFocus); document.addEventListener("focusout", () => hideTip());
    window.addEventListener("hashchange", route);
    let rz = 0; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (app.view === "overview") renderOverview(); }, 200); });
    setInterval(() => { if (app.view === "inbox") renderList(); }, 30000);
    route();
  }

  function login(err) {
    $("#view").innerHTML = `<div class="login card"><h3>Sign in to your Tickless server</h3><p class="sub">Paste the admin token printed when the server started (or set with TICKLESS_ADMIN_TOKEN).</p>
      <form id="lf" class="stack"><input type="text" id="tok" placeholder="Admin token" autocomplete="off" required>${err ? `<div class="small" style="color:var(--bad)">${E(err)}</div>` : ""}<button class="btn">Connect</button></form></div>`;
    $("#lf").onsubmit = (e) => { e.preventDefault(); LS.set("tickless:token", $("#tok").value.trim()); location.reload(); };
  }

  /* ------------------------------------------------------------ routing */
  const TITLES = { overview: "Overview", inbox: "Inbox", knowledge: "Knowledge", flows: "Troubleshooters", macros: "Macros", status: "Status & incidents", widget: "Widget & bot", install: "Install" };
  function route() {
    const parts = (location.hash || "#/overview").slice(2).split("/");
    app.view = TITLES[parts[0]] ? parts[0] : "overview";
    app.arg = parts.slice(1).map(decodeURIComponent);
    if (app.view === "inbox") { const next = app.arg[0] || app.sel; if (next !== app.sel) { app.sel = next; app.composerFor = null; } }
    $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === app.view));
    $("#title").textContent = TITLES[app.view];
    render(true);
  }
  const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

  let raf = 0;
  function onOp(op) {
    if (op.t === "typing") { if (op.who === "visitor" && app.view === "inbox" && op.convId === app.sel) renderPeek(op); return; }
    if (op.t === "conv.update" && op.patch && op.patch.status === "open" && op.patch.escalatedAt && op.origin !== "self") {
      const c = st().conversations[op.convId];
      if (c) toast(`New handoff: ${(c.visitor && c.visitor.name) || "Visitor"} — ${Core.INTENT_LABEL[c.intent] || "question"}`);
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => render(false));
  }

  function badges() {
    const convs = Object.values(st().conversations);
    $("#cnt-inbox").textContent = convs.filter(needsReply).length || "";
    $("#cnt-gaps").textContent = st().gaps.filter((g) => g.status === "open").length || "";
    $("#cnt-status").textContent = st().incidents.filter((i) => i.active).length || "";
  }

  // full = navigation; partial = live data changed (don't clobber forms being edited)
  function render(full) {
    if (!app.store) return;
    badges();
    const v = app.view;
    if (v === "overview") return renderOverview();
    if (v === "inbox") return full ? renderInbox() : refreshInbox();
    if (!full) {
      if (v === "knowledge" && !app.arg[0] && app.kbTab === "gaps") return renderKnowledge();
      if (v === "flows" && !app.arg[0]) return renderFlows();
      return;
    }
    ({ knowledge: renderKnowledge, flows: renderFlows, macros: renderMacros, status: renderStatus, widget: renderWidget, install: renderInstall })[v]();
  }

  /* ------------------------------------------------------------ tooltips */
  const tip = () => $("#tip");
  function showTip(el, x, y) {
    let d; try { d = JSON.parse(el.getAttribute("data-tip")); } catch (e) { return; }
    const t = tip(); t.innerHTML = "";
    const tt = document.createElement("div"); tt.className = "tt"; tt.textContent = d.t; t.appendChild(tt);
    for (const [label, val, color] of d.r) {
      const r = document.createElement("div"); r.className = "tr";
      if (color) { const k = document.createElement("i"); k.className = "k"; k.style.background = `var(${color})`; r.appendChild(k); }
      const b = document.createElement("b"); b.textContent = val; r.appendChild(b);
      const s = document.createElement("span"); s.textContent = label; r.appendChild(s);
      t.appendChild(r);
    }
    t.hidden = false;
    const w = t.offsetWidth, h = t.offsetHeight;
    t.style.left = Math.min(innerWidth - w - 8, x + 14) + "px";
    t.style.top = Math.max(8, y - h - 12) + "px";
    $$(".hov").forEach((n) => n.classList.remove("hov")); el.classList.add("hov");
  }
  function hideTip() { tip().hidden = true; $$(".hov").forEach((n) => n.classList.remove("hov")); }
  function tipMove(e) { const el = e.target.closest && e.target.closest("[data-tip]"); el ? showTip(el, e.clientX, e.clientY) : hideTip(); }
  function tipFocus(e) { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.right, r.top + 10); } }
  const tipAttr = (t, rows, noFocus) => `data-tip="${E(JSON.stringify({ t, r: rows }))}"${noFocus ? "" : ' tabindex="0"'}`;

  /* ------------------------------------------------------------ charts */
  function nice(max) {
    if (max <= 5) return { max: 5, step: 1 };
    const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    return { max: Math.ceil(max / step) * step, step };
  }
  const topRound = (x, y, w, h, r) => { r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
  const rightRound = (x, y, w, h, r) => { r = Math.min(r, h / 2, w); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };

  function chartStacked(daily, width) {
    const W = Math.max(320, width || 760), H = 230, L = 34, R = 6, T = 8, B = 24, ph = H - T - B;
    const { max, step } = nice(Math.max(1, ...daily.map((d) => d.bot + d.human)));
    const band = (W - L - R) / daily.length, bw = Math.min(24, band * 0.64);
    let g = "";
    for (let v = 0; v <= max; v += step) {
      const y = T + ph - (v / max) * ph;
      g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 3.5}" text-anchor="end">${num(v)}</text>`;
    }
    const every = daily.length <= 7 ? 1 : daily.length <= 14 ? 2 : 5;
    daily.forEach((d, i) => {
      const x = L + i * band + (band - bw) / 2, base = T + ph;
      const hb = (d.bot / max) * ph, hh = (d.human / max) * ph;
      const rows = [["Resolved by bot", num(d.bot), "--series-1"], ["Handled by team", num(d.human), "--series-2"], ["Total", num(d.bot + d.human)]];
      let marks = "";
      if (hb > 0) marks += hh > 0 ? `<rect class="mark" x="${x}" y="${base - hb}" width="${bw}" height="${hb}" fill="var(--series-1)"/>` : `<path class="mark" d="${topRound(x, base - hb, bw, hb, 4)}" fill="var(--series-1)"/>`;
      if (hh > 0) { const top = base - hb - (hb > 0 ? 2 : 0) - hh; marks += `<path class="mark" d="${topRound(x, top, bw, hh, 4)}" fill="var(--series-2)"/>`; }
      g += `<g ${tipAttr(new Date(d.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), rows)}><rect x="${L + i * band}" y="${T}" width="${band}" height="${ph}" fill="transparent"/>${marks}</g>`;
      if (i % every === 0) g += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${day(d.date)}</text>`;
    });
    g += `<line class="bl" x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily conversations, resolved by bot versus handled by team">${g}</svg>`;
  }

  function chartHeat(heat, width) {
    const W = Math.max(300, width || 520), L = 34, T = 16, cw = (W - L) / 24, ch = 17, H = T + 7 * ch + 4;
    const max = Math.max(1, ...heat.flat());
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let g = "";
    for (let h = 0; h < 24; h += 3) g += `<text x="${L + h * cw + cw / 2}" y="${T - 5}" text-anchor="middle">${String(h).padStart(2, "0")}</text>`;
    heat.forEach((row, r) => {
      g += `<text x="${L - 6}" y="${T + r * ch + ch / 2 + 3.5}" text-anchor="end">${days[r]}</text>`;
      row.forEach((v, h) => {
        const lvl = v === 0 ? 0 : Math.max(1, Math.ceil((v / max) * 7));
        g += `<rect class="mark" x="${L + h * cw + 1}" y="${T + r * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="2" fill="var(--h${lvl})" ${tipAttr(`${days[r]} ${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`, [["conversations", num(v)]], true)}/>`;
      });
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Conversations by weekday and hour">${g}</svg>
      <div class="heat-legend">Fewer ${[1, 2, 3, 4, 5, 6, 7].map((i) => `<i style="background:var(--h${i})"></i>`).join("")} More</div>`;
  }

  function chartHBars(rows, labelW, width) {
    const W = Math.max(280, width || 460), L = labelW || 120, rowH = 26, H = rows.length * rowH + 4, room = 110;
    const max = Math.max(1, ...rows.map((r) => r.value));
    let g = "";
    rows.forEach((r, i) => {
      const y = i * rowH + 5, h = 14, w = Math.max(2, (r.value / max) * (W - L - room));
      g += `<g ${tipAttr(r.label, [[r.unit || "conversations", num(r.value)]].concat(r.tipExtra || []))}>
        <rect x="0" y="${y - 5}" width="${W}" height="${rowH}" fill="transparent"/>
        <text class="ink" x="${L - 8}" y="${y + 11}" text-anchor="end">${E(r.label)}</text>
        <path class="mark" d="${rightRound(L, y, w, h, 4)}" fill="var(--series-1)"/>
        <text class="val" x="${L + w + 6}" y="${y + 11}">${num(r.value)}${r.note ? ` <tspan class="muted" style="font-weight:400">· ${E(r.note)}</tspan>` : ""}</text></g>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  }

  function csatBar(dist) {
    const total = dist.reduce((s, n) => s + n, 0);
    if (!total) return `<div class="empty">No ratings in this period yet.</div>`;
    const names = ["Very unhappy", "Unhappy", "Neutral", "Happy", "Very happy"];
    const darkText = (i) => { const dark = document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches); return dark ? [false, false, false, false, true][i] : [false, true, true, true, false][i]; };
    const parts = dist.map((n, i) => n ? `<div class="mark" style="flex:${n};background:var(--c${i + 1});color:${darkText(i) ? "#0b0b0b" : "#fff"}" ${tipAttr(`${i + 1} · ${names[i]}`, [["ratings", `${num(n)} (${Math.round((n / total) * 100)}%)`]])}>${n / total >= 0.09 ? Math.round((n / total) * 100) + "%" : ""}</div>` : "").join("");
    return `<div class="segbar" role="img" aria-label="CSAT rating distribution">${parts}</div>
      <div class="legend">${names.map((nm, i) => `<span><i style="background:var(--c${i + 1})"></i>${i + 1} ${nm}</span>`).join("")}</div>`;
  }

  const table = (head, rows, numCols) => `<details class="tv"><summary>Show as table</summary><table class="t"><thead><tr>${head.map((h, i) => `<th class="${(numCols || []).includes(i) ? "n" : ""}">${E(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${(numCols || []).includes(i) ? "n" : ""}">${E(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;

  function delta(cur, prev, upGood, fmt) {
    if (cur == null || prev == null || prev === 0) return `<div class="delta">No previous data</div>`;
    const diff = cur - prev;
    if (Math.abs(diff) < 1e-9) return `<div class="delta">Same as previous ${app.range} days</div>`;
    const good = (diff > 0) === upGood;
    return `<div class="delta"><span class="${good ? "up" : "down"}">${diff > 0 ? "▲" : "▼"} ${fmt(Math.abs(diff))}</span> vs previous ${app.range} days</div>`;
  }

  /* ------------------------------------------------------------ overview */
  function renderOverview() {
    const M = Core.metrics(st(), { days: app.range });
    const c = M.cur, p = M.prev;
    const v = $("#view");
    const scroll = v.scrollTop;
    v.innerHTML = `<div class="pad">
      <div class="filters"><div class="seg" id="range">${[7, 14, 30].map((d) => `<button class="${app.range === d ? "on" : ""}" data-d="${d}">Last ${d} days</button>`).join("")}</div>
        <span class="muted small">Deltas compare with the ${app.range} days before.</span></div>
      <div class="hero card"><div><div class="lbl">Automated resolution</div><div class="big">${pct(c.automation)}</div></div>
        <div><p><b>${E(S().botName || "The bot")} resolved ${num(c.bot)} of ${num(c.total)} conversations</b> without a human in the last ${app.range} days — about <b>${money(M.savings)}</b> of agent time saved at ${money(S().costPerTicket || 6)} per ticket.</p>
        ${delta(c.automation, p.automation, true, (x) => Math.round(x * 100) + " pts")}</div></div>
      <div class="tiles">
        <div class="card tile"><div class="lbl">Conversations</div><div class="val">${num(c.total)}</div>${delta(c.total, p.total, true, num)}</div>
        <div class="card tile"><div class="lbl">Customer satisfaction</div><div class="val">${pct(c.csat)}</div>${delta(c.csat, p.csat, true, (x) => Math.round(x * 100) + " pts")}</div>
        <div class="card tile"><div class="lbl">Median first response</div><div class="val">${dur(c.frt)}</div>${delta(c.frt, p.frt, false, dur)}</div>
        <div class="card tile"><div class="lbl">Open right now</div><div class="val">${num(M.openNow)}</div><div class="delta">${M.slaBreached ? `<span class="down">⚠ ${M.slaBreached} past ${slaMin()}m SLA</span>` : "All within SLA"}</div></div>
        <div class="card tile"><div class="lbl">Saved this period</div><div class="val">${money(M.savings)}</div>${delta(M.savings, M.prevSavings, true, money)}</div>
      </div>
      <div class="grid2">
        <div class="card wide"><h3>Daily conversations</h3><p class="sub">Who closed each conversation</p>
          <div class="legend"><span><i style="background:var(--series-1)"></i>Resolved by bot</span><span><i style="background:var(--series-2)"></i>Handled by team</span></div>
          <div data-chart="stacked"></div>${table(["Date", "Resolved by bot", "Handled by team"], M.daily.map((d) => [day(d.date), d.bot, d.human]), [1, 2])}</div>
        <div class="card"><h3>Topics</h3><p class="sub">Conversations per topic, with the share the bot resolved</p>
          <div data-chart="intents"></div>
          ${table(["Topic", "Conversations", "Resolved by bot"], M.intents.map((i) => [i.label, i.total, i.bot]), [1, 2])}</div>
        <div class="card"><h3>Customer satisfaction</h3><p class="sub">${num(c.rated)} ratings · average ${c.csatAvg ? c.csatAvg.toFixed(2) : "—"} / 5</p>
          ${csatBar(M.csatDist)}${table(["Rating", "Count"], M.csatDist.map((n, i) => [String(i + 1), n]), [1])}
          <h3 style="margin-top:14px">Mood at first contact</h3><p class="sub">Detected automatically in every language</p>
          <div data-chart="moods"></div></div>
        <div class="card"><h3>When customers write</h3><p class="sub">Staff the hours that matter (your local time)</p><div data-chart="heat"></div>
          ${table(["Day", ...Array.from({ length: 24 }, (_, h) => String(h))], M.heat.map((r, i) => [["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], ...r]))}</div>
        <div class="card"><h3>Languages</h3><p class="sub">Detected per conversation — the bot answers in each one</p>
          <div data-chart="langs"></div>
          ${table(["Language", "Conversations"], M.langs.map(([k, n]) => [LANG[k] || k, n]), [1])}</div>
        <div class="card"><h3>Content gaps</h3><p class="sub">Questions the bot couldn't answer. Each article you write here closes tickets forever.</p>
          ${M.gaps.length ? `<table class="t"><thead><tr><th>Question</th><th class="n">Asked</th><th></th></tr></thead><tbody>${M.gaps.slice(0, 6).map((g) => `<tr><td>${E(g.q)}</td><td class="n">${g.count}×</td><td class="n"><button class="btn sm ghost" data-gap="${E(g.id)}">Write article</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No gaps. The bot knows its stuff.</div>`}</div>
        <div class="card"><h3>Top articles</h3><p class="sub">Views and how often they solved it</p>
          <table class="t"><thead><tr><th>Article</th><th class="n">Views</th><th>Helpful</th></tr></thead><tbody>${M.articles.slice(0, 6).map((a) => { const h = (a.helpful || 0), n = h + (a.notHelpful || 0); return `<tr class="click" data-art="${E(a.id)}"><td>${E(a.title)}</td><td class="n">${num(a.views || 0)}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="bar-mini grow"><i style="width:${n ? (h / n) * 100 : 0}%"></i></div><span class="small">${n ? Math.round((h / n) * 100) + "%" : "—"}</span></div></td></tr>`; }).join("")}</tbody></table></div>
        <div class="card"><h3>Troubleshooters</h3><p class="sub">Guided fixes: started vs fixed without a human</p>
          <table class="t"><thead><tr><th>Flow</th><th class="n">Started</th><th class="n">Fixed</th><th class="n">Handoff</th></tr></thead><tbody>${M.flows.map((f) => `<tr class="click" data-flow="${E(f.f.id)}"><td>${E(f.f.name)}</td><td class="n">${num(f.started)}</td><td class="n">${f.started ? Math.round((f.fixed / f.started) * 100) + "%" : "—"}</td><td class="n">${f.started ? Math.round((f.handoff / f.started) * 100) + "%" : "—"}</td></tr>`).join("")}</tbody></table></div>
      </div></div>`;
    const charts = {
      stacked: (w) => chartStacked(M.daily, w),
      intents: (w) => chartHBars(M.intents.map((i) => ({ label: i.label, value: i.total, note: Math.round((i.bot / Math.max(1, i.total)) * 100) + "% automated", tipExtra: [["resolved by bot", num(i.bot)]] })), 130, w),
      moods: (w) => chartHBars(M.moods.map(([k, n]) => ({ label: MOOD[k] || k, value: n })), 130, w),
      heat: (w) => chartHeat(M.heat, w),
      langs: (w) => chartHBars(M.langs.map(([k, n]) => ({ label: LANG[k] || k, value: n, note: Math.round((n / Math.max(1, c.total)) * 100) + "%" })), 100, w),
    };
    $$("[data-chart]", v).forEach((el) => { el.innerHTML = charts[el.dataset.chart](el.clientWidth); });
    v.scrollTop = scroll;
    $$("#range button").forEach((b) => b.onclick = () => { app.range = +b.dataset.d; renderOverview(); });
    $$("[data-gap]").forEach((b) => b.onclick = () => go("#/knowledge/new/gap:" + b.dataset.gap));
    $$("[data-art]").forEach((r) => r.onclick = () => go("#/knowledge/edit/" + r.dataset.art));
    $$("[data-flow]").forEach((r) => r.onclick = () => go("#/flows/edit/" + r.dataset.flow));
  }

  /* ------------------------------------------------------------ inbox */
  const FILTERS = [
    ["needs", "Needs reply", needsReply],
    ["mine", "Mine", (c) => (c.status === "open" || c.status === "pending") && c.assignee === app.me],
    ["bot", "With bot", (c) => c.status === "bot" && Date.now() - (c.updatedAt || c.createdAt) < 86400000],
    ["pending", "Waiting on customer", (c) => c.status === "pending"],
    ["resolved", "Resolved", (c) => c.status === "resolved"],
    ["all", "All", () => true],
  ];

  function renderInbox() {
    $("#view").innerHTML = `<div class="inbox"><div class="list"><div class="list-head">
        <input type="search" id="q" placeholder="Search name, email, message…" value="${E(app.q)}">
        <div class="seg" id="filters"></div></div><div class="list-body" id="list"></div></div>
      <div class="thread" id="thread"></div><aside class="prof" id="prof"></aside></div>`;
    $("#q").oninput = (e) => { app.q = e.target.value; renderList(); };
    refreshInbox();
  }
  function refreshInbox() {
    if (!$("#list")) return renderInbox();
    renderList(); renderThread(); renderProfile();
  }

  function renderList() {
    if (!$("#list")) return;
    const all = Object.values(st().conversations);
    $("#filters").innerHTML = FILTERS.map(([k, label, fn]) => `<button class="${app.filter === k ? "on" : ""}" data-f="${k}">${label}${k === "all" || k === "resolved" ? "" : ` <b>${all.filter(fn).length}</b>`}</button>`).join("");
    $$("#filters button").forEach((b) => b.onclick = () => { app.filter = b.dataset.f; renderList(); });
    const fn = FILTERS.find((f) => f[0] === app.filter)[2];
    const q = app.q.trim().toLowerCase();
    let list = all.filter(fn).filter((c) => !q || [c.visitor && c.visitor.name, c.visitor && c.visitor.email, ...c.messages.map((m) => m.text)].join(" ").toLowerCase().includes(q));
    if (app.filter === "needs" || app.filter === "mine") list.sort((a, b) => (PRIO[b.priority] || 1) - (PRIO[a.priority] || 1) || waitingSince(a) - waitingSince(b));
    else list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    const sla = slaMin() * MIN;
    $("#list").innerHTML = list.slice(0, 150).map((c) => {
      const lp = lastPublic(c) || { text: "" };
      const w = Date.now() - waitingSince(c);
      const vis = c.visitor || {};
      return `<div class="ci${c.id === app.sel ? " on" : ""}" data-c="${E(c.id)}">
        <div class="avatar" style="background:${avColor(vis.name)}">${E(initials(vis.name || "Visitor"))}</div>
        <div class="nm">${E(vis.name || "Visitor " + c.id.slice(-4))}${c.unread && c.status !== "resolved" ? '<span class="unread"></span>' : ""}</div>
        <div class="tm">${needsReply(c) ? `<span class="sla${w > sla ? " late" : ""}" title="Waiting for a reply">${dur(w / MIN)}</span>` : ago(c.updatedAt || c.createdAt)}</div>
        <div class="pv">${lp.role === "agent" ? "You: " : lp.role === "bot" ? "🤖 " : ""}${E(lp.text.slice(0, 120))}</div>
        <div class="meta">${c.priority === "urgent" || c.priority === "high" ? `<span class="pill ${c.priority}">${c.priority}</span>` : ""}${c.sentiment === "angry" || c.sentiment === "negative" ? `<span class="pill">${MOOD[c.sentiment].split(" ")[0]}</span>` : ""}<span class="pill">${E((c.lang || "en").toUpperCase())}</span>${c.intent ? `<span class="pill">${E(Core.INTENT_LABEL[c.intent] || c.intent)}</span>` : ""}${c.status === "bot" ? '<span class="pill blue">live with bot</span>' : ""}${c.assigneeName && c.status !== "resolved" ? `<span class="pill">→ ${E(c.assigneeName.split(" ")[0])}</span>` : ""}</div></div>`;
    }).join("") || `<div class="empty">Nothing here. ${app.filter === "needs" ? "Inbox zero 🎉" : ""}</div>`;
    $$("#list .ci").forEach((el) => el.onclick = () => go("#/inbox/" + el.dataset.c));
  }

  function msgHTML(m, c) {
    const meta = m.meta || {};
    if (m.role === "system") return `<div class="small muted" style="align-self:center">${E(m.text)}</div>`;
    if (m.role === "note") return `<div class="m note"><div class="by">${meta.kind === "summary" ? "🤖 Handoff summary · only your team sees this" : "🔒 Internal note · " + E(m.author || "Team")} · ${time(m.at)}</div><div class="bub">${E(m.text)}</div></div>`;
    if (m.role === "visitor") return `<div class="m"><div class="by">${E((c.visitor && c.visitor.name) || "Visitor")} · ${time(m.at)}${meta.redacted ? " · 🔒 sensitive data masked" : ""}</div><div class="bub">${E(m.text)}</div></div>`;
    const kb = st().kb;
    const refs = (meta.articles || []).map((id) => kb.find((a) => a.id === id)).filter(Boolean);
    const flow = meta.flow ? st().flows.find((f) => f.id === meta.flow) : null;
    const who = m.role === "bot" ? `🤖 ${E(S().botName || "Bot")} (${meta.source === "ai" ? "AI" : "bot"}${meta.confidence ? " · " + Math.round(meta.confidence * 100) + "% match" : ""})` : E(m.author || "Agent");
    return `<div class="m team${m.role === "bot" ? " bot" : ""}"><div class="by">${who} · ${time(m.at)}</div><div class="bub">${Core.md(m.text)}</div>
      ${refs.length || flow ? `<div class="refs">${refs.map((a) => `<span class="pill">📄 ${E(a.title)}</span>`).join("")}${flow ? `<span class="pill">🧭 ${E(flow.name)}</span>` : ""}</div>` : ""}</div>`;
  }

  function renderThread() {
    const box = $("#thread");
    const c = app.sel && st().conversations[app.sel];
    if (!c) { box.innerHTML = `<div class="empty" style="margin:auto">Select a conversation.<br><span class="small">Tip: open the <a href="demo.html" target="_blank" rel="noopener">demo site</a> next to this tab and chat — it appears here live.</span></div>`; app.composerFor = null; return; }
    if (c.unread) dispatch({ t: "conv.update", convId: c.id, patch: { unread: 0 } });
    const vis = c.visitor || {};
    const team = S().team || [];
    const head = `<div class="th-head"><div class="avatar" style="background:${avColor(vis.name)}">${E(initials(vis.name || "V"))}</div>
      <div class="who"><b>${E(vis.name || "Visitor")}</b><div>${E(vis.email || "no email yet")} · ${E(LANG[c.lang] || "English")} ${flag(vis.country)}</div></div>
      <span class="pill ${c.status === "resolved" ? "ok" : c.status === "bot" ? "blue" : ""}">${E({ open: "Open", pending: "Waiting on customer", resolved: "Resolved", bot: "With bot" }[c.status] || c.status)}</span>
      <select id="assign" aria-label="Assignee"><option value="">Unassigned</option>${team.map((a) => `<option value="${E(a.id)}"${c.assignee === a.id ? " selected" : ""}>${E(a.name)}</option>`).join("")}</select>
      <select id="prio" aria-label="Priority">${["low", "normal", "high", "urgent"].map((p) => `<option${(c.priority || "normal") === p ? " selected" : ""}>${p}</option>`).join("")}</select>
      ${c.status === "resolved" ? `<button class="btn ghost sm" id="reopen">Reopen</button>` : `<button class="btn sm" id="resolve">✓ Resolve</button>`}</div>`;
    const msgs = `<div class="msgs" id="msgs">${c.messages.map((m) => msgHTML(m, c)).join("")}</div><div class="peek" id="peek"></div>`;
    let prevTop = null;
    const fresh = app.composerFor !== c.id;
    if (fresh) {
      box.innerHTML = head + msgs + composerHTML(c);
      app.composerFor = c.id;
      bindComposer(c);
    } else {
      const ta = $("#reply");
      const keep = { v: ta.value, s: ta.selectionStart, e: ta.selectionEnd, f: document.activeElement === ta };
      box.querySelector(".th-head").outerHTML = head;
      prevTop = $("#msgs").scrollTop;
      $("#msgs").outerHTML = `<div class="msgs" id="msgs">${c.messages.map((m) => msgHTML(m, c)).join("")}</div>`;
      ta.value = keep.v; if (keep.f) { ta.focus(); ta.setSelectionRange(keep.s, keep.e); }
      refreshTools(c);
    }
    const ms = $("#msgs");
    const key = c.id + ":" + c.messages.length;
    if (fresh || app._scrollKey !== key) { ms.scrollTop = ms.scrollHeight; app._scrollKey = key; } else ms.scrollTop = prevTop;
    $("#assign").onchange = (e) => { const a = team.find((x) => x.id === e.target.value); dispatch({ t: "conv.update", convId: c.id, patch: { assignee: a ? a.id : null, assigneeName: a ? a.name : null } }); };
    $("#prio").onchange = (e) => dispatch({ t: "conv.update", convId: c.id, patch: { priority: e.target.value } });
    const rs = $("#resolve"); if (rs) rs.onclick = () => { dispatch({ t: "conv.update", convId: c.id, patch: { status: "resolved", resolvedBy: "agent", resolvedAt: Date.now() } }); toast("Resolved. The customer gets a satisfaction survey."); };
    const ro = $("#reopen"); if (ro) ro.onclick = () => dispatch({ t: "conv.update", convId: c.id, patch: { status: "open", resolvedBy: null, resolvedAt: null } });
  }

  function renderPeek(op) {
    const p = $("#peek"); if (!p) return;
    const c = st().conversations[op.convId];
    p.textContent = op.on && op.text ? `${firstName(c)} is typing: “${op.text}”` : "";
  }

  function composerHTML(c) {
    const ai = app.ai;
    return `<div class="composer${app.mode === "note" ? " note-mode" : ""}" id="composer">
      <div class="modes"><button class="md${app.mode === "reply" ? " on" : ""}" data-md="reply">Reply</button><button class="md${app.mode === "note" ? " on" : ""}" data-md="note">Internal note</button>
        <span class="grow"></span><span class="small muted" id="langhint"></span></div>
      <div class="macro-pop"><div class="macro-list" id="mlist" hidden></div>
      <textarea id="reply" placeholder="Write a reply… type / for macros · Ctrl+Enter to send"></textarea></div>
      <div class="tools">
        <button class="btn ghost sm" id="b-macros" title="Insert a saved reply">⚡ Macros</button>
        <button class="btn ghost sm" id="b-suggest" title="${ai ? "Claude drafts a reply from your knowledge base" : "Drafts a reply from the best-matching article"}">✨ Suggest reply</button>
        <button class="btn ghost sm" id="b-sum" title="Adds a summary as an internal note">Summarize</button>
        <button class="btn ghost sm" id="b-tr"></button>
        <button class="btn ghost sm" id="b-pol" title="Fix tone, grammar and clarity">Polish</button>
        <span class="grow"></span><button class="btn" id="b-send">Send</button></div></div>`;
  }

  function refreshTools(c) {
    const tr = $("#b-tr");
    const l = c.lang || "en";
    tr.hidden = l === "en";
    tr.textContent = `Translate → ${LANG[l] || l}`;
    tr.title = app.ai ? `Write in English, send in ${LANG[l]}` : "Needs the AI server (see Install)";
    $("#langhint").textContent = l !== "en" ? `Customer writes in ${LANG[l]}` : "";
  }

  function bindComposer(c) {
    const ta = $("#reply"), ml = $("#mlist");
    ta.value = app.draft[c.id] || "";
    refreshTools(c);
    $$("#composer [data-md]").forEach((b) => b.onclick = () => { app.mode = b.dataset.md; $$("#composer [data-md]").forEach((x) => x.classList.toggle("on", x === b)); $("#composer").classList.toggle("note-mode", app.mode === "note"); ta.focus(); });
    let typingOn = false, typingT = 0, sel = 0;
    const macros = () => st().macros;
    const showMacros = (filter) => {
      const f = (filter || "").toLowerCase();
      const list = macros().filter((m) => !f || m.shortcut.toLowerCase().startsWith(f) || m.name.toLowerCase().includes(f));
      if (!list.length) { ml.hidden = true; return; }
      sel = Math.min(sel, list.length - 1);
      ml.innerHTML = list.map((m, i) => `<button data-mc="${E(m.id)}" class="${i === sel ? "sel" : ""}"><b>/${E(m.shortcut)}</b> ${E(m.name)}<small>${E(fill(m.body, c))}</small></button>`).join("");
      ml.hidden = false;
      $$("[data-mc]", ml).forEach((b) => b.onmousedown = (e) => { e.preventDefault(); insertMacro(b.dataset.mc); });
    };
    const insertMacro = (id) => {
      const m = macros().find((x) => x.id === id); if (!m) return;
      ta.value = ta.value.startsWith("/") ? fill(m.body, c) : (ta.value ? ta.value + "\n" : "") + fill(m.body, c);
      ml.hidden = true; ta.focus(); app.draft[c.id] = ta.value;
    };
    ta.addEventListener("input", () => {
      app.draft[c.id] = ta.value;
      if (ta.value.startsWith("/") && !ta.value.includes(" ")) { sel = 0; showMacros(ta.value.slice(1)); } else ml.hidden = true;
      if (app.mode === "reply") {
        if (!typingOn) { typingOn = true; dispatch({ t: "typing", convId: c.id, who: "agent", name: meName(), on: true }); }
        clearTimeout(typingT); typingT = setTimeout(() => { typingOn = false; dispatch({ t: "typing", convId: c.id, who: "agent", on: false }); }, 2500);
      }
    });
    ta.addEventListener("keydown", (e) => {
      if (!ml.hidden) {
        const items = $$("[data-mc]", ml);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length; showMacros(ta.value.slice(1)); return; }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (items[sel]) insertMacro(items[sel].dataset.mc); return; }
        if (e.key === "Escape") { ml.hidden = true; return; }
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
    });
    $("#b-macros").onclick = () => { if (ml.hidden) { sel = 0; showMacros(""); } else ml.hidden = true; };
    const send = async () => {
      const text = ta.value.trim(); if (!text) return;
      const cur = st().conversations[c.id];
      const msg = { id: Core.uid("m_"), role: app.mode === "note" ? "note" : "agent", text, at: Date.now(), author: meName() };
      await dispatch({ t: "msg.add", convId: c.id, msg });
      if (app.mode === "reply") {
        const patch = { status: "pending" };
        if (!cur.assignee) Object.assign(patch, { assignee: app.me, assigneeName: meName() });
        if (!cur.escalatedAt) Object.assign(patch, { escalatedAt: Date.now(), handoffReason: "agent_takeover" });
        dispatch({ t: "conv.update", convId: c.id, patch });
        clearTimeout(typingT); typingOn = false; dispatch({ t: "typing", convId: c.id, who: "agent", on: false });
      }
      ta.value = ""; app.draft[c.id] = "";
    };
    $("#b-send").onclick = send;
    $("#b-suggest").onclick = () => assist("suggest", c);
    $("#b-sum").onclick = () => assist("summarize", c);
    $("#b-tr").onclick = () => assist("translate", c);
    $("#b-pol").onclick = () => assist("polish", c);
  }

  async function assist(task, c0) {
    const c = st().conversations[c0.id], ta = $("#reply");
    const btn = { suggest: "#b-suggest", summarize: "#b-sum", translate: "#b-tr", polish: "#b-pol" }[task];
    const b = $(btn); const label = b.textContent; b.disabled = true; b.textContent = "Working…";
    try {
      if (app.ai) {
        const r = await app.store.ai("/api/admin/ai", { task, convId: c.id, text: ta.value, agent: meName() });
        if (task === "summarize") await dispatch({ t: "msg.add", convId: c.id, msg: { id: Core.uid("m_"), role: "note", text: r.text, at: Date.now(), author: "AI summary", meta: { kind: "summary" } } });
        else { ta.value = r.text; app.draft[c.id] = r.text; ta.focus(); }
      } else {
        if (task === "translate") { toast("Translation needs the AI server (Install → Server mode)."); return; }
        if (task === "summarize") await dispatch({ t: "msg.add", convId: c.id, msg: { id: Core.uid("m_"), role: "note", text: localSummary(c), at: Date.now(), author: "Summary", meta: { kind: "summary" } } });
        if (task === "suggest") { ta.value = localSuggest(c); app.draft[c.id] = ta.value; ta.focus(); }
        if (task === "polish") { if (!ta.value.trim()) return toast("Write something first."); ta.value = localPolish(ta.value, c); app.draft[c.id] = ta.value; }
      }
    } catch (e) { toast("Assist failed: " + e.message); }
    finally { const bb = $(btn); if (bb) { bb.disabled = false; bb.textContent = label; } }
  }

  function visitorText(c) { return c.messages.filter((m) => m.role === "visitor").map((m) => m.text).join(" \n"); }
  function localSuggest(c) {
    const hits = Core.searchKB(st().kb, visitorText(c), 1);
    const a = hits[0] && hits[0].article;
    const hi = `Hi ${firstName(c)}, thanks for reaching out — `;
    const dup = st().macros.find((m) => m.id === "mc_dup");
    if (dup && c.messages.some((m) => m.role === "visitor" && /twice|double|duplicate/i.test(m.text))) return fill(dup.body, c);
    if (!a) return hi + "I'm looking into this for you now and will get back to you shortly.";
    return hi + a.answer.replace(/^\w/, (x) => x.toLowerCase()) + `\n\nFull guide: **${a.title}**. Let me know if anything's unclear!`;
  }
  function localSummary(c) {
    const vis = c.visitor || {};
    const first = c.messages.find((m) => m.role === "visitor");
    const ents = [];
    c.messages.filter((m) => m.role === "visitor").forEach((m) => Core.entities(m.text).forEach((e) => { if (!ents.includes(e.value)) ents.push(e.value); }));
    const next = { billing: "Check payment history in Stripe; refund duplicates in full.", account: "Verify identity, then reset access.", technical: "Reproduce, collect browser/region, escalate to engineering if needed.", cancellation: "Offer downgrade/pause before cancelling; confirm data export.", sales: "Qualify team size & needs; offer a Business trial.", privacy: "Share DPA / residency docs." }[c.intent] || "Clarify the request.";
    return [`Summary`, `• ${vis.name || "Visitor"}${vis.plan ? " (" + vis.plan + " plan)" : ""}${vis.country ? ", " + vis.country : ""} — ${Core.INTENT_LABEL[c.intent] || "General"}, mood ${c.sentiment || "neutral"}, writes in ${LANG[c.lang] || "English"}.`,
      first ? `• Issue: “${first.text.slice(0, 200)}”` : "", ents.length ? `• Key details: ${ents.join(", ")}` : "",
      `• ${c.messages.filter((m) => m.role === "visitor").length} customer messages, waiting ${dur((Date.now() - waitingSince(c)) / MIN)}.`, `• Next step: ${next}`].filter(Boolean).join("\n");
  }
  function localPolish(t, c) {
    let s = t.trim().replace(/\s+([,.!?])/g, "$1").replace(/[ \t]+/g, " ");
    s = s.replace(/(^|[.!?]\s+|\n)([a-z])/g, (m, p, ch) => p + ch.toUpperCase()).replace(/\bi\b/g, "I");
    if (!/[.!?)]$/.test(s)) s += ".";
    if (!/^(hi|hello|hey|dear)\b/i.test(s)) s = `Hi ${firstName(c)}, ${s.charAt(0).toLowerCase() + s.slice(1)}`;
    return s;
  }

  function renderProfile() {
    const box = $("#prof"); if (!box) return;
    const c = app.sel && st().conversations[app.sel];
    if (!c) { box.innerHTML = ""; return; }
    const v = c.visitor || {};
    const ents = [];
    c.messages.filter((m) => m.role === "visitor").forEach((m) => Core.entities(m.text).forEach((e) => { if (!ents.some((x) => x.value === e.value)) ents.push(e); }));
    const hits = Core.searchKB(st().kb, visitorText(c), 3).filter((h) => h.confidence > 0.2);
    const past = Object.values(st().conversations).filter((x) => x.id !== c.id && ((v.email && x.visitor && x.visitor.email === v.email) || (x.visitor && x.visitor.id === v.id))).sort((a, b) => b.createdAt - a.createdAt);
    box.innerHTML = `
      <div><h4>Customer</h4><dl class="kv"><dt>Name</dt><dd>${E(v.name || "—")}</dd><dt>Email</dt><dd>${E(v.email || "—")}</dd><dt>Plan</dt><dd>${E(v.plan || "—")}${v.seats ? " · " + E(v.seats) + " seats" : ""}</dd>
        <dt>Country</dt><dd>${flag(v.country)} ${E(v.country || "—")}</dd>${v.device ? `<dt>Device</dt><dd>${E(v.device)}</dd>` : ""}${v.tz ? `<dt>Timezone</dt><dd>${E(v.tz)}</dd>` : ""}<dt>Page</dt><dd>${E(v.page || "—")}</dd></dl></div>
      <div><h4>Insights</h4><dl class="kv"><dt>Topic</dt><dd>${E(Core.INTENT_LABEL[c.intent] || "—")}</dd><dt>Mood</dt><dd>${E(MOOD[c.sentiment] || "—")}</dd><dt>Language</dt><dd>${E(LANG[c.lang] || "—")}</dd>
        ${c.handoffReason ? `<dt>Handoff</dt><dd>${E({ frustration: "Frustration detected", asked_for_human: "Asked for a person", visitor_request: "Clicked “talk to a person”", flow: "Troubleshooter didn't fix it", ai: "AI flagged it", agent_takeover: "Agent jumped in" }[c.handoffReason] || c.handoffReason)}</dd>` : ""}
        ${c.csat ? `<dt>Rating</dt><dd>${"★".repeat(c.csat)}${"☆".repeat(5 - c.csat)}</dd>` : ""}</dl>
        ${ents.length ? `<div class="ents" style="margin-top:8px">${ents.map((e) => `<span class="pill" title="${E(e.type)}">${E(e.value)}</span>`).join("")}</div>` : ""}</div>
      <div><h4>Suggested articles</h4>${hits.length ? hits.map((h) => `<div class="sugg"><b>${E(h.article.title)}</b><div class="row" style="gap:8px"><div class="conf grow"><i style="width:${Math.round(h.confidence * 100)}%"></i></div><span class="small muted">${Math.round(h.confidence * 100)}%</span></div><div class="row"><button class="btn ghost sm" data-ins="${E(h.article.id)}">Insert answer</button></div></div>`).join("") : `<div class="small muted">No close match — maybe this deserves an article.</div>`}</div>
      <div><h4>History</h4>${past.length ? past.slice(0, 4).map((x) => `<div class="small" style="margin-bottom:6px"><a href="#/inbox/${E(x.id)}">${E(day(x.createdAt))} · ${E(Core.INTENT_LABEL[x.intent] || "Conversation")}</a> <span class="muted">${E(x.status)}</span></div>`).join("") : `<div class="small muted">First conversation.</div>`}</div>
      <div><h4>Turn it into knowledge</h4><button class="btn ghost sm" id="mk-art">Create article from this conversation</button></div>`;
    $$("[data-ins]", box).forEach((b) => b.onclick = () => {
      const a = st().kb.find((x) => x.id === b.dataset.ins), ta = $("#reply");
      if (!a || !ta) return;
      ta.value = (ta.value ? ta.value + "\n\n" : `Hi ${firstName(c)}, `) + a.answer; app.draft[c.id] = ta.value; ta.focus();
    });
    $("#mk-art").onclick = () => go("#/knowledge/new/conv:" + c.id);
  }

  /* ------------------------------------------------------------ knowledge */
  function renderKnowledge() {
    const [mode, id] = app.arg;
    if (mode === "edit" || mode === "new") return kbEditor(mode, id);
    const gaps = st().gaps.filter((g) => g.status === "open").sort((a, b) => b.count - a.count);
    const v = $("#view");
    const tabs = `<div class="tabs"><button data-t="articles" class="${app.kbTab === "articles" ? "on" : ""}">Articles (${st().kb.length})</button><button data-t="gaps" class="${app.kbTab === "gaps" ? "on" : ""}">Content gaps (${gaps.length})</button><button data-t="test" class="${app.kbTab === "test" ? "on" : ""}">Test the bot</button></div>`;
    let body = "";
    if (app.kbTab === "articles") {
      body = `<div class="row" style="margin-bottom:14px"><input type="search" id="kq" class="grow" placeholder="Filter articles…" value="${E(app.kq || "")}"><button class="btn" id="new-art">+ New article</button></div>
        <div class="card" style="padding:4px 8px"><table class="t"><thead><tr><th>Title</th><th>Tags</th><th class="n">Views</th><th class="n">Helpful</th><th>Status</th></tr></thead><tbody>
        ${st().kb.filter((a) => !app.kq || (a.title + " " + (a.tags || []).join(" ")).toLowerCase().includes(app.kq.toLowerCase())).map((a) => { const n = (a.helpful || 0) + (a.notHelpful || 0); return `<tr class="click" data-id="${E(a.id)}"><td><b>${E(a.title)}</b><div class="small muted">${E((a.answer || "").replace(/\*\*/g, "").slice(0, 110))}…</div></td><td>${(a.tags || []).slice(0, 3).map((t) => `<span class="pill">${E(t)}</span>`).join(" ")}</td><td class="n">${num(a.views || 0)}</td><td class="n">${n ? Math.round(((a.helpful || 0) / n) * 100) + "%" : "—"}</td><td>${a.status === "draft" ? '<span class="pill">Draft</span>' : '<span class="pill ok">Live</span>'}</td></tr>`; }).join("")}
        </tbody></table></div>`;
    } else if (app.kbTab === "gaps") {
      body = `<p class="muted" style="margin-top:0">Every question the bot couldn't answer confidently lands here, grouped and counted. Write the article once — the bot handles it forever.</p>
        <div class="card" style="padding:4px 8px">${gaps.length ? `<table class="t"><thead><tr><th>Question</th><th class="n">Times asked</th><th>Last asked</th><th></th></tr></thead><tbody>${gaps.map((g) => `<tr><td>${E(g.q)}</td><td class="n">${g.count}</td><td>${ago(g.lastAt)} ago</td><td class="n"><div class="row" style="justify-content:flex-end;gap:6px">${g.convId && st().conversations[g.convId] ? `<a class="btn ghost sm" href="#/inbox/${E(g.convId)}">See chat</a>` : ""}<button class="btn sm" data-write="${E(g.id)}">Write article</button><button class="btn ghost sm" data-dismiss="${E(g.id)}">Dismiss</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No open gaps.</div>`}</div>`;
    } else {
      body = `<div class="split"><div class="card"><h3>Ask like a customer would</h3><p class="sub">See exactly how the engine reads a message and what it would answer. Any language.</p>
          <form id="tf" class="row"><input type="text" id="tq" class="grow" value="${E(app.testQ)}" placeholder="e.g. mi tarjeta fue rechazada"><button class="btn">Test</button></form>
          <div class="row small" style="margin-top:10px;gap:6px">${["I was charged twice!!", "Ich habe mein Passwort vergessen", "notifications not arriving", "do you have a linux app?", "talk to a human"].map((q) => `<button class="btn ghost sm" data-tq="${E(q)}">${E(q)}</button>`).join("")}</div></div>
        <div id="tres"></div></div>`;
    }
    v.innerHTML = `<div class="pad">${tabs}${body}</div>`;
    $$(".tabs button").forEach((b) => b.onclick = () => { app.kbTab = b.dataset.t; renderKnowledge(); });
    if (app.kbTab === "articles") {
      $("#kq").oninput = (e) => { app.kq = e.target.value; const pos = e.target.selectionStart; renderKnowledge(); const k = $("#kq"); k.focus(); k.setSelectionRange(pos, pos); };
      $("#new-art").onclick = () => go("#/knowledge/new");
      $$("tr[data-id]").forEach((r) => r.onclick = () => go("#/knowledge/edit/" + r.dataset.id));
    }
    $$("[data-write]").forEach((b) => b.onclick = () => go("#/knowledge/new/gap:" + b.dataset.write));
    $$("[data-dismiss]").forEach((b) => b.onclick = () => dispatch({ t: "gap.update", id: b.dataset.dismiss, patch: { status: "dismissed" } }));
    if (app.kbTab === "test") {
      const run = (q) => { app.testQ = q; $("#tq").value = q; $("#tres").innerHTML = testBot(q); };
      $("#tf").onsubmit = (e) => { e.preventDefault(); run($("#tq").value); };
      $$("[data-tq]").forEach((b) => b.onclick = () => run(b.dataset.tq));
      if (app.testQ) run(app.testQ);
    }
  }

  function testBot(q) {
    if (!q.trim()) return "";
    const a = Core.analyze(q);
    const red = Core.redactPII(q);
    const res = Core.searchKB(st().kb, q, 5);
    const fm = Core.flowMatch(st().flows, q), inc = Core.incidentMatch(st().incidents, q);
    const out = Core.respond(st(), { messages: [], lang: null }, q);
    const th = (S().bot && S().bot.threshold) || 0.45;
    return `<div class="card stack"><h3>What the engine sees</h3>
      <dl class="kv"><dt>Language</dt><dd>${E(LANG[a.lang] || a.lang)}</dd><dt>Topic</dt><dd>${E(a.intent === "human" ? "Wants a person" : Core.INTENT_LABEL[a.intent] || a.intent)}</dd><dt>Mood</dt><dd>${E(MOOD[a.sentiment.label])}${a.sentiment.frustrated ? " · <b>frustrated → auto-handoff</b>" : ""}</dd>
      <dt>Details</dt><dd>${a.entities.map((e) => `<span class="pill">${E(e.type)}: ${E(e.value)}</span>`).join(" ") || "—"}</dd>${red.redacted ? `<dt>Privacy</dt><dd>Stored as: “${E(red.text)}”</dd>` : ""}
      <dt>Incident</dt><dd>${inc ? "⚠ " + E(inc.title) : "—"}</dd><dt>Troubleshooter</dt><dd>${fm ? "🧭 " + E(fm.flow.name) : "—"}</dd></dl>
      <div><b class="small">Article ranking</b> <span class="small muted">(answers above ${Math.round(th * 100)}% confidence)</span>
      ${res.length ? res.map((r) => `<div class="row" style="margin-top:6px;flex-wrap:nowrap"><span class="small grow">${E(r.article.title)}</span><div class="conf" style="width:120px"><i style="width:${Math.round(r.confidence * 100)}%;${r.confidence < th ? "background:var(--axis)" : ""}"></i></div><span class="small" style="width:36px;text-align:right">${Math.round(r.confidence * 100)}%</span></div>`).join("") : '<div class="small muted">No article matched.</div>'}</div>
      <div><b class="small">Bot reply</b><div class="pchat" style="margin-top:6px">${out.messages.map((m) => `<div class="m team bot" style="align-self:flex-start;max-width:100%"><div class="bub">${Core.md(m.text)}</div>${(m.meta.quick || []).length ? `<div class="refs" style="justify-content:flex-start">${m.meta.quick.map((x) => `<span class="pill blue">${E(x.label)}</span>`).join("")}</div>` : ""}</div>`).join("")}
      ${out.handoff ? `<div class="small"><b>→ Hands off to the team</b> (${E(out.handoff.reason)}, priority ${E(out.handoff.priority)}) with an automatic summary.</div>` : ""}${out.gaps.length ? `<div class="small muted">→ Logged as a content gap.</div>` : ""}</div></div></div>`;
  }

  function kbEditor(mode, id) {
    let a;
    if (mode === "edit") a = Core.clone(st().kb.find((x) => x.id === id) || {});
    if (!a || !a.id) {
      a = { id: Core.uid("kb_"), title: "", answer: "", body: "", tags: [], questions: [], status: "published", lang: "en", views: 0, helpful: 0, notHelpful: 0 };
      if (id && id.startsWith("gap:")) { const g = st().gaps.find((x) => x.id === id.slice(4)); if (g) { a.title = g.q.replace(/\?$/, ""); a.questions = [g.q]; a._gap = g.id; } }
      if (id && id.startsWith("conv:")) {
        const c = st().conversations[id.slice(5)];
        if (c) { const q = c.messages.find((m) => m.role === "visitor"); const ans = c.messages.filter((m) => m.role === "agent").pop(); a.title = q ? q.text.slice(0, 80) : ""; a.questions = q ? [q.text] : []; a.answer = ans ? ans.text : ""; a.tags = [c.intent].filter(Boolean); }
      }
    }
    const isNew = mode === "new";
    $("#view").innerHTML = `<div class="pad"><div class="row" style="margin-bottom:14px"><a href="#/knowledge" class="btn ghost sm">← Articles</a><span class="grow"></span>
      ${app.ai ? `<button class="btn ghost sm" id="ai-draft">✨ Draft with AI</button>` : ""}${!isNew ? `<button class="btn danger sm" id="del">Delete</button>` : ""}<button class="btn" id="save">Save article</button></div>
      <div class="split"><div class="card stack">
        <label class="f">Title<input type="text" id="f-title" value="${E(a.title)}"></label>
        <label class="f">Short answer <span class="h">What the bot says in chat. 1–3 sentences, the actual fix first.</span><textarea id="f-answer" rows="3">${E(a.answer)}</textarea></label>
        <label class="f">Full article <span class="h">Shown when the customer expands it. Supports **bold**, \`code\`, lists (- or 1.), [links](https://…).</span><textarea id="f-body" rows="9">${E(a.body)}</textarea></label>
        <label class="f">Example questions <span class="h">One per line, the way customers really ask. Any language.</span><textarea id="f-q" rows="4">${E((a.questions || []).join("\n"))}</textarea></label>
        <div class="two"><label class="f">Tags<input type="text" id="f-tags" value="${E((a.tags || []).join(", "))}"></label>
        <label class="f">Status<select id="f-status"><option value="published"${a.status !== "draft" ? " selected" : ""}>Live — the bot uses it</option><option value="draft"${a.status === "draft" ? " selected" : ""}>Draft</option></select></label></div>
      </div><div class="stack"><div class="card"><h3>Preview</h3><p class="sub">How it looks in the widget</p><div class="pchat" id="pv"></div></div>
        <div class="card"><h3>Coverage check</h3><p class="sub">Does each example question route to this article?</p><div id="cov"></div></div></div></div></div>`;
    const read = () => Object.assign(a, {
      title: $("#f-title").value.trim(), answer: $("#f-answer").value.trim(), body: $("#f-body").value,
      questions: $("#f-q").value.split("\n").map((s) => s.trim()).filter(Boolean), tags: $("#f-tags").value.split(",").map((s) => s.trim()).filter(Boolean),
      status: $("#f-status").value, updatedAt: Date.now(),
    });
    const preview = () => {
      read();
      $("#pv").innerHTML = `<div class="m team bot" style="align-self:flex-start;max-width:100%"><div class="bub">${Core.md(a.answer || "…")}</div></div><div class="card" style="box-shadow:none;padding:10px 12px"><b>${E(a.title || "Untitled")}</b><div class="small" style="margin-top:6px">${Core.md(a.body)}</div></div>`;
      const kb = st().kb.filter((x) => x.id !== a.id).concat([Object.assign({}, a, { status: "published" })]);
      $("#cov").innerHTML = (a.questions.length ? a.questions : [a.title]).filter(Boolean).map((q) => {
        const r = Core.searchKB(kb, q, 1)[0];
        const ok = r && r.article.id === a.id;
        return `<div class="row small" style="margin-bottom:6px;flex-wrap:nowrap">${ok ? "✅" : "⚠️"} <span class="grow">${E(q)}</span><span class="muted">${ok ? Math.round(r.confidence * 100) + "%" : r ? "→ " + E(r.article.title) : "no match"}</span></div>`;
      }).join("") || '<div class="small muted">Add example questions.</div>';
    };
    $$("#view input, #view textarea, #view select").forEach((el) => el.addEventListener("input", preview));
    preview();
    $("#save").onclick = () => {
      read();
      if (!a.title || !a.answer) return toast("Title and short answer are required.");
      const gap = a._gap; delete a._gap;
      dispatch({ t: "kb.upsert", item: a });
      if (gap) dispatch({ t: "gap.update", id: gap, patch: { status: "done", articleId: a.id } });
      toast(isNew ? "Article published — the bot uses it right now." : "Saved.");
      go("#/knowledge");
    };
    const del = $("#del"); if (del) del.onclick = () => { if (confirm("Delete this article?")) { dispatch({ t: "kb.delete", id: a.id }); go("#/knowledge"); } };
    const ad = $("#ai-draft");
    if (ad) ad.onclick = async () => {
      read(); ad.disabled = true; ad.textContent = "Drafting…";
      try {
        const r = await app.store.ai("/api/admin/ai", { task: "article", text: [a.title].concat(a.questions).join("\n") });
        $("#f-title").value = r.title || a.title; $("#f-answer").value = r.answer || ""; $("#f-body").value = r.body || "";
        $("#f-q").value = (r.questions || a.questions).join("\n"); $("#f-tags").value = (r.tags || []).join(", "); $("#f-status").value = "draft";
        preview(); toast("Draft ready — review it. AI drafts can be wrong about your policies.");
      } catch (e) { toast("AI draft failed: " + e.message); }
      finally { ad.disabled = false; ad.textContent = "✨ Draft with AI"; }
    };
  }

  /* ------------------------------------------------------------ flows */
  function renderFlows() {
    const [mode, id] = app.arg;
    if (mode === "edit" || mode === "new") return flowEditor(id);
    $("#view").innerHTML = `<div class="pad"><div class="row" style="margin-bottom:6px"><p class="muted grow" style="margin:0">Guided fixes the bot runs step by step. If a step doesn't work, it hands off with the full path so agents skip the basics.</p><button class="btn" id="nf">+ New troubleshooter</button></div>
      <div class="flowcards" style="margin-top:14px">${st().flows.map((f) => { const s = f.stats || {}; const st0 = s.started || 0; return `<div class="card"><div class="row"><h3 class="grow">🧭 ${E(f.name)}</h3><label class="ck small"><input type="checkbox" data-en="${E(f.id)}"${f.enabled !== false ? " checked" : ""}> Live</label></div>
        <p class="sub">${Object.keys(f.nodes || {}).length} steps · ${E(Core.INTENT_LABEL[f.intent] || "General")}</p>
        <div class="stat3"><div><b>${num(st0)}</b><span>started</span></div><div><b>${st0 ? Math.round(((s.fixed || 0) / st0) * 100) + "%" : "—"}</b><span>fixed by bot</span></div><div><b>${st0 ? Math.round(((s.handoff || 0) / st0) * 100) + "%" : "—"}</b><span>handed off</span></div></div>
        <div class="row"><a class="btn ghost sm" href="#/flows/edit/${E(f.id)}">Edit</a><span class="small muted">Deep link: <code>Tickless.startFlow('${E(f.id)}')</code></span></div></div>`; }).join("")}</div></div>`;
    $("#nf").onclick = () => go("#/flows/new");
    $$("[data-en]").forEach((cb) => cb.onchange = () => { const f = st().flows.find((x) => x.id === cb.dataset.en); dispatch({ t: "flow.upsert", item: Object.assign({}, f, { enabled: cb.checked }) }); });
  }

  function flowEditor(id) {
    const f = Core.clone(st().flows.find((x) => x.id === id) || { id: Core.uid("fl_"), name: "New troubleshooter", intent: "technical", enabled: true, triggers: [], start: "n1", nodes: { n1: { kind: "step", text: "What's happening?", options: [{ label: "Option A", next: "h" }] }, h: { kind: "handoff", text: "I'll pass this to the team with the details." } }, stats: {} });
    const draw = () => {
      const ids = Object.keys(f.nodes);
      const sel = (cur, extra) => `<select data-k="next">${(extra || []).concat(ids).map((n) => `<option value="${E(n)}"${n === (cur || "") ? " selected" : ""}>${n ? E(n) + " · " + E(f.nodes[n].kind) : "hand off to team"}</option>`).join("")}</select>`;
      $("#view").innerHTML = `<div class="pad"><div class="row" style="margin-bottom:14px"><a href="#/flows" class="btn ghost sm">← Troubleshooters</a><span class="grow"></span>${st().flows.some((x) => x.id === f.id) ? '<button class="btn danger sm" id="fdel">Delete</button>' : ""}<button class="btn" id="fsave">Save</button></div>
        <div class="split"><div class="stack"><div class="card stack"><div class="two"><label class="f">Name<input type="text" id="fn" value="${E(f.name)}"></label>
          <label class="f">Topic<select id="fi">${Object.entries(Core.INTENT_LABEL).map(([k, l]) => `<option value="${k}"${f.intent === k ? " selected" : ""}>${E(l)}</option>`).join("")}</select></label></div>
          <label class="f">Triggers <span class="h">Comma-separated phrases. When a customer's message matches, the bot offers this fix.</span><input type="text" id="ft" value="${E((f.triggers || []).join(", "))}"></label>
          <label class="f">First step<select id="fs">${ids.map((n) => `<option${n === f.start ? " selected" : ""}>${E(n)}</option>`).join("")}</select></label></div>
          ${ids.map((n) => { const nd = f.nodes[n]; return `<div class="node" data-node="${E(n)}"><div class="row"><span class="nid grow">${E(n)}</span><select data-k="kind"><option value="step"${nd.kind === "step" ? " selected" : ""}>Question with options</option><option value="solution"${nd.kind === "solution" ? " selected" : ""}>Solution (fixed / not fixed)</option><option value="handoff"${nd.kind === "handoff" ? " selected" : ""}>Hand off to team</option></select><button class="btn ghost sm" data-k="rm" title="Remove step">✕</button></div>
            <textarea data-k="text" rows="2">${E(nd.text)}</textarea>
            ${nd.kind === "step" ? (nd.options || []).map((o, i) => `<div class="opt" data-opt="${i}"><input type="text" data-k="label" value="${E(o.label)}" placeholder="Button label">${sel(o.next)}<button class="btn ghost sm" data-k="rmopt">✕</button></div>`).join("") + `<button class="btn ghost sm" data-k="addopt" style="align-self:flex-start">+ Option</button>` : ""}
            ${nd.kind === "solution" ? `<div class="row small"><span class="muted">If not fixed, go to</span>${sel(nd.next, [""])}</div>` : ""}</div>`; }).join("")}
          <button class="btn ghost" id="addnode">+ Add step</button></div>
          <div class="preview"><div class="card"><h3>Live preview</h3><p class="sub">Click through it like a customer</p><div class="pchat" id="fp"></div><button class="btn ghost sm" id="frestart" style="margin-top:10px">Restart</button></div></div></div></div>`;
      bind();
      app.flowPrev = { node: f.start, log: [] }; preview();
    };
    const sync = () => {
      f.name = $("#fn").value; f.intent = $("#fi").value; f.triggers = $("#ft").value.split(",").map((s) => s.trim()).filter(Boolean); f.start = $("#fs").value;
      $$(".node").forEach((el) => {
        const nd = f.nodes[el.dataset.node];
        nd.kind = $('[data-k="kind"]', el).value; nd.text = $('[data-k="text"]', el).value;
        if (nd.kind === "step") nd.options = $$(".opt", el).map((o) => ({ label: $('[data-k="label"]', o).value, next: $('[data-k="next"]', o).value }));
        if (nd.kind === "solution") { const s = $(':scope > .row [data-k="next"]', el); nd.next = s ? s.value : nd.next; }
      });
    };
    const bind = () => {
      $$("#view input, #view textarea").forEach((el) => el.addEventListener("input", () => { sync(); preview(); }));
      $$("#view select").forEach((el) => el.addEventListener("change", () => { sync(); draw(); }));
      $$('[data-k="addopt"]').forEach((b) => b.onclick = () => { sync(); const nd = f.nodes[b.closest(".node").dataset.node]; nd.options = (nd.options || []).concat([{ label: "New option", next: f.start }]); draw(); });
      $$('[data-k="rmopt"]').forEach((b) => b.onclick = () => { sync(); const nd = f.nodes[b.closest(".node").dataset.node]; nd.options.splice(+b.closest(".opt").dataset.opt, 1); draw(); });
      $$('[data-k="rm"]').forEach((b) => b.onclick = () => { sync(); const n = b.closest(".node").dataset.node; if (n === f.start) return toast("That's the first step — pick another first step before removing it."); delete f.nodes[n]; draw(); });
      $("#addnode").onclick = () => { sync(); let i = Object.keys(f.nodes).length + 1; while (f.nodes["n" + i]) i++; f.nodes["n" + i] = { kind: "solution", text: "Try this…", next: "" }; draw(); };
      $("#frestart").onclick = () => { app.flowPrev = { node: f.start, log: [] }; preview(); };
      $("#fsave").onclick = () => { sync(); dispatch({ t: "flow.upsert", item: f }); toast("Saved — live in the widget now."); go("#/flows"); };
      const d = $("#fdel"); if (d) d.onclick = () => { if (confirm("Delete this troubleshooter?")) { dispatch({ t: "flow.delete", id: f.id }); go("#/flows"); } };
    };
    const preview = () => {
      const p = app.flowPrev, nd = f.nodes[p.node];
      let h = p.log.map((l) => `<div class="m ${l.me ? "team" : "bot"}" style="${l.me ? "" : "align-self:flex-start"}"><div class="bub">${l.me ? E(l.t) : Core.md(l.t)}</div></div>`).join("");
      if (!nd) h += `<div class="small"><b>→ Hands off to the team</b> with the path so far.</div>`;
      else {
        h += `<div class="m team bot" style="align-self:flex-start"><div class="bub">${Core.md(nd.text)}</div></div>`;
        const opts = nd.kind === "step" ? (nd.options || []).map((o) => [o.label, o.next]) : nd.kind === "solution" ? [["It's fixed", "__fixed"], ["Still not working", nd.next || "__handoff"]] : [];
        h += opts.length ? `<div class="refs" style="justify-content:flex-start">${opts.map(([l, n]) => `<button class="btn ghost sm" data-go="${E(n)}" data-l="${E(l)}">${E(l)}</button>`).join("")}</div>` : `<div class="small"><b>→ Hands off to the team</b> with the full path.</div>`;
      }
      $("#fp").innerHTML = h;
      $$("#fp [data-go]").forEach((b) => b.onclick = () => {
        p.log.push({ t: nd.text }, { t: b.dataset.l, me: true });
        if (b.dataset.go === "__fixed") { p.log.push({ t: "Glad that fixed it! ✅ (counts as resolved by bot)" }); p.node = "__done"; $("#fp").innerHTML = p.log.map((l) => `<div class="m ${l.me ? "team" : "bot"}" style="${l.me ? "" : "align-self:flex-start"}"><div class="bub">${l.me ? E(l.t) : Core.md(l.t)}</div></div>`).join(""); return; }
        p.node = b.dataset.go; preview();
      });
    };
    draw();
  }

  /* ------------------------------------------------------------ macros */
  function renderMacros() {
    $("#view").innerHTML = `<div class="pad"><div class="row" style="margin-bottom:14px"><p class="muted grow" style="margin:0">Saved replies. Type <code>/shortcut</code> in the composer. Variables: <code>{{first}}</code> <code>{{name}}</code> <code>{{agent}}</code> <code>{{brand}}</code>.</p><button class="btn" id="nm">+ New macro</button></div>
      <div class="flowcards">${st().macros.map((m) => `<div class="card stack" data-m="${E(m.id)}"><div class="two"><label class="f">Name<input type="text" data-k="name" value="${E(m.name)}"></label><label class="f">Shortcut<input type="text" data-k="shortcut" value="${E(m.shortcut)}"></label></div>
        <label class="f">Text<textarea data-k="body" rows="4">${E(m.body)}</textarea></label><div class="row"><button class="btn sm" data-save>Save</button><button class="btn danger sm" data-del>Delete</button></div></div>`).join("")}</div></div>`;
    $("#nm").onclick = () => { dispatch({ t: "macro.upsert", item: { id: Core.uid("mc_"), name: "New macro", shortcut: "new", body: "Hi {{first}}, " } }); renderMacros(); };
    $$("[data-m]").forEach((card) => {
      const id = card.dataset.m;
      $("[data-save]", card).onclick = () => { dispatch({ t: "macro.upsert", item: { id, name: $('[data-k="name"]', card).value, shortcut: $('[data-k="shortcut"]', card).value.replace(/^\//, "").trim(), body: $('[data-k="body"]', card).value } }); toast("Macro saved."); };
      $("[data-del]", card).onclick = () => { dispatch({ t: "macro.delete", id }); renderMacros(); };
    });
  }

  /* ------------------------------------------------------------ status */
  function renderStatus() {
    $("#view").innerHTML = `<div class="pad"><div class="row" style="margin-bottom:14px"><p class="muted grow" style="margin:0">Active incidents show as a banner in the widget, and the bot mentions them when a customer's question is related. During an outage that stops the ticket flood before it starts.</p><button class="btn" id="ni">+ Report incident</button></div>
      <div class="flowcards">${st().incidents.map((i) => `<div class="card stack" data-i="${E(i.id)}"><div class="row"><span class="pill ${i.active ? "high" : "ok"}">${i.active ? "● Active" : "Resolved"}</span><span class="grow"></span><label class="ck small"><input type="checkbox" data-k="active"${i.active ? " checked" : ""}> Show to customers</label></div>
        <label class="f">Title<input type="text" data-k="title" value="${E(i.title)}"></label><label class="f">Message<textarea data-k="body" rows="3">${E(i.body)}</textarea></label>
        <label class="f">Related keywords <span class="h">The bot mentions the incident when these appear</span><input type="text" data-k="keywords" value="${E((i.keywords || []).join(", "))}"></label>
        <div class="row"><button class="btn sm" data-save>Save</button><button class="btn danger sm" data-del>Delete</button><span class="small muted">${E(ago(i.createdAt))} ago</span></div></div>`).join("")}</div></div>`;
    $("#ni").onclick = () => { dispatch({ t: "incident.upsert", item: { id: Core.uid("inc_"), title: "New incident", body: "We're investigating an issue. Updates here.", keywords: [], severity: "minor", active: false, createdAt: Date.now() } }); renderStatus(); };
    $$("[data-i]").forEach((card) => {
      const id = card.dataset.i, val = (k) => $(`[data-k="${k}"]`, card);
      const save = () => dispatch({ t: "incident.upsert", item: { id, title: val("title").value, body: val("body").value, keywords: val("keywords").value.split(",").map((s) => s.trim()).filter(Boolean), active: val("active").checked } });
      $("[data-save]", card).onclick = () => { save(); toast("Saved — the widget updates live."); renderStatus(); };
      val("active").onchange = () => { save(); renderStatus(); };
      $("[data-del]", card).onclick = () => { dispatch({ t: "incident.delete", id }); renderStatus(); };
    });
  }

  /* ------------------------------------------------------------ widget settings */
  const TZS = ["UTC", "Europe/London", "Europe/Dublin", "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Lisbon", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Sao_Paulo", "America/Mexico_City", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
  function renderWidget() {
    const s = S(), h = s.hours || {}, hd = s.handoff || {}, bot = s.bot || {}, ai = s.ai || {};
    const v = $("#view");
    v.innerHTML = `<div class="pad"><div class="settings"><div>
      <section class="card stack"><h3>Brand</h3><div class="two"><label class="f">Company name<input type="text" data-s="brand" value="${E(s.brand)}"></label><label class="f">Bot name<input type="text" data-s="botName" value="${E(s.botName)}"></label></div>
        <div class="two"><label class="f">Accent color<div class="row"><input type="color" data-s="accent" value="${E(s.accent)}">${["#2a78d6", "#0b0b0b", "#1b8a63", "#6250d6", "#d95926", "#a8457a"].map((c) => `<button class="icon-btn" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div></label>
        <label class="f">Position<select data-s="position"><option value="right"${s.position !== "left" ? " selected" : ""}>Bottom right</option><option value="left"${s.position === "left" ? " selected" : ""}>Bottom left</option></select></label></div>
        <label class="ck"><input type="checkbox" data-s="showBranding"${s.showBranding !== false ? " checked" : ""}> Show “Powered by Tickless” (free plan)</label></section>
      <section class="card stack"><h3>Conversation starters</h3><label class="f">Greeting <span class="h">Leave empty to use the built-in greeting, translated into the visitor's language.</span><textarea data-s="greeting" rows="2" placeholder="${E(Core.phrase("en", "greet", { name: "", bot: s.botName, brand: s.brand }))}">${E(s.greeting)}</textarea></label>
        <label class="f">Quick topics <span class="h">One per line — shown as buttons before the first message</span><textarea id="qt" rows="4">${E((s.quickTopics || []).map((t) => t.label).join("\n"))}</textarea></label></section>
      <section class="card stack"><h3>Languages</h3><div class="row">${Core.LANGS.map((l) => `<label class="ck"><input type="checkbox" data-lang="${l}"${(s.languages || []).includes(l) ? " checked" : ""}> ${LANG[l]}</label>`).join("")}</div>
        <label class="f">Default language<select data-s="defaultLang">${Core.LANGS.map((l) => `<option value="${l}"${s.defaultLang === l ? " selected" : ""}>${LANG[l]}</option>`).join("")}</select></label>
        <p class="small muted" style="margin:0">The bot detects each visitor's language from their first message and answers in it — UI, replies and troubleshooters.</p></section>
      <section class="card stack"><h3>Bot brain</h3>
        <label class="f">Answer confidence: <b id="thv">${Math.round((bot.threshold || 0.45) * 100)}%</b> <span class="h">Lower = answers more, guesses more. Higher = hands off sooner. 40–55% is the sweet spot.</span><input type="range" min="0.2" max="0.85" step="0.05" id="th" value="${bot.threshold || 0.45}"></label>
        <label class="f">AI answers <span class="h">${app.ai ? "Claude is connected through your server." : "Needs the Tickless server with an Anthropic API key (see Install). Until then the free local engine answers."}</span>
          <select data-s="ai.mode"><option value="off"${ai.mode === "off" ? " selected" : ""}>Off — local engine only (free)</option><option value="fallback"${ai.mode === "fallback" || !ai.mode ? " selected" : ""}>Hybrid — AI only when the local engine is unsure (recommended)</option><option value="always"${ai.mode === "always" ? " selected" : ""}>Always AI</option></select></label></section>
      <section class="card stack"><h3>Handoff to humans</h3><label class="ck"><input type="checkbox" data-s="handoff.onFrustration"${hd.onFrustration ? " checked" : ""}> Hand off immediately when a customer is frustrated (any language)</label>
        <div class="two"><label class="f">Promised reply time (min)<input type="number" min="1" data-s="handoff.etaMinutes" value="${hd.etaMinutes || 10}"></label><label class="f">SLA for first reply (min)<input type="number" min="1" data-s="handoff.slaMinutes" value="${hd.slaMinutes || 30}"></label></div>
        <label class="f">Offer a person after this many unanswered questions<input type="number" min="1" max="5" data-s="handoff.maxFallbacks" value="${hd.maxFallbacks || 2}"></label></section>
      <section class="card stack"><h3>Business hours</h3><label class="ck"><input type="checkbox" data-s="hours.always"${h.always ? " checked" : ""}> Team available 24/7</label>
        <div class="two"><label class="f">Time zone<select data-s="hours.tz">${TZS.map((z) => `<option${h.tz === z ? " selected" : ""}>${z}</option>`).join("")}</select></label><div class="two"><label class="f">From<input type="time" data-s="hours.start" value="${E(h.start || "09:00")}"></label><label class="f">To<input type="time" data-s="hours.end" value="${E(h.end || "18:00")}"></label></div></div>
        <div class="days">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => `<label><input type="checkbox" data-day="${i}"${(h.days || []).includes(i) ? " checked" : ""}>${d}</label>`).join("")}</div>
        <p class="small muted" style="margin:0">Outside hours the bot keeps answering and collects an email for anything it hands off.</p></section>
      <section class="card stack"><h3>Proactive messages</h3><p class="small muted" style="margin:0">Open a conversation before the customer asks — e.g. on pricing or billing pages.</p>
        <div id="pro">${(s.proactive || []).map((p, i) => `<div class="row" data-p="${i}" style="margin-bottom:8px"><label class="ck"><input type="checkbox" data-pk="enabled"${p.enabled ? " checked" : ""}></label><input type="text" data-pk="match" value="${E(p.match)}" placeholder="URL contains" style="width:110px"><input type="number" data-pk="delay" value="${p.delay}" min="0" style="width:70px" title="Delay (s)"><input type="text" data-pk="text" value="${E(p.text)}" class="grow"><button class="btn ghost sm" data-prm>✕</button></div>`).join("")}</div>
        <button class="btn ghost sm" id="padd" style="align-self:flex-start">+ Add trigger</button></section>
      <section class="card stack"><h3>Privacy & feedback</h3><label class="ck"><input type="checkbox" data-s="privacy.redact"${s.privacy && s.privacy.redact ? " checked" : ""}> Mask card numbers and passwords before they're stored</label>
        <label class="ck"><input type="checkbox" data-s="csat"${s.csat !== false ? " checked" : ""}> Ask for a 1–5 rating when a conversation is resolved</label></section>
      <section class="card stack"><h3>ROI</h3><label class="f">Cost of one human-handled ticket ($) <span class="h">Used for “saved” on the Overview. Industry range: $3–15.</span><input type="number" min="0" step="0.5" data-s="costPerTicket" value="${s.costPerTicket || 6}"></label></section>
      ${app.remote ? "" : `<section class="card stack"><h3>Demo data</h3><p class="small muted" style="margin:0">Wipe everything in this browser and reload the sample workspace.</p><button class="btn danger" id="reset" style="align-self:flex-start">Reset demo</button></section>`}
      </div><div class="preview"><div class="row" style="margin-bottom:8px"><b class="grow">Live preview</b><a class="small" href="demo.html" target="_blank" rel="noopener">Open full demo ↗</a></div>
        <iframe src="demo.html?preview=1&tickless=open" title="Widget preview"></iframe>${app.remote ? '<p class="small muted">The preview runs in demo mode.</p>' : ""}</div></div></div>`;
    const put = (path, val) => {
      const [a, b] = path.split(".");
      dispatch({ t: "settings.update", patch: b ? { [a]: { [b]: val } } : { [a]: val } });
    };
    let deb = 0;
    $$("[data-s]", v).forEach((el) => {
      const ev = el.type === "checkbox" || el.tagName === "SELECT" || el.type === "color" ? "change" : "input";
      el.addEventListener(ev, () => {
        const val = el.type === "checkbox" ? el.checked : el.type === "number" ? +el.value : el.value;
        clearTimeout(deb); deb = setTimeout(() => put(el.dataset.s, val), el.type === "checkbox" ? 0 : 250);
      });
    });
    $$("[data-color]", v).forEach((b) => b.onclick = () => { $('[data-s="accent"]').value = b.dataset.color; put("accent", b.dataset.color); });
    $("#th").oninput = (e) => { $("#thv").textContent = Math.round(e.target.value * 100) + "%"; clearTimeout(deb); deb = setTimeout(() => put("bot.threshold", +e.target.value), 200); };
    $("#qt").oninput = (e) => { clearTimeout(deb); deb = setTimeout(() => put("quickTopics", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6).map((label) => ({ label }))), 300); };
    $$("[data-lang]", v).forEach((cb) => cb.onchange = () => put("languages", $$("[data-lang]", v).filter((x) => x.checked).map((x) => x.dataset.lang)));
    $$("[data-day]", v).forEach((cb) => cb.onchange = () => put("hours.days", $$("[data-day]", v).filter((x) => x.checked).map((x) => +x.dataset.day)));
    const savePro = () => put("proactive", $$("[data-p]", v).map((row, i) => ({ id: (s.proactive[i] && s.proactive[i].id) || Core.uid("pr_"), enabled: $('[data-pk="enabled"]', row).checked, match: $('[data-pk="match"]', row).value, delay: +$('[data-pk="delay"]', row).value, text: $('[data-pk="text"]', row).value })));
    $$("[data-pk]", v).forEach((el) => el.addEventListener(el.type === "checkbox" ? "change" : "input", () => { clearTimeout(deb); deb = setTimeout(savePro, 300); }));
    $$("[data-prm]", v).forEach((b) => b.onclick = () => { b.closest("[data-p]").remove(); savePro(); setTimeout(renderWidget, 50); });
    $("#padd").onclick = () => { put("proactive", (s.proactive || []).concat([{ id: Core.uid("pr_"), enabled: true, match: "*", delay: 15, text: "Need a hand? I'm here." }])); setTimeout(renderWidget, 50); };
    const rs = $("#reset"); if (rs) rs.onclick = () => { if (confirm("Reset all demo data in this browser?")) { dispatch({ t: "reset", state: Seed.workspace() }); toast("Demo data restored."); renderWidget(); } };
  }

  /* ------------------------------------------------------------ install */
  function renderInstall() {
    const baseUrl = location.href.replace(/console\.html.*$/, "").replace(/#.*$/, "");
    const snippet = `<script src="${baseUrl}widget.js"\n        data-workspace="${st().id}"${app.remote ? `\n        data-api="${location.origin}"` : ""}\n        async></script>`;
    $("#view").innerHTML = `<div class="pad stack" style="max-width:900px">
      <div class="card stack"><h3>1 · Paste before &lt;/body&gt;</h3><p class="sub">Works on any site: Webflow, Shopify, WordPress, React, plain HTML. No build step.</p><pre id="snip">${E(snippet)}</pre><button class="btn sm" id="copy" style="align-self:flex-start">Copy snippet</button>
        ${app.remote ? "" : `<p class="small muted" style="margin:0">⚠ You're in demo mode: without <code>data-api</code> the widget stores data in each visitor's browser. Run the server (below) so conversations reach your team.</p>`}</div>
      <div class="card stack"><h3>2 · Tell it who's chatting (optional)</h3><p class="sub">Logged-in customers skip the “what's your email” dance, and agents see plan and seats.</p>
        <pre>${E(`Tickless.identify({ name: "Ada Lovelace", email: "ada@example.com", plan: "Business" });`)}</pre></div>
      <div class="card stack"><h3>3 · Wire it into your product</h3><table class="t"><tbody>
        ${[["Tickless.open() / .close() / .toggle()", "Control the panel"], ["Tickless.ask('text')", "Open and ask on the customer's behalf (e.g. from an error screen)"], ["Tickless.startFlow('fl_payment')", "Deep-link a troubleshooter from a failed-payment banner"], ["Tickless.setLanguage('de')", "Force a language"], ["Tickless.on('handoff', fn)", "Events: open, close, message, handoff, resolved, rating"], ["data-color / data-position / data-lang / data-open", "Override settings per page"]].map(([a, b]) => `<tr><td><code>${E(a)}</code></td><td>${E(b)}</td></tr>`).join("")}</tbody></table></div>
      <div class="card stack"><h3>Server mode: teams, realtime and AI</h3><p class="sub">One Node process, no database to manage. Conversations sync live to every agent; Claude answers what the local engine can't and powers agent assist.</p>
        <pre>${E(`cd tickless/server
npm install
export ANTHROPIC_API_KEY=sk-ant-...      # optional: enables AI answers + agent assist
export TICKLESS_ADMIN_TOKEN=pick-a-long-secret
npm start                                 # → http://localhost:8787/console.html`)}</pre>
        <p class="small muted" style="margin:0">Hybrid routing keeps AI costs down: the free local engine answers confident matches, Claude only handles the rest.</p></div></div>`;
    $("#copy").onclick = () => { navigator.clipboard.writeText(snippet).then(() => toast("Copied."), () => toast("Copy failed — select the text manually.")); };
  }

  boot();
})();
