/*!
 * Tickless chat widget — one script tag, works on any site.
 *
 *   <script src="https://YOUR-HOST/widget.js" data-workspace="demo" async></script>
 *
 * Optional attributes: data-api (Tickless server URL; omit for in-browser demo mode),
 * data-lang, data-color, data-position (left|right), data-open (true).
 * JS API: Tickless.open() .close() .toggle() .ask(text) .startFlow(id)
 *         .identify({name,email,plan}) .setLanguage(code) .on(event, fn) .reset()
 */
(function () {
  "use strict";
  if (window.Tickless && window.Tickless.__loaded) return;

  const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const base = script ? new URL(".", script.src).href : "./";
  const attr = (n) => (script && script.getAttribute("data-" + n)) || null;
  const cfg = {
    workspace: attr("workspace") || "demo", api: attr("api"), lang: attr("lang"),
    color: attr("color"), position: attr("position"), open: attr("open") === "true",
  };

  const UI = {
    en: { ph: "Type your message…", send: "Send", newConv: "New conversation", close: "Close", online: "Team online · replies in ~{eta} min", offline: "Team offline · {bot} can still help", powered: "Powered by", read: "Read full article", hide: "Hide article", helpful: "Helpful?", thanksFb: "Thanks for the feedback!", rate: "How did we do?", rateThanks: "Thanks for rating us!", emailPh: "you@company.com", emailBtn: "Notify me", typing: "{name} is typing…", privacy: "Card numbers and passwords are masked automatically.", issue: "Known issue", open: "Chat with us", you: "You", badEmail: "That email doesn't look right." },
    es: { ph: "Escribe tu mensaje…", send: "Enviar", newConv: "Nueva conversación", close: "Cerrar", online: "Equipo en línea · responde en ~{eta} min", offline: "Equipo desconectado · {bot} puede ayudarte", powered: "Con tecnología de", read: "Leer artículo completo", hide: "Ocultar", helpful: "¿Te ayudó?", thanksFb: "¡Gracias por tu opinión!", rate: "¿Qué tal te atendimos?", rateThanks: "¡Gracias por tu valoración!", emailPh: "tu@empresa.com", emailBtn: "Avísame", typing: "{name} está escribiendo…", privacy: "Los números de tarjeta y contraseñas se ocultan automáticamente.", issue: "Incidencia conocida", open: "Habla con nosotros", you: "Tú", badEmail: "Ese email no parece válido." },
    fr: { ph: "Écrivez votre message…", send: "Envoyer", newConv: "Nouvelle conversation", close: "Fermer", online: "Équipe en ligne · répond en ~{eta} min", offline: "Équipe hors ligne · {bot} peut vous aider", powered: "Propulsé par", read: "Lire l'article", hide: "Masquer", helpful: "Utile ?", thanksFb: "Merci pour votre retour !", rate: "Comment était notre aide ?", rateThanks: "Merci pour votre note !", emailPh: "vous@entreprise.com", emailBtn: "Me prévenir", typing: "{name} écrit…", privacy: "Les numéros de carte et mots de passe sont masqués automatiquement.", issue: "Incident connu", open: "Discuter avec nous", you: "Vous", badEmail: "Cet e-mail semble invalide." },
    de: { ph: "Nachricht schreiben…", send: "Senden", newConv: "Neues Gespräch", close: "Schließen", online: "Team online · antwortet in ~{eta} Min", offline: "Team offline · {bot} hilft trotzdem", powered: "Bereitgestellt von", read: "Ganzen Artikel lesen", hide: "Ausblenden", helpful: "Hilfreich?", thanksFb: "Danke für dein Feedback!", rate: "Wie war unser Support?", rateThanks: "Danke für deine Bewertung!", emailPh: "du@firma.com", emailBtn: "Benachrichtigen", typing: "{name} schreibt…", privacy: "Kartennummern und Passwörter werden automatisch maskiert.", issue: "Bekannte Störung", open: "Chatte mit uns", you: "Du", badEmail: "Diese E-Mail sieht falsch aus." },
    it: { ph: "Scrivi un messaggio…", send: "Invia", newConv: "Nuova conversazione", close: "Chiudi", online: "Team online · risponde in ~{eta} min", offline: "Team offline · {bot} può aiutarti", powered: "Offerto da", read: "Leggi l'articolo", hide: "Nascondi", helpful: "Utile?", thanksFb: "Grazie per il feedback!", rate: "Com'è andata?", rateThanks: "Grazie per la valutazione!", emailPh: "tu@azienda.com", emailBtn: "Avvisami", typing: "{name} sta scrivendo…", privacy: "Numeri di carta e password vengono mascherati automaticamente.", issue: "Problema noto", open: "Scrivici", you: "Tu", badEmail: "Questa email non sembra valida." },
    pt: { ph: "Digite sua mensagem…", send: "Enviar", newConv: "Nova conversa", close: "Fechar", online: "Equipe online · responde em ~{eta} min", offline: "Equipe offline · {bot} ainda pode ajudar", powered: "Desenvolvido por", read: "Ler artigo completo", hide: "Ocultar", helpful: "Ajudou?", thanksFb: "Obrigado pelo feedback!", rate: "Como foi o atendimento?", rateThanks: "Obrigado pela avaliação!", emailPh: "voce@empresa.com", emailBtn: "Avise-me", typing: "{name} está digitando…", privacy: "Números de cartão e senhas são ocultados automaticamente.", issue: "Problema conhecido", open: "Fale conosco", you: "Você", badEmail: "Esse email não parece válido." },
  };

  const CSS = `
  :host { all: initial; --accent: #2a78d6; --accent-ink: #fff; --bg: #ffffff; --bg2: #f4f4f1; --ink: #0b0b0b; --ink2: #52514e; --line: rgba(11,11,11,.10); --bot: #f1f1ee; --shadow: 0 18px 50px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  @media (prefers-color-scheme: dark) { :host { --bg: #1a1a19; --bg2: #232322; --ink: #f0efec; --ink2: #c3c2b7; --line: rgba(255,255,255,.10); --bot: #2a2a28; --shadow: 0 18px 50px rgba(0,0,0,.5); } }
  * { box-sizing: border-box; }
  .root { position: fixed; bottom: 20px; right: 20px; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; font-size: 14px; line-height: 1.45; color: var(--ink); }
  .root.left { right: auto; left: 20px; align-items: flex-start; }
  .launcher { width: 58px; height: 58px; border-radius: 50%; border: 0; background: var(--accent); color: var(--accent-ink); cursor: pointer; box-shadow: var(--shadow); display: grid; place-items: center; transition: transform .18s ease; position: relative; }
  .launcher:hover { transform: scale(1.06); } .launcher:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  .launcher svg { width: 28px; height: 28px; }
  .badge { position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #d03b3b; color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; border: 2px solid var(--bg); }
  .nudge { max-width: 280px; background: var(--bg); color: var(--ink); border-radius: 16px; padding: 12px 34px 12px 14px; box-shadow: var(--shadow); cursor: pointer; position: relative; animation: pop .25s ease; }
  .nudge b { display: block; font-size: 12px; color: var(--ink2); margin-bottom: 2px; font-weight: 600; }
  .nudge .x { position: absolute; top: 6px; right: 8px; border: 0; background: none; color: var(--ink2); cursor: pointer; font-size: 16px; }
  .panel { width: 380px; height: min(640px, calc(100vh - 110px)); background: var(--bg); border-radius: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; animation: pop .22s ease; border: 1px solid var(--line); }
  @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
  .head { background: var(--accent); color: var(--accent-ink); padding: 14px 14px 14px 16px; display: flex; align-items: center; gap: 12px; }
  .av { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,.22); display: grid; place-items: center; font-weight: 700; font-size: 16px; flex: none; position: relative; }
  .av i { position: absolute; right: -1px; bottom: -1px; width: 11px; height: 11px; border-radius: 50%; background: #0ca30c; border: 2px solid var(--accent); }
  .av i.off { background: #898781; }
  .ht { flex: 1; min-width: 0; } .ht strong { display: block; font-size: 15px; } .ht span { font-size: 12px; opacity: .88; }
  .hb { border: 0; background: rgba(255,255,255,.14); color: inherit; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; }
  .hb:hover { background: rgba(255,255,255,.26); } .hb svg { width: 16px; height: 16px; }
  .inc { background: #fff6e0; color: #5a4300; padding: 8px 14px; font-size: 12.5px; border-bottom: 1px solid var(--line); cursor: pointer; }
  @media (prefers-color-scheme: dark) { .inc { background: #3a3013; color: #ffe7a6; } }
  .inc p { margin: 4px 0 0; display: none; } .inc.openx p { display: block; }
  .msgs { flex: 1; overflow-y: auto; padding: 16px 14px 8px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
  .row { display: flex; flex-direction: column; align-items: flex-start; max-width: 100%; }
  .row.me { align-items: flex-end; }
  .who { font-size: 11.5px; color: var(--ink2); margin: 0 0 3px 4px; }
  .b { max-width: 86%; padding: 9px 13px; border-radius: 16px 16px 16px 5px; background: var(--bot); word-wrap: break-word; overflow-wrap: anywhere; }
  .me .b { background: var(--accent); color: var(--accent-ink); border-radius: 16px 16px 5px 16px; white-space: pre-wrap; }
  .b p { margin: 0 0 6px; } .b p:last-child { margin: 0; } .b ul, .b ol { margin: 4px 0 6px; padding-left: 20px; } .b code { font-size: 12.5px; background: rgba(127,127,127,.18); padding: 1px 4px; border-radius: 4px; }
  .b a { color: inherit; }
  .src { font-size: 10.5px; color: var(--ink2); margin: 3px 0 0 6px; }
  .sys { align-self: center; font-size: 12px; color: var(--ink2); }
  .card { margin-top: 6px; width: 86%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--bg); }
  .card h4 { margin: 0 0 4px; font-size: 13.5px; } .card .body { font-size: 13px; color: var(--ink2); margin-top: 6px; } .card .body p { margin: 0 0 6px; } .card .body ul, .card .body ol { padding-left: 18px; margin: 4px 0; }
  .lnk { border: 0; background: none; color: var(--accent); cursor: pointer; padding: 0; font: inherit; font-size: 12.5px; font-weight: 600; }
  .fb { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: var(--ink2); }
  .fb button { border: 1px solid var(--line); background: var(--bg2); border-radius: 8px; cursor: pointer; padding: 2px 8px; font-size: 13px; color: var(--ink); }
  .ask { margin-top: 8px; font-size: 13px; }
  .quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; max-width: 92%; }
  .q { border: 1.5px solid var(--accent); color: var(--accent); background: var(--bg); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; font-weight: 600; text-align: left; }
  @media (prefers-color-scheme: dark) { .q { color: var(--ink); } }
  .q:hover { background: var(--accent); color: var(--accent-ink); }
  .q.main { background: var(--accent); color: var(--accent-ink); }
  .typing { display: inline-flex; gap: 4px; padding: 12px 14px; background: var(--bot); border-radius: 16px 16px 16px 5px; }
  .typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--ink2); animation: blink 1.2s infinite; } .typing i:nth-child(2) { animation-delay: .15s; } .typing i:nth-child(3) { animation-delay: .3s; }
  @keyframes blink { 0%, 60%, 100% { opacity: .25; } 30% { opacity: 1; } }
  .rate { align-self: stretch; text-align: center; background: var(--bg2); border-radius: 14px; padding: 12px; }
  .rate .faces { display: flex; justify-content: center; gap: 6px; margin-top: 8px; }
  .rate button { font-size: 24px; border: 0; background: none; cursor: pointer; padding: 2px 4px; border-radius: 8px; transition: transform .12s; }
  .rate button:hover, .rate button:focus-visible { transform: scale(1.2); }
  .mail { display: flex; gap: 6px; margin-top: 8px; width: 86%; }
  .mail input { flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font: inherit; background: var(--bg); color: var(--ink); min-width: 0; }
  .mail button { border: 0; background: var(--accent); color: var(--accent-ink); border-radius: 10px; padding: 0 12px; font: inherit; font-weight: 600; cursor: pointer; }
  .err { color: #d03b3b; font-size: 12px; margin-top: 4px; }
  .comp { border-top: 1px solid var(--line); padding: 10px 10px 8px 14px; display: flex; gap: 8px; align-items: flex-end; }
  textarea { flex: 1; resize: none; border: 0; outline: 0; font: inherit; background: transparent; color: var(--ink); max-height: 120px; padding: 7px 0; }
  .sendb { border: 0; width: 38px; height: 38px; border-radius: 12px; background: var(--accent); color: var(--accent-ink); cursor: pointer; display: grid; place-items: center; flex: none; }
  .sendb:disabled { opacity: .4; cursor: default; } .sendb svg { width: 18px; height: 18px; }
  .foot { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: var(--ink2); padding: 0 14px 8px; }
  .foot a { color: inherit; font-weight: 600; text-decoration: none; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @media (max-width: 480px) {
    .root { right: 12px; bottom: 12px; } .root.left { left: 12px; }
    .panel.full { position: fixed; inset: 0; width: 100%; height: 100%; border-radius: 0; }
    .root.is-open .launcher { display: none; }
  }`;

  const ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.3 1l1.5 6.3 9 1.1-9 1.1-1.5 6.3c-.1.7.6 1.3 1.3 1z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  };

  const loadScript = (src) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const rnd = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function visitorIdentity() {
    let v = LS.get("tickless:visitor");
    if (!v || !v.id) { v = { id: "v_" + rnd(8), key: rnd(16), profile: {} }; LS.set("tickless:visitor", v); }
    return v;
  }
  function device() {
    const ua = navigator.userAgent;
    const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) && !/Mobile/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
    return (br + " · " + os).replace(/ · $/, "");
  }

  class Widget {
    constructor(Core, store, visitor) {
      this.C = Core; this.store = store; this.v = visitor;
      this.convKey = "tickless:conv:" + cfg.workspace;
      this.convId = LS.get(this.convKey);
      this.isOpen = false; this.unread = 0; this.botTyping = false; this.agentTyping = null;
      this.expanded = new Set(); this.fbDone = new Set(); this.listeners = {}; this.nudgeText = null; this.lastSeen = 0;
    }
    get st() { return this.store.state; }
    get s() { return this.st.settings || {}; }
    get conv() { return this.convId ? this.st.conversations[this.convId] : null; }
    lang() {
      if (this.forcedLang) return this.forcedLang;
      if (cfg.lang && UI[cfg.lang]) return cfg.lang;
      const c = this.conv;
      if (c && c.lang && UI[c.lang]) return c.lang;
      const nav = (navigator.language || "en").slice(0, 2);
      return (this.s.languages || []).includes(nav) && UI[nav] ? nav : this.s.defaultLang || "en";
    }
    t(k, vars) {
      let s = (UI[this.lang()] || UI.en)[k] || UI.en[k] || k;
      if (vars) s = s.replace(/\{(\w+)\}/g, (m, x) => (vars[x] != null ? vars[x] : ""));
      return s;
    }
    fire(ev, data) { (this.listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); }

    mount() {
      this.host = document.createElement("div");
      this.host.setAttribute("data-tickless", "");
      document.body.appendChild(this.host);
      this.root = this.host.attachShadow({ mode: "open" });
      this.root.innerHTML = `<style>${CSS}</style><div class="root" part="root"><div class="nudge-slot"></div><div class="panel-slot"></div><button class="launcher" aria-label="">${ICON.chat}</button></div><div class="sr" aria-live="polite"></div>`;
      this.$root = this.root.querySelector(".root");
      this.$launcher = this.root.querySelector(".launcher");
      this.$panelSlot = this.root.querySelector(".panel-slot");
      this.$nudge = this.root.querySelector(".nudge-slot");
      this.$live = this.root.querySelector(".sr");
      this.$launcher.addEventListener("click", () => this.toggle());
      this.root.addEventListener("click", (e) => this.onClick(e));
      this.store.subscribe((op) => this.onOp(op));
      this.applyTheme();
      this.scheduleNudges();
      window.addEventListener("hashchange", () => this.scheduleNudges());
      if (cfg.open || /[?&]tickless=open/.test(location.search)) this.open();
    }

    applyTheme() {
      const accent = cfg.color || this.s.accent || "#2a78d6";
      this.host.style.setProperty("--accent", accent);
      this.$root.classList.toggle("left", (cfg.position || this.s.position) === "left");
      this.$launcher.setAttribute("aria-label", this.t("open"));
      this.$launcher.innerHTML = this.isOpen ? ICON.down : ICON.chat;
      if (this.unread && !this.isOpen) this.$launcher.insertAdjacentHTML("beforeend", `<span class="badge">${this.unread}</span>`);
    }

    /* ---------- proactive nudges ---------- */
    scheduleNudges() {
      clearTimeout(this.nudgeTimer);
      const here = location.pathname + location.search + location.hash;
      const rule = (this.s.proactive || []).find((p) => p.enabled && (p.match === "*" || here.toLowerCase().includes(String(p.match || "").toLowerCase())));
      if (!rule || this.isOpen || sessionStorage.getItem("tickless:nudged:" + rule.id)) { this.$nudge.innerHTML = ""; return; }
      this.nudgeTimer = setTimeout(() => {
        if (this.isOpen) return;
        sessionStorage.setItem("tickless:nudged:" + rule.id, "1");
        this.nudgeText = rule.text;
        this.$nudge.innerHTML = `<div class="nudge" data-a="nudge" role="button" tabindex="0"><b>${this.C.esc(this.s.botName || "Assistant")} · ${this.C.esc(this.s.brand || "")}</b>${this.C.esc(rule.text)}<button class="x" data-a="nudge-x" aria-label="${this.t("close")}">×</button></div>`;
      }, (rule.delay || 8) * 1000);
    }

    /* ---------- open / close ---------- */
    open() {
      if (this.isOpen) return;
      this.isOpen = true; this.unread = 0; this.$root.classList.add("is-open");
      this.$nudge.innerHTML = "";
      this.$panelSlot.innerHTML = `<div class="panel full" role="dialog" aria-label="${this.C.esc(this.s.brand || "Support")} chat">
        <div class="head"><div class="av"></div><div class="ht"><strong></strong><span></span></div>
          <button class="hb" data-a="new" title="${this.t("newConv")}" aria-label="${this.t("newConv")}">${ICON.reset}</button>
          <button class="hb" data-a="close" title="${this.t("close")}" aria-label="${this.t("close")}">${ICON.close}</button></div>
        <div class="inc-slot"></div><div class="msgs" role="log" aria-live="polite"></div>
        <form class="comp"><textarea rows="1" aria-label=""></textarea><button class="sendb" type="submit" aria-label="">${ICON.send}</button></form>
        <div class="foot"><span class="priv"></span><span class="brand"></span></div></div>`;
      this.$panel = this.$panelSlot.firstElementChild;
      this.$msgs = this.$panel.querySelector(".msgs");
      this.$ta = this.$panel.querySelector("textarea");
      const form = this.$panel.querySelector("form");
      form.addEventListener("submit", (e) => { e.preventDefault(); this.submit(); });
      this.$ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); this.submit(); } });
      this.$ta.addEventListener("input", () => { this.grow(); this.sendTyping(); });
      this.$panel.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
      this.renderAll();
      setTimeout(() => this.$ta.focus(), 60);
      this.fire("open");
    }
    close() {
      if (!this.isOpen) return;
      this.isOpen = false; this.$panelSlot.innerHTML = ""; this.$panel = null; this.$root.classList.remove("is-open");
      this.applyTheme(); this.$launcher.focus(); this.fire("close");
    }
    toggle() { this.isOpen ? this.close() : this.open(); }
    grow() { this.$ta.style.height = "auto"; this.$ta.style.height = Math.min(120, this.$ta.scrollHeight) + "px"; }

    renderAll() { if (!this.$panel) return; this.renderHead(); this.renderMsgs(); this.applyTheme(); }

    renderHead() {
      const s = this.s, E = this.C.esc;
      const open = this.C.isOpen(s.hours);
      const c = this.conv;
      const name = c && c.assigneeName && (c.status === "open" || c.status === "pending") ? c.assigneeName : s.botName || "Assistant";
      this.$panel.querySelector(".av").innerHTML = `${E(name.charAt(0))}<i class="${open ? "" : "off"}"></i>`;
      this.$panel.querySelector(".ht strong").textContent = `${name} · ${s.brand || ""}`;
      this.$panel.querySelector(".ht span").textContent = open ? this.t("online", { eta: (s.handoff && s.handoff.etaMinutes) || 10 }) : this.t("offline", { bot: s.botName || "Assistant" });
      this.$ta.placeholder = this.t("ph"); this.$ta.setAttribute("aria-label", this.t("ph"));
      this.$panel.querySelector(".sendb").setAttribute("aria-label", this.t("send"));
      this.$panel.querySelector(".priv").textContent = s.privacy && s.privacy.redact ? this.t("privacy") : "";
      this.$panel.querySelector(".brand").innerHTML = s.showBranding !== false ? `${this.t("powered")} <a href="${E(base)}index.html" target="_blank" rel="noopener">Tickless</a>` : "";
      const inc = (this.st.incidents || []).filter((i) => i.active);
      this.$panel.querySelector(".inc-slot").innerHTML = inc.map((i) => `<div class="inc" data-a="inc" role="button" tabindex="0">⚠ <b>${this.t("issue")}:</b> ${E(i.title)}<p>${E(i.body)}</p></div>`).join("");
    }

    greeting() {
      const s = this.s, l = this.lang();
      if (this.nudgeText) return this.nudgeText;
      if (s.greeting && l === (s.defaultLang || "en")) return s.greeting;
      const nm = this.v.profile && this.v.profile.name ? " " + this.v.profile.name.split(" ")[0] : "";
      return this.C.phrase(l, "greet", { name: nm, bot: s.botName || "Assistant", brand: s.brand || "us" });
    }

    renderMsgs() {
      const E = this.C.esc, md = this.C.md, c = this.conv, s = this.s;
      const nearBottom = this.$msgs.scrollHeight - this.$msgs.scrollTop - this.$msgs.clientHeight < 80;
      let html = "";
      const msgs = c ? c.messages.filter((m) => m.role !== "note") : [{ id: "greet", role: "bot", text: this.greeting(), meta: { kind: "greeting", quick: (s.quickTopics || []).slice(0, 4).map((t) => ({ label: t.label, action: "send", value: t.query || t.label })) } }];
      const lastIdx = msgs.length - 1;
      const kbById = Object.fromEntries((this.st.kb || []).map((a) => [a.id, a]));
      msgs.forEach((m, i) => {
        const meta = m.meta || {};
        if (m.role === "visitor") { html += `<div class="row me"><div class="b">${E(m.text)}</div></div>`; return; }
        if (m.role === "system") { html += `<div class="sys">${E(m.text)}</div>`; return; }
        const who = m.role === "agent" ? m.author || "Support" : s.botName || "Assistant";
        const showWho = i === 0 || msgs[i - 1].role !== m.role || (msgs[i - 1].author || "") !== (m.author || "");
        html += `<div class="row">${showWho ? `<div class="who">${E(who)}${m.role === "bot" ? " · " + (meta.source === "ai" ? "AI" : "bot") : ""}</div>` : ""}<div class="b">${md(m.text)}</div>`;
        if (meta.alsoLabel && meta.articles && meta.articles.length) html += `<div class="ask">${E(meta.alsoLabel)}</div>`;
        for (const id of meta.articles || []) {
          const a = kbById[id];
          if (!a) continue;
          const key = m.id + ":" + id, ex = this.expanded.has(key);
          html += `<div class="card"><h4>${E(a.title)}</h4><button class="lnk" data-a="art" data-k="${E(key)}" data-id="${E(id)}">${ex ? this.t("hide") : this.t("read")} ${ex ? "↑" : "→"}</button>`;
          if (ex) {
            html += `<div class="body">${md(a.body)}</div>`;
            html += this.fbDone.has(key) ? `<div class="fb">${this.t("thanksFb")}</div>` : `<div class="fb">${this.t("helpful")} <button data-a="fb" data-k="${E(key)}" data-id="${E(id)}" data-v="1" aria-label="Yes">👍</button><button data-a="fb" data-k="${E(key)}" data-id="${E(id)}" data-v="0" aria-label="No">👎</button></div>`;
          }
          html += `</div>`;
        }
        if (meta.ask && i === lastIdx) html += `<div class="ask">${E(meta.ask)}</div>`;
        if (meta.quick && i === lastIdx && (!c || c.status === "bot")) {
          html += `<div class="quick">${meta.quick.map((q, n) => `<button class="q${n === 0 && q.action === "flow" ? " main" : ""}" data-a="quick" data-i="${n}" data-m="${E(m.id)}">${E(q.label)}</button>`).join("")}</div>`;
        }
        if (meta.askEmail && i === lastIdx && c && !(c.visitor && c.visitor.email)) {
          html += `<form class="mail" data-a="mailform"><input type="email" required placeholder="${this.t("emailPh")}" aria-label="Email"><button>${this.t("emailBtn")}</button></form>${this.mailErr ? `<div class="err">${this.t("badEmail")}</div>` : ""}`;
        }
        html += `</div>`;
      });
      if (this.botTyping || this.agentTyping) html += `<div class="row"><div class="who">${E(this.agentTyping || s.botName || "Assistant")}</div><div class="typing" aria-label="${E(this.t("typing", { name: this.agentTyping || s.botName }))}"><i></i><i></i><i></i></div></div>`;
      if (c && c.status === "resolved" && s.csat !== false) {
        html += c.csat ? `<div class="rate">${this.t("rateThanks")} ${"★".repeat(c.csat)}</div>`
          : `<div class="rate">${this.t("rate")}<div class="faces">${["😞", "🙁", "😐", "🙂", "😍"].map((f, n) => `<button data-a="rate" data-v="${n + 1}" aria-label="${n + 1}/5">${f}</button>`).join("")}</div></div>`;
      }
      this.$msgs.innerHTML = html;
      if (nearBottom || this.forceScroll) { this.$msgs.scrollTop = this.$msgs.scrollHeight; this.forceScroll = false; }
    }

    /* ---------- events ---------- */
    onClick(e) {
      const el = e.target.closest("[data-a]");
      if (!el) return;
      const a = el.getAttribute("data-a");
      if (a === "close") this.close();
      else if (a === "new") { this.convId = null; LS.set(this.convKey, null); this.nudgeText = null; this.renderAll(); this.$ta.focus(); }
      else if (a === "nudge") this.open();
      else if (a === "nudge-x") { e.stopPropagation(); this.$nudge.innerHTML = ""; this.nudgeText = null; }
      else if (a === "inc") el.classList.toggle("openx");
      else if (a === "art") {
        const k = el.getAttribute("data-k");
        if (this.expanded.has(k)) this.expanded.delete(k);
        else { this.expanded.add(k); this.store.dispatch({ t: "kb.view", id: el.getAttribute("data-id") }); }
        this.renderMsgs();
      } else if (a === "fb") {
        this.fbDone.add(el.getAttribute("data-k"));
        this.store.dispatch({ t: "kb.feedback", id: el.getAttribute("data-id"), helpful: el.getAttribute("data-v") === "1" });
        this.renderMsgs();
      } else if (a === "quick") {
        const m = (this.conv ? this.conv.messages : []).find((x) => x.id === el.getAttribute("data-m"));
        const meta = m ? m.meta : { quick: (this.s.quickTopics || []).slice(0, 4).map((t) => ({ label: t.label, action: "send", value: t.query || t.label })) };
        const q = meta.quick[+el.getAttribute("data-i")];
        if (q) this.quick(q);
      } else if (a === "rate") {
        const v = +el.getAttribute("data-v");
        this.store.dispatch({ t: "conv.update", convId: this.convId, patch: { csat: v } });
        this.fire("rating", v);
      }
    }

    onOp(op) {
      if (["settings.update", "incident.upsert", "incident.delete", "reset"].includes(op.t)) { this.renderAll(); this.scheduleNudges(); return; }
      if (op.t === "kb.upsert" || op.t === "kb.delete") { if (this.$panel) this.renderMsgs(); return; }
      if (op.convId && op.convId !== this.convId) return;
      if (op.t === "typing") {
        if (op.who === "agent") { this.agentTyping = op.on ? op.name || "Support" : null; if (this.$panel) this.renderMsgs(); }
        return;
      }
      if (op.t === "msg.add" && op.msg.role === "agent") {
        this.agentTyping = null;
        if (!this.isOpen) { this.unread++; this.applyTheme(); }
        this.$live.textContent = (op.msg.author || "Support") + ": " + op.msg.text;
        this.fire("message", op.msg);
      }
      if (op.t === "conv.update" && op.patch.status === "resolved" && op.patch.resolvedBy === "agent") this.fire("resolved", { by: "agent" });
      if (this.$panel) { if (op.t === "conv.update") this.renderHead(); this.renderMsgs(); }
    }

    sendTyping() {
      const c = this.conv;
      if (!c || (c.status !== "open" && c.status !== "pending")) return;
      clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(() => this.store.dispatch({ t: "typing", convId: c.id, who: "visitor", text: this.$ta.value.slice(0, 500), on: !!this.$ta.value }), 250);
    }

    /* ---------- conversation logic ---------- */
    async ensureConv() {
      const existing = this.conv;
      if (existing && !(existing.status === "resolved" && Date.now() - (existing.resolvedAt || 0) > 6 * 3600000)) return existing;
      const p = this.v.profile || {};
      const conv = {
        id: "c_" + rnd(8), createdAt: Date.now(), channel: "web", status: "bot", lang: this.lang(),
        visitor: { id: this.v.id, name: p.name || "", email: p.email || "", plan: p.plan || "", page: location.pathname + location.hash, device: device(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: navigator.language, ...p.extra },
        messages: [],
      };
      this.convId = conv.id; LS.set(this.convKey, conv.id);
      await this.store.dispatch({ t: "conv.create", conv });
      await this.store.dispatch({ t: "msg.add", convId: conv.id, msg: { id: "m_" + rnd(6), role: "bot", text: this.greeting(), at: Date.now(), meta: { kind: "greeting", source: "local" } } });
      this.nudgeText = null;
      return this.conv;
    }

    async addVisitor(text) {
      const s = this.s;
      const red = s.privacy && s.privacy.redact ? this.C.redactPII(text) : { text, redacted: 0 };
      const c = await this.ensureConv();
      await this.store.dispatch({ t: "msg.add", convId: c.id, msg: { id: "m_" + rnd(6), role: "visitor", text: red.text, at: Date.now(), meta: red.redacted ? { redacted: red.redacted } : undefined } });
      if (this.typingTimer) { clearTimeout(this.typingTimer); this.store.dispatch({ t: "typing", convId: c.id, who: "visitor", text: "", on: false }); }
      this.forceScroll = true;
      return { conv: this.conv, text: red.text };
    }

    async botSay(msgs) {
      this.botTyping = true; this.renderMsgs();
      await sleep(500 + Math.random() * 500);
      this.botTyping = false;
      for (const m of msgs) await this.store.dispatch({ t: "msg.add", convId: this.convId, msg: m });
      this.forceScroll = true; this.renderMsgs();
    }

    submit() {
      const text = this.$ta.value.trim();
      if (!text) return;
      this.$ta.value = ""; this.grow();
      this.ask(text);
    }

    async ask(text, opts) {
      if (!this.isOpen) this.open();
      const { conv, text: clean } = await this.addVisitor(text);
      this.fire("message", { role: "visitor", text: clean });
      if (conv.status === "open" || conv.status === "pending") return; // a human owns it now
      if (conv.status === "resolved") await this.store.dispatch({ t: "conv.update", convId: conv.id, patch: { status: "bot", resolvedBy: null, resolvedAt: null } });
      await this.answer(clean, opts || {});
    }

    async answer(text, opts) {
      const local = this.C.respond(this.st, this.conv, text, opts);
      let reply = local;
      const ai = this.s.ai || {};
      const first = local.messages[0];
      const unsure = first && ["answer", "fallback", "flow-offer"].includes(first.meta.kind) && (first.meta.confidence || 0) < 0.75;
      if (this.store.mode === "remote" && ai.mode && ai.mode !== "off" && !local.handoff && (ai.mode === "always" || unsure)) {
        this.botTyping = true; this.renderMsgs();
        try {
          const r = await this.store.ai("/api/ai/answer", { vid: this.v.id, key: this.v.key, convId: this.convId, text });
          reply = this.fromAI(r, local);
        } catch (e) { console.warn("Tickless AI unavailable, using local engine", e); }
      }
      await this.store.dispatch({ t: "conv.update", convId: this.convId, patch: reply.patch });
      for (const q of reply.gaps) this.store.dispatch({ t: "gap.add", q, convId: this.convId });
      if (reply.handoff) return this.escalate(reply.handoff.reason, reply.handoff.priority, reply.messages);
      await this.botSay(reply.messages);
    }

    fromAI(r, local) {
      const L = local.patch.lang;
      const P = (k, v) => this.C.phrase(r.language || L, k, v);
      const patch = Object.assign({}, local.patch, { intent: r.intent || local.patch.intent, sentiment: r.sentiment || local.patch.sentiment, lang: r.language || L });
      const meta = { source: "ai", articles: (r.cited_article_ids || []).slice(0, 2), confidence: { high: 0.9, medium: 0.65, low: 0.35 }[r.confidence] || 0.5 };
      if (r.should_escalate) {
        return { patch, gaps: r.answered ? [] : local.gaps, handoff: { reason: "ai", priority: patch.sentiment === "angry" ? "urgent" : "normal" }, messages: r.reply ? [{ id: "m_" + rnd(6), role: "bot", text: r.reply, at: Date.now(), meta: Object.assign(meta, { kind: "answer" }) }] : [] };
      }
      meta.kind = r.answered ? "answer" : "fallback";
      meta.quick = r.answered ? [{ label: P("yes"), action: "resolve" }, { label: P("noHuman"), action: "handoff" }] : [{ label: P("noHuman"), action: "handoff" }, { label: P("rephrase"), action: "focus" }];
      if (local.messages[0] && local.messages[0].meta.quick) {
        const flowQ = local.messages[0].meta.quick.find((q) => q.action === "flow");
        if (flowQ && r.answered) meta.quick.unshift(flowQ);
      }
      if (r.answered) meta.ask = P("didItHelp");
      return { patch, gaps: r.answered ? [] : local.gaps, handoff: null, messages: [{ id: "m_" + rnd(6), role: "bot", text: r.reply, at: Date.now(), meta }] };
    }

    async escalate(reason, priority, msgs) {
      const c = this.conv;
      const local = msgs && msgs.length ? msgs : this.C.respond(this.st, c, "", { forceHuman: true }).messages;
      await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { status: "open", escalatedAt: Date.now(), priority: priority || "normal", handoffReason: reason } });
      await this.store.dispatch({ t: "msg.add", convId: c.id, msg: { id: "m_" + rnd(6), role: "note", text: this.C.handoffSummary(this.st, this.conv, reason), at: Date.now(), meta: { kind: "summary" } } });
      if (c.flow && c.flow.id) this.store.dispatch({ t: "flow.stat", id: c.flow.id, key: "handoff" });
      await this.botSay(local);
      this.fire("handoff", { reason });
    }

    async quick(q) {
      if (q.action === "send") return this.ask(q.value || q.label);
      if (q.action === "focus") return this.$ta && this.$ta.focus();
      if (q.action === "handoff") {
        await this.addVisitor(q.label);
        const r = this.C.respond(this.st, this.conv, q.label, { forceHuman: true });
        return this.escalate("visitor_request", r.handoff.priority, r.messages);
      }
      if (q.action === "resolve") {
        await this.addVisitor(q.label);
        const c = this.conv;
        const last = c.messages.slice().reverse().find((m) => m.role === "bot" && m.meta && m.meta.articles && m.meta.articles.length);
        if (last) this.store.dispatch({ t: "kb.feedback", id: last.meta.articles[0], helpful: true });
        await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { status: "resolved", resolvedBy: "bot", resolvedAt: Date.now() } });
        await this.botSay([{ id: "m_" + rnd(6), role: "bot", text: this.C.phrase(this.lang(), "gladShort"), at: Date.now(), meta: { kind: "thanks", source: "local" } }]);
        this.fire("resolved", { by: "bot" });
        return;
      }
      if (q.action === "flow") return this.startFlow(q.value, q.label);
      if (q.action === "flow-go") {
        await this.addVisitor(q.label);
        const c = this.conv;
        const path = ((c.flow && c.flow.path) || []).concat([{ node: c.flow && c.flow.node, label: q.label }]);
        await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { flow: { id: c.flow.id, node: q.value, path } } });
        return this.showNode(q.value);
      }
      if (q.action === "flow-fixed") {
        await this.addVisitor(q.label);
        const c = this.conv;
        this.store.dispatch({ t: "flow.stat", id: c.flow.id, key: "fixed" });
        await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { status: "resolved", resolvedBy: "bot", resolvedAt: Date.now() } });
        await this.botSay([{ id: "m_" + rnd(6), role: "bot", text: this.C.phrase(this.lang(), "gladShort"), at: Date.now(), meta: { kind: "thanks", source: "local" } }]);
        this.fire("resolved", { by: "bot" });
      }
    }

    async startFlow(id, label) {
      const f = (this.st.flows || []).find((x) => x.id === id);
      if (!f) return;
      if (!this.isOpen) this.open();
      if (label) await this.addVisitor(label); else await this.ensureConv();
      const c = this.conv;
      if (c.status !== "bot") await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { status: "bot", resolvedBy: null } });
      this.store.dispatch({ t: "flow.stat", id: f.id, key: "started" });
      await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { flow: { id: f.id, node: f.start, path: [] }, intent: f.intent || c.intent } });
      return this.showNode(f.start);
    }

    async showNode(nodeId) {
      const c = this.conv, f = (this.st.flows || []).find((x) => x.id === (c.flow && c.flow.id));
      const node = f && f.nodes[nodeId];
      if (!node) return this.escalate("flow");
      const L = this.lang(), P = (k) => this.C.phrase(L, k);
      const msg = { id: "m_" + rnd(6), role: "bot", text: node.text, at: Date.now(), meta: { kind: "flow", flow: f.id, node: nodeId, source: "local" } };
      if (node.kind === "step") msg.meta.quick = node.options.map((o) => ({ label: o.label, action: "flow-go", value: o.next }));
      if (node.kind === "solution") msg.meta.quick = [{ label: P("fixed"), action: "flow-fixed" }, { label: P("notFixed"), action: "flow-go", value: node.next || "__handoff" }];
      if (node.kind === "handoff") {
        const r = this.C.respond(this.st, c, "", { forceHuman: true });
        return this.escalate("flow", r.handoff.priority, [msg].concat(r.messages.map((m) => Object.assign(m, { text: m.text.replace(this.C.phrase(L, "humanAsk") + " ", "") }))));
      }
      await this.botSay([msg]);
    }

    async saveEmail(email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.mailErr = true; return this.renderMsgs(); }
      this.mailErr = false;
      const c = this.conv;
      this.identify({ email });
      await this.store.dispatch({ t: "conv.update", convId: c.id, patch: { visitor: Object.assign({}, c.visitor, { email }) } });
      await this.store.dispatch({ t: "msg.add", convId: c.id, msg: { id: "m_" + rnd(6), role: "bot", text: this.C.phrase(this.lang(), "emailSaved", { email }), at: Date.now(), meta: { kind: "system", source: "local" } } });
    }

    identify(p) {
      const prof = Object.assign({}, this.v.profile, p);
      this.v.profile = prof; LS.set("tickless:visitor", this.v);
      const c = this.conv;
      if (c) this.store.dispatch({ t: "conv.update", convId: c.id, patch: { visitor: Object.assign({}, c.visitor, { name: prof.name || c.visitor.name, email: prof.email || c.visitor.email, plan: prof.plan || c.visitor.plan }) } });
    }
  }

  async function boot() {
    try {
      if (!window.TicklessCore) await loadScript(base + "core.js");
      const Core = window.TicklessCore;
      const visitor = visitorIdentity();
      let store;
      // No data-api? If the script is served by a Tickless server, use it; otherwise run the in-browser demo.
      if (!cfg.api && !/^file:/.test(base)) {
        try {
          const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
          const r = await fetch(base + "api/health", { signal: ctl.signal, cache: "no-store" });
          clearTimeout(t);
          if (r.ok && (await r.json()).app === "tickless") cfg.api = base.replace(/\/$/, "");
        } catch (e) { /* static hosting */ }
      }
      if (cfg.api) store = await new Core.RemoteStore({ api: cfg.api, role: "widget", visitor }).init();
      else {
        if (!window.TicklessSeed) await loadScript(base + "seed.js");
        store = new Core.LocalStore(cfg.workspace, () => window.TicklessSeed.workspace());
      }
      const w = new Widget(Core, store, visitor);
      w.mount();
      // Email capture lives in a <form>; delegate submit separately from clicks.
      w.root.addEventListener("submit", (e) => {
        if (!e.target.matches('[data-a="mailform"]')) return;
        e.preventDefault();
        w.saveEmail(e.target.querySelector("input").value.trim());
      });
      const api = {
        __loaded: true,
        open: () => w.open(), close: () => w.close(), toggle: () => w.toggle(),
        ask: (t) => w.ask(String(t)), startFlow: (id) => w.startFlow(id),
        identify: (p) => w.identify(p || {}), setLanguage: (l) => { w.forcedLang = UI[l] ? l : null; w.renderAll(); },
        on: (ev, fn) => { (w.listeners[ev] = w.listeners[ev] || []).push(fn); },
        reset: () => { w.convId = null; LS.set(w.convKey, null); w.renderAll(); },
        get conversation() { return w.conv ? Core.publicConversation(w.conv) : null; },
      };
      const queued = (window.Tickless && window.Tickless.q) || [];
      window.Tickless = api;
      for (const [fn, args] of queued) if (typeof api[fn] === "function") api[fn](...args);
      window.dispatchEvent(new CustomEvent("tickless:ready"));
    } catch (e) {
      console.error("Tickless failed to start", e);
    }
  }

  window.Tickless = window.Tickless || { q: [] };
  ["open", "close", "toggle", "ask", "startFlow", "identify", "setLanguage", "on", "reset"].forEach((fn) => {
    if (!window.Tickless[fn]) window.Tickless[fn] = (...args) => (window.Tickless.q = window.Tickless.q || []).push([fn, args]);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
