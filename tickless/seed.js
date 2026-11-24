/*!
 * Tickless demo workspace: "Acme Cloud", a fictional project-management SaaS.
 * Knowledge base, troubleshooters, macros, status incidents, and 60 days of
 * generated history so the analytics have something real to chew on.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.TicklessSeed = factory(root.TicklessCore);
})(typeof self !== "undefined" ? self : this, function (Core) {
  "use strict";

  const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  const KB = [
    {
      id: "kb_reset", title: "Reset your password", tags: ["login", "password", "account"],
      questions: ["I forgot my password", "password not working", "how do I change my password", "reset link not arriving"],
      answer: "Go to **acme.cloud/login**, click **Forgot password** and enter your work email. The reset link arrives within 2 minutes and is valid for 1 hour — check spam if you don't see it.",
      body: "1. Open the login page and click **Forgot password**.\n2. Enter the email you use for Acme Cloud.\n3. Open the link we send you (valid for 1 hour) and choose a new password.\n\nIf your company uses single sign-on (SSO), your password is managed by your identity provider — contact your IT admin instead.\n\nNo email after 5 minutes? Check spam and make sure `no-reply@acme.cloud` is allowed.",
    },
    {
      id: "kb_2fa", title: "Two-factor authentication: set up and recovery", tags: ["2fa", "security", "login"],
      questions: ["2fa code not working", "lost my phone authenticator", "verification code invalid", "how to enable two factor"],
      answer: "If your 2FA code is rejected, first check your phone's clock is set to automatic — codes depend on exact time. Lost your device? Use one of the recovery codes you saved when you enabled 2FA.",
      body: "**Enable 2FA:** Settings → Security → Two-factor authentication → scan the QR code with any authenticator app.\n\n**Code rejected?**\n- Set your phone's date & time to automatic.\n- Make sure you're using the code for the right account.\n\n**Lost your device?** Sign in with a recovery code. No recovery codes left? Our team can verify your identity and reset 2FA — this takes up to 24 hours for your security.",
    },
    {
      id: "kb_locked", title: "Account locked after too many attempts", tags: ["login", "locked", "account"],
      questions: ["my account is locked", "too many login attempts", "account blocked"],
      answer: "After 5 failed sign-ins we lock the account for 15 minutes to protect it. Wait 15 minutes, then sign in — or reset your password to unlock it immediately.",
      body: "Locks expire automatically after **15 minutes**. Resetting your password unlocks the account right away.\n\nIf you see repeated locks you didn't cause, turn on two-factor authentication and contact us — we'll review the sign-in activity.",
    },
    {
      id: "kb_cancel", title: "Change or cancel your subscription", tags: ["cancel", "subscription", "plan", "billing"],
      questions: ["how do I cancel", "cancel my subscription", "downgrade my plan", "stop auto renewal"],
      answer: "Owners can cancel anytime in **Settings → Billing → Manage plan → Cancel subscription**. You keep access until the end of the paid period, and your data stays exportable for 30 days.",
      body: "**Change plan:** Settings → Billing → Manage plan. Upgrades apply immediately (prorated); downgrades apply at the next renewal.\n\n**Cancel:** Settings → Billing → Manage plan → Cancel subscription. Only workspace owners see this option.\n\nAfter cancelling you keep access until the period ends. We keep your data for 30 days so you can export it or come back.",
    },
    {
      id: "kb_refund", title: "Refund policy", tags: ["refund", "billing", "payment"],
      questions: ["can I get a refund", "I want my money back", "refund for annual plan", "charged by mistake"],
      answer: "Monthly plans can be refunded within 7 days of a charge; annual plans within 30 days, prorated after that. Duplicate or accidental charges are always refunded in full — our team handles these personally.",
      body: "- **Monthly plans:** full refund within 7 days of the charge.\n- **Annual plans:** full refund within 30 days, prorated afterwards.\n- **Duplicate charges:** always refunded in full, usually within 1 business day.\n\nRefunds return to the original payment method and take 5–10 business days to show up, depending on your bank.",
    },
    {
      id: "kb_invoice", title: "Download invoices and add your VAT ID", tags: ["invoice", "billing", "vat", "tax"],
      questions: ["where can I download my invoice", "I need an invoice with VAT number", "change company name on invoice", "receipt for payment"],
      answer: "All invoices are in **Settings → Billing → Invoices** — click any row to download the PDF. To add your company name or VAT/GST ID, edit **Billing details**; new invoices will include it.",
      body: "1. Go to Settings → Billing → Invoices.\n2. Click an invoice to download the PDF.\n\n**VAT / GST ID:** Settings → Billing → Billing details. EU businesses with a valid VAT ID are invoiced with reverse charge.\n\nNeed an older invoice re-issued with new details? Ask the team — we can re-issue invoices from the last 12 months.",
    },
    {
      id: "kb_payment", title: "Payment failed or card declined", tags: ["payment", "card", "declined", "billing"],
      questions: ["my card was declined", "payment failed", "can't upgrade payment error", "3d secure"],
      answer: "Most declines come from the bank's security check. Make sure 3-D Secure is approved in your banking app, the billing address matches your card, and try again — or add another card in **Settings → Billing → Payment method**.",
      body: "Common causes:\n- **3-D Secure** confirmation not approved in your banking app.\n- Billing address or postcode doesn't match the card.\n- Card blocks online or international payments.\n- Prepaid or virtual cards with low limits.\n\nWe retry failed renewals 3 times over 7 days. Your workspace stays active during that time.",
    },
    {
      id: "kb_plans", title: "Plans and pricing", tags: ["price", "plan", "upgrade", "seats"],
      questions: ["how much does it cost", "which plan should I choose", "difference between plans", "do you have a discount"],
      answer: "Acme Cloud has **Free** (up to 3 users), **Team** ($8/user/month), and **Business** ($16/user/month, with SSO and audit logs). Annual billing saves 20%. You can switch plans anytime.",
      body: "- **Free:** up to 3 users, 5 projects.\n- **Team:** $8 per user/month — unlimited projects, integrations, guests.\n- **Business:** $16 per user/month — SSO (SAML), audit log, advanced permissions, priority support.\n- **Enterprise:** custom — data residency, SLA, dedicated manager.\n\nAnnual billing saves 20%. Prices exclude VAT.",
    },
    {
      id: "kb_export", title: "Export your data", tags: ["export", "data", "backup", "csv"],
      questions: ["how do I export my projects", "download all my data", "export to csv", "backup my workspace"],
      answer: "Admins can export everything from **Settings → Workspace → Export data** as CSV or JSON. Large workspaces are prepared in the background and we email you a download link (valid 7 days).",
      body: "Exports include projects, tasks, comments, and attachments metadata. Attachments themselves are included in the JSON export as a separate ZIP.\n\nYou can also export a single project from its menu → Export.",
    },
    {
      id: "kb_delete", title: "Delete your account and data (GDPR)", tags: ["delete", "gdpr", "privacy", "account"],
      questions: ["delete my account", "remove all my data", "right to be forgotten", "close my account"],
      answer: "Go to **Settings → Account → Delete account**. Workspace owners must transfer ownership or cancel the subscription first. Deletion is permanent after 30 days, in line with GDPR.",
      body: "We delete personal data within 30 days and from backups within 90 days. You'll receive a confirmation email.\n\nFor a data access request (a copy of your personal data), contact privacy@acme.cloud.",
    },
    {
      id: "kb_api", title: "API rate limits and 429 errors", tags: ["api", "ratelimit", "error", "developer"],
      questions: ["getting error 429", "too many requests", "api limits", "api is rejecting my calls"],
      answer: "The API allows **100 requests per minute per token** (Business: 600). A 429 means you hit the limit — wait for the `Retry-After` seconds in the response and use exponential backoff.",
      body: "Every response includes `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers.\n\nBest practices:\n- Respect `Retry-After` on 429 responses.\n- Use webhooks instead of polling.\n- Batch updates with the `/bulk` endpoints.\n\nNeed a higher limit for a migration? Ask the team for a temporary increase.",
    },
    {
      id: "kb_integrations", title: "Integrations: Slack, GitHub, Google Drive", tags: ["integration", "slack", "github", "drive"],
      questions: ["connect slack", "github integration not working", "link google drive", "integration disconnected"],
      answer: "Connect integrations in **Settings → Integrations**. If one stops working, disconnect and reconnect it — tokens expire when the person who connected it leaves the workspace or changes their password.",
      body: "Supported: Slack, GitHub, GitLab, Google Drive, Dropbox, Zapier, Figma.\n\n**Not syncing?**\n1. Disconnect the integration.\n2. Reconnect it with an account that still has access.\n3. Check the integration's own permissions (e.g. the Slack channel must allow apps).",
    },
    {
      id: "kb_invite", title: "Invite teammates and manage roles", tags: ["invite", "team", "roles", "permissions"],
      questions: ["how do I add a user", "invite my team", "change someone's role", "remove a member"],
      answer: "Admins invite people from **Settings → Members → Invite**. Roles: Owner, Admin, Member, Guest. Invites expire after 7 days — you can resend them from the same page.",
      body: "- **Owner:** billing and everything else.\n- **Admin:** members, integrations, settings.\n- **Member:** works in projects they can access.\n- **Guest:** free, limited to shared projects.\n\nRemoving a member frees the seat immediately; their content stays.",
    },
    {
      id: "kb_slow", title: "Acme Cloud feels slow", tags: ["slow", "performance", "loading"],
      questions: ["the app is very slow", "pages take forever to load", "lagging", "boards are freezing"],
      answer: "First check **status.acme.cloud** for ongoing incidents. If all is green: refresh with cache cleared, try a private window to rule out browser extensions, and archive very large boards (2,000+ tasks).",
      body: "1. Check status.acme.cloud.\n2. Hard refresh (Ctrl/Cmd + Shift + R).\n3. Try a private window — ad blockers and some extensions slow us down.\n4. Use an up-to-date Chrome, Edge, Firefox, or Safari.\n5. Archive completed tasks on boards with 2,000+ items.\n\nStill slow? Tell us your browser, region, and which page — we'll trace it.",
    },
    {
      id: "kb_notifications", title: "Email notifications not arriving", tags: ["notification", "email", "alerts"],
      questions: ["I don't get email notifications", "notifications stopped", "no emails from acme", "slack notifications missing"],
      answer: "Check **Settings → Notifications** (they may be set to daily digest), look in spam, and allow `notifications@acme.cloud` in your email filters. Company mail servers sometimes quarantine automated emails.",
      body: "1. Settings → Notifications: choose **Instant** instead of Digest.\n2. Search spam/quarantine for notifications@acme.cloud.\n3. Ask IT to allowlist `acme.cloud` (SPF/DKIM are configured).\n\nIn-app notifications always work — the bell icon shows everything.",
    },
    {
      id: "kb_mobile", title: "Mobile app not syncing", tags: ["mobile", "sync", "ios", "android"],
      questions: ["mobile app doesn't sync", "changes not showing on phone", "android app stuck", "iphone app outdated data"],
      answer: "Pull down to refresh, make sure the app is updated to the latest version, then sign out and back in. Background data must be allowed for Acme Cloud in your phone settings.",
      body: "- Update the app from the App Store / Google Play.\n- Allow background app refresh (iOS) or background data (Android).\n- Sign out and back in to rebuild the local cache.\n\nOffline changes sync automatically when you're back online.",
    },
    {
      id: "kb_security", title: "Security, compliance and data residency", tags: ["security", "gdpr", "soc2", "residency"],
      questions: ["are you gdpr compliant", "where is my data stored", "do you have soc 2", "can you sign a dpa"],
      answer: "Acme Cloud is SOC 2 Type II certified and GDPR compliant. Data is encrypted in transit and at rest; you can choose **EU or US data residency** on Business and Enterprise plans. Our DPA is available in Settings → Legal.",
      body: "- SOC 2 Type II, ISO 27001.\n- AES-256 at rest, TLS 1.3 in transit.\n- Data residency: EU (Frankfurt) or US (Virginia).\n- DPA and sub-processor list: Settings → Legal.",
    },
  ];

  const FLOWS = [
    {
      id: "fl_login", name: "Can't log in", intent: "account", enabled: true,
      triggers: ["cant login", "login problem", "login not working", "password rejected", "locked out", "2fa code", "unable to sign in"],
      start: "n1",
      nodes: {
        n1: { kind: "step", text: "Let's fix it. What happens when you try to log in?", options: [
          { label: "My password is rejected", next: "n2" }, { label: "The 2FA code doesn't work", next: "n3" },
          { label: "It says my account is locked", next: "n5" }, { label: "I use SSO and get an error", next: "h_sso" }] },
        n2: { kind: "solution", text: "Reset it: on the login page click **Forgot password**, enter your work email and follow the link (valid 1 hour). Check spam if it doesn't arrive within 2 minutes.", next: "h" },
        n3: { kind: "step", text: "Do you still have the phone with your authenticator app?", options: [
          { label: "Yes, I have it", next: "n4" }, { label: "No, I lost it", next: "n6" }] },
        n4: { kind: "solution", text: "Codes depend on exact time. On your phone set **Date & time → Automatic**, wait for a fresh code and try again.", next: "h" },
        n5: { kind: "solution", text: "Locks lift automatically after **15 minutes**. Want in now? Reset your password — that unlocks the account immediately.", next: "h" },
        n6: { kind: "solution", text: "Sign in with one of the **recovery codes** you saved when enabling 2FA (each works once). No codes left? Our team can verify your identity and reset 2FA.", next: "h" },
        h_sso: { kind: "handoff", text: "SSO errors usually need a look at your identity-provider settings. I'm passing this to the team with the details." },
        h: { kind: "handoff", text: "Thanks for trying that. I'm passing this to the team with everything you've told me." },
      },
      stats: { started: 212, fixed: 151, handoff: 61 },
    },
    {
      id: "fl_payment", name: "Payment problem", intent: "billing", enabled: true,
      triggers: ["payment failed", "card declined", "charged twice", "double charge", "payment error", "cant pay"],
      start: "n1",
      nodes: {
        n1: { kind: "step", text: "Sorry about that. What's going on with the payment?", options: [
          { label: "My card is declined", next: "n2" }, { label: "I was charged twice", next: "h_dup" }, { label: "I need an invoice", next: "n3" }] },
        n2: { kind: "step", text: "Did your bank app ask you to approve the payment (3-D Secure)?", options: [
          { label: "Yes / I'm not sure", next: "n4" }, { label: "No request came", next: "n5" }] },
        n3: { kind: "solution", text: "Invoices are in **Settings → Billing → Invoices**. Add your company name and VAT ID under **Billing details** — new invoices will include it.", next: "h" },
        n4: { kind: "solution", text: "Open your banking app, approve the pending request, then retry in **Settings → Billing → Retry payment**. Requests expire after ~10 minutes.", next: "n5" },
        n5: { kind: "solution", text: "Check that the billing postcode matches your card and that it allows online/international payments — or add a different card under **Payment method**.", next: "h" },
        h_dup: { kind: "handoff", text: "Duplicate charges are always refunded in full. I'm flagging this as high priority for the billing team now." },
        h: { kind: "handoff", text: "Let's get a person to look at your account. I'm passing this on with the details." },
      },
      stats: { started: 164, fixed: 97, handoff: 67 },
    },
    {
      id: "fl_slow", name: "App is slow", intent: "technical", enabled: true,
      triggers: ["slow", "lag", "loading forever", "freezing", "performance", "takes long to load"],
      start: "n1",
      nodes: {
        n1: { kind: "solution", text: "Step 1: do a hard refresh — **Ctrl/Cmd + Shift + R**. Did that help?", next: "n2" },
        n2: { kind: "solution", text: "Step 2: open Acme Cloud in a **private window**. If it's fast there, a browser extension (often an ad blocker) is slowing it down.", next: "n3" },
        n3: { kind: "step", text: "Is it slow everywhere, or on one specific board?", options: [
          { label: "One big board", next: "n4" }, { label: "Everywhere", next: "h" }] },
        n4: { kind: "solution", text: "Boards with 2,000+ tasks get heavy. Use **Board menu → Archive completed** — it usually makes them 3–5× faster.", next: "h" },
        h: { kind: "handoff", text: "Thanks — I'll get an engineer-minded human on it. Tip: tell them your browser and region." },
      },
      stats: { started: 98, fixed: 61, handoff: 37 },
    },
    {
      id: "fl_notif", name: "Notifications missing", intent: "technical", enabled: true,
      triggers: ["notifications not arriving", "no email notifications", "not getting emails", "notifications stopped"],
      start: "n1",
      nodes: {
        n1: { kind: "solution", text: "Check **Settings → Notifications**: if it's on *Daily digest*, switch to **Instant**.", next: "n2" },
        n2: { kind: "solution", text: "Search spam or quarantine for **notifications@acme.cloud** and mark it as safe. Company mail servers often hold automated emails.", next: "h" },
        h: { kind: "handoff", text: "I'll pass this to the team so they can check delivery logs for your address." },
      },
      stats: { started: 54, fixed: 39, handoff: 15 },
    },
  ];

  const MACROS = [
    { id: "mc_hello", name: "Greeting", shortcut: "hi", body: "Hi {{first}}, thanks for reaching out — I'm {{agent}} and I'll take it from here." },
    { id: "mc_refund", name: "Refund approved", shortcut: "refund", body: "Good news {{first}}: I've issued a full refund. It'll show up on your statement in 5–10 business days. Sorry for the hassle!" },
    { id: "mc_dup", name: "Duplicate charge", shortcut: "dup", body: "You're right {{first}}, I can see the duplicate charge. I've refunded it in full and added a note to your account so it can't happen again." },
    { id: "mc_shot", name: "Ask for screenshot", shortcut: "shot", body: "Could you send me a screenshot of what you see, plus your browser and operating system? That'll help me pin it down fast." },
    { id: "mc_eng", name: "Escalated to engineering", shortcut: "eng", body: "I've escalated this to our engineering team with all the details. I'll update you here as soon as I hear back — usually within one business day." },
    { id: "mc_close", name: "Closing", shortcut: "bye", body: "Glad we got that sorted, {{first}}! If anything else comes up, just reply here. Have a great day." },
  ];

  const INCIDENTS = [
    { id: "inc_eu_mail", title: "Delayed email notifications (EU region)", body: "Some notification emails are arriving 15–30 minutes late. In-app notifications work normally. Engineers are on it.", keywords: ["notification", "email", "delay", "late"], severity: "minor", active: true, createdAt: 0 },
    { id: "inc_api", title: "Elevated API latency", body: "Resolved: API response times are back to normal.", keywords: ["api", "latency"], severity: "minor", active: false, createdAt: 0 },
  ];

  const SETTINGS = {
    brand: "Acme Cloud", botName: "Ava", accent: "#2a78d6", position: "right", launcher: "chat",
    greeting: "", defaultLang: "en", languages: ["en", "es", "fr", "de", "it", "pt"],
    hours: { tz: "Europe/Dublin", days: [1, 2, 3, 4, 5], start: "08:00", end: "20:00", always: true },
    handoff: { onFrustration: true, etaMinutes: 8, slaMinutes: 30, maxFallbacks: 2 },
    bot: { threshold: 0.45, tone: "friendly" },
    privacy: { redact: true },
    csat: true,
    proactive: [
      { id: "pr_pricing", enabled: true, match: "pricing", delay: 10, text: "Comparing plans? Tell me your team size and I'll tell you which one fits." },
      { id: "pr_billing", enabled: true, match: "billing", delay: 5, text: "Payment problem? I can fix most billing issues in under a minute." },
    ],
    quickTopics: [
      { label: "Reset my password" }, { label: "Download an invoice" }, { label: "Payment failed" }, { label: "The app is slow" },
    ],
    costPerTicket: 6,
    ai: { mode: "fallback" },
    team: [
      { id: "ag_alex", name: "Alex Rivera", role: "Admin" },
      { id: "ag_sam", name: "Sam Okafor", role: "Agent" },
      { id: "ag_lena", name: "Lena Park", role: "Agent" },
    ],
    showBranding: true,
  };

  /* ---------------- generated history ---------------- */

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pickW = (r, entries) => {
    const total = entries.reduce((s, e) => s + e[1], 0);
    let x = r() * total;
    for (const [v, w] of entries) { if ((x -= w) <= 0) return v; }
    return entries[entries.length - 1][0];
  };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const ASK = {
    billing: { en: ["How do I download my invoice?", "My card was declined when upgrading", "Can I get a refund for last month?", "I need an invoice with our VAT number"],
      es: ["¿Dónde descargo mis facturas?", "Mi tarjeta fue rechazada"], fr: ["Où trouver ma facture ?", "Ma carte a été refusée"],
      de: ["Wo finde ich meine Rechnung?", "Meine Karte wurde abgelehnt"], it: ["Dove scarico la fattura?", "Il pagamento non va a buon fine"], pt: ["Onde baixo minha fatura?", "Meu cartão foi recusado"] },
    account: { en: ["I forgot my password", "My 2FA code doesn't work", "My account is locked", "How do I change my email?"],
      es: ["Olvidé mi contraseña", "Mi cuenta está bloqueada"], fr: ["J'ai oublié mon mot de passe"], de: ["Ich habe mein Passwort vergessen"],
      it: ["Ho dimenticato la password"], pt: ["Esqueci minha senha"] },
    technical: { en: ["The app is very slow today", "Slack integration stopped working", "Getting 429 errors from the API", "Mobile app doesn't sync"],
      es: ["La aplicación va muy lenta"], fr: ["L'application est très lente"], de: ["Die App ist sehr langsam"], it: ["L'app è lentissima"], pt: ["O app está muito lento"] },
    cancellation: { en: ["How do I cancel my subscription?", "I want to delete my account"], es: ["Quiero cancelar mi suscripción"],
      fr: ["Comment annuler mon abonnement ?"], de: ["Wie kann ich kündigen?"], it: ["Come disdico l'abbonamento?"], pt: ["Como cancelo minha assinatura?"] },
    sales: { en: ["Which plan is right for 25 people?", "Do you offer a nonprofit discount?", "Can we get a demo of Business?"],
      es: ["¿Cuánto cuesta el plan Business?"], fr: ["Quel est le prix du plan Team ?"], de: ["Was kostet der Business-Plan?"], it: ["Quanto costa il piano Team?"], pt: ["Quanto custa o plano Business?"] },
    privacy: { en: ["Are you GDPR compliant?", "Where is our data stored?"], es: ["¿Dónde se guardan mis datos?"], fr: ["Êtes-vous conformes au RGPD ?"],
      de: ["Sind Sie DSGVO-konform?"], it: ["Siete conformi al GDPR?"], pt: ["Vocês seguem a LGPD/GDPR?"] },
    other: { en: ["Is there a Linux desktop app?", "Can I self-host Acme?"], es: ["¿Hay app para Linux?"], fr: ["Y a-t-il une app Linux ?"], de: ["Gibt es eine Linux-App?"], it: ["C'è un'app per Linux?"], pt: ["Tem app para Linux?"] },
  };
  const ART_FOR = {
    billing: ["kb_invoice", "kb_payment", "kb_refund", "kb_invoice"], account: ["kb_reset", "kb_2fa", "kb_locked", "kb_reset"],
    technical: ["kb_slow", "kb_integrations", "kb_api", "kb_mobile"], cancellation: ["kb_cancel", "kb_delete"],
    sales: ["kb_plans", "kb_plans", "kb_plans"], privacy: ["kb_security", "kb_security"], other: [null, null],
  };
  const AGENT_REPLY = {
    billing: "Thanks for the details — I've checked your billing history and sorted it. You'll see the update on your account right away.",
    account: "I've verified your identity and reset access. You can sign in now — let me know if anything looks off.",
    technical: "Thanks! I reproduced it on our side and our engineers pushed a fix. Could you try again now?",
    cancellation: "Done — I've processed that for you. Your data stays exportable for 30 days.",
    sales: "Great question! For your team size I'd suggest the Team plan — happy to set up a 14-day Business trial too.",
    privacy: "Yes — we're GDPR compliant and can host your data in the EU. I've sent our DPA to your email.",
    other: "Good question — not today, but I've passed it to our product team and added your vote.",
  };
  const FIRST = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Mateo", "Lucía", "Hugo", "Chloé", "Lea", "Finn", "Giulia", "Marco", "Ana", "João", "Sofia", "Aarav", "Mia", "Ethan", "Nora", "Elif", "Kenji", "Zoe", "Omar"];
  const LAST = ["Smith", "Garcia", "Müller", "Rossi", "Silva", "Dubois", "Kim", "Patel", "Novak", "Jensen", "Costa", "Moreau", "Schmidt", "Bianchi", "Santos", "Brown", "Lopez", "Fischer", "Ricci", "Martin"];
  const COUNTRY = { en: ["US", "GB", "CA", "AU", "IE", "IN"], es: ["ES", "MX", "AR", "CO"], fr: ["FR", "BE", "CA"], de: ["DE", "AT", "CH"], it: ["IT", "CH"], pt: ["BR", "PT"] };
  const AUTO = { account: 0.74, billing: 0.56, technical: 0.6, cancellation: 0.38, sales: 0.52, privacy: 0.6, other: 0.12 };

  function history(now, kb) {
    const r = rng(20261124);
    const out = {};
    const art = Object.fromEntries(kb.map((a) => [a.id, a]));
    const hourW = Array.from({ length: 24 }, (_, h) => [h, h < 7 ? 0.25 : h < 9 ? 1.4 : h < 12 ? 3 : h < 14 ? 2.4 : h < 18 ? 2.8 : h < 21 ? 1.4 : 0.6]);
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    for (let d = 59; d >= 0; d--) {
      const day0 = today.getTime() - d * DAY;
      const dow = new Date(day0).getDay();
      const weekend = dow === 0 || dow === 6;
      const growth = 1 + (59 - d) / 59 * 0.35;
      let n = Math.round((weekend ? 5 : 12) * growth * (0.75 + r() * 0.5));
      for (let i = 0; i < n; i++) {
        const at = day0 + pickW(r, hourW) * HOUR + Math.floor(r() * 60) * MIN;
        if (at > now - 40 * MIN) continue;
        const intent = pickW(r, [["billing", 26], ["account", 24], ["technical", 26], ["cancellation", 7], ["sales", 10], ["privacy", 4], ["other", 3]]);
        const lang = pickW(r, [["en", 55], ["es", 12], ["de", 10], ["fr", 9], ["pt", 7], ["it", 7]]);
        const recent = d < 14 ? 0.1 : 0;
        const byBot = r() < AUTO[intent] + recent;
        const mood = pickW(r, byBot ? [["neutral", 6], ["positive", 3], ["negative", 1]] : [["neutral", 5], ["negative", 3], ["positive", 1], ["angry", 1]]);
        const first = pick(r, FIRST), last = pick(r, LAST);
        const id = "c_h" + d + "_" + i;
        const ask = pick(r, (ASK[intent][lang] || ASK[intent].en));
        const artId = pick(r, ART_FOR[intent]);
        const a = artId && art[artId];
        const msgs = [{ id: id + "_1", role: "visitor", text: ask, at }];
        if (a) msgs.push({ id: id + "_2", role: "bot", text: a.answer, at: at + 4000, meta: { kind: "answer", articles: [a.id], confidence: 0.55 + r() * 0.4, source: "local" } });
        else msgs.push({ id: id + "_2", role: "bot", text: Core.phrase(lang, "notFound") + " " + Core.phrase(lang, "offerHuman"), at: at + 4000, meta: { kind: "fallback", source: "local" } });
        const c = {
          id, createdAt: at, updatedAt: at, channel: "web", lang, intent, sentiment: mood, tags: [], priority: mood === "angry" ? "urgent" : "normal",
          visitor: { id: "v_" + id, name: first + " " + last, email: (first + "." + last).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@example.com", country: pick(r, COUNTRY[lang]), plan: pickW(r, [["Free", 4], ["Team", 4], ["Business", 2]]), page: pick(r, ["/app", "/billing", "/pricing", "/settings", "/docs"]) },
          messages: msgs,
        };
        if (byBot) {
          c.status = "resolved"; c.resolvedBy = "bot"; c.resolvedAt = at + (1 + r() * 4) * MIN;
          msgs.push({ id: id + "_3", role: "visitor", text: Core.phrase(lang, "yes"), at: at + 60000 });
          if (r() < 0.45) c.csat = pickW(r, [[5, 6], [4, 3], [3, 1], [2, 0.4], [1, 0.3]]);
          if (a) a.helpful = (a.helpful || 0) + 1;
        } else {
          c.status = d === 0 && r() < 0.3 ? "pending" : "resolved";
          c.escalatedAt = at + (1 + r() * 2) * MIN;
          const slow = weekend ? 3 : 1;
          const frt = Math.exp(Math.log(7 * slow) + (r() - 0.5) * 1.6) * MIN;
          c.firstHumanReplyAt = c.escalatedAt + frt;
          const ag = pick(r, SETTINGS.team);
          c.assignee = ag.id; c.assigneeName = ag.name;
          msgs.push({ id: id + "_3", role: "agent", text: AGENT_REPLY[intent], at: c.firstHumanReplyAt, author: ag.name });
          if (c.status === "resolved") {
            c.resolvedBy = "agent"; c.resolvedAt = c.firstHumanReplyAt + (5 + r() * 110) * MIN;
            if (r() < 0.55) c.csat = pickW(r, mood === "angry" ? [[5, 2], [4, 3], [3, 2], [2, 2], [1, 1]] : [[5, 5], [4, 3], [3, 1], [2, 0.5], [1, 0.4]]);
          }
          if (a && r() < 0.5) a.notHelpful = (a.notHelpful || 0) + 1;
        }
        if (a) a.views = (a.views || 0) + 1 + Math.floor(r() * 3);
        out[id] = c;
      }
    }
    return out;
  }

  /* ---------------- showcase conversations (the live inbox) ---------------- */

  function live(now) {
    const ago = (m) => now - m * MIN;
    const C = {};
    const add = (c) => { C[c.id] = Object.assign({ channel: "web", tags: [], priority: "normal" }, c); };
    add({
      id: "c_live_maya", createdAt: ago(14), updatedAt: ago(12), status: "open", lang: "en", intent: "billing", sentiment: "angry", priority: "urgent", escalatedAt: ago(13), handoffReason: "frustration", tags: ["billing-dispute"], unread: 2,
      visitor: { id: "v_maya", name: "Maya Chen", email: "maya.chen@example.com", country: "US", plan: "Business", page: "/billing", seats: 42 },
      messages: [
        { id: "m1", role: "visitor", text: "I was charged TWICE this month for our Business plan. Invoice INV-20931 and another one for $672. This is ridiculous, fix it now!!", at: ago(14) },
        { id: "m2", role: "bot", text: Core.phrase("en", "frustration") + " " + Core.phrase("en", "handoff", { eta: 8 }), at: ago(14) + 3000, meta: { kind: "handoff", source: "local" } },
        { id: "m3", role: "note", text: "Handoff — frustration detected\nIntent: Billing · Mood: angry · Language: EN\nAsked: “I was charged TWICE this month for our Business plan. Invoice INV-20931 and another one for $672. This is ridiculous, fix it now!!”\nBot tried: nothing (escalated immediately)\nDetected: INV-20931, $672\nPage: /billing", at: ago(14) + 3500, meta: { kind: "summary" } },
        { id: "m4", role: "visitor", text: "Hello?? We have 42 seats, I need this sorted before our finance close today.", at: ago(12) },
      ],
    });
    add({
      id: "c_live_lucas", createdAt: ago(31), updatedAt: ago(26), status: "open", lang: "es", intent: "billing", sentiment: "neutral", priority: "normal", escalatedAt: ago(27), handoffReason: "visitor_request", unread: 1,
      visitor: { id: "v_lucas", name: "Lucas Fernández", email: "lucas.fernandez@example.com", country: "ES", plan: "Team", page: "/settings/billing" },
      messages: [
        { id: "m1", role: "visitor", text: "Hola, necesito la factura de octubre con el número de IVA de mi empresa (B-87654321). ¿Dónde la descargo?", at: ago(31) },
        { id: "m2", role: "bot", text: KB[5].answer, at: ago(31) + 3000, meta: { kind: "answer", articles: ["kb_invoice"], confidence: 0.81, source: "local", ask: Core.phrase("es", "didItHelp") } },
        { id: "m3", role: "visitor", text: "Ya añadí el IVA pero la factura de octubre sigue sin él. ¿Podéis reemitirla?", at: ago(28) },
        { id: "m4", role: "bot", text: Core.phrase("es", "handoff", { eta: 8 }), at: ago(27), meta: { kind: "handoff", source: "local" } },
        { id: "m5", role: "note", text: "Handoff — customer clicked “talk to a person”\nIntent: Billing · Mood: neutral · Language: ES\nAsked: “Hola, necesito la factura de octubre con el número de IVA de mi empresa (B-87654321). ¿Dónde la descargo?”\nBot tried: article “Download invoices and add your VAT ID” (81% match)\nNeeds: re-issue October invoice with VAT ID", at: ago(27) + 500, meta: { kind: "summary" } },
      ],
    });
    add({
      id: "c_live_jonas", createdAt: ago(52), updatedAt: ago(40), status: "pending", lang: "de", intent: "technical", sentiment: "negative", priority: "high", escalatedAt: ago(48), firstHumanReplyAt: ago(41), assignee: "ag_sam", assigneeName: "Sam Okafor", tags: ["api"],
      visitor: { id: "v_jonas", name: "Jonas Weber", email: "jonas.weber@example.com", country: "DE", plan: "Business", page: "/docs/api" },
      messages: [
        { id: "m1", role: "visitor", text: "Wir bekommen seit heute Morgen ständig Fehler 429 von der API, obwohl wir kaum Anfragen schicken.", at: ago(52) },
        { id: "m2", role: "bot", text: KB[10].answer, at: ago(52) + 3000, meta: { kind: "answer", articles: ["kb_api"], confidence: 0.72, source: "local" } },
        { id: "m3", role: "visitor", text: "Das wissen wir. Wir liegen bei 40 Anfragen pro Minute. Bitte mit einem Menschen sprechen.", at: ago(49) },
        { id: "m4", role: "bot", text: Core.phrase("de", "humanAsk") + " " + Core.phrase("de", "handoff", { eta: 8 }), at: ago(48), meta: { kind: "handoff", source: "local" } },
        { id: "m5", role: "agent", text: "Hi Jonas, Sam here (sorry, replying in English!). I can see your token hitting a stale limit after last night's migration. I've asked engineering to reset it — will confirm shortly.", at: ago(41), author: "Sam Okafor" },
        { id: "m6", role: "note", text: "Pinged #eng-api — token tk_…91 still on the legacy 10 req/min bucket.", at: ago(40), author: "Sam Okafor" },
      ],
    });
    add({
      id: "c_live_priya", createdAt: ago(75), updatedAt: ago(70), status: "open", lang: "en", intent: "account", sentiment: "neutral", priority: "normal", escalatedAt: ago(71), handoffReason: "visitor_request", tags: ["sso", "lead"],
      visitor: { id: "v_priya", name: "Priya Nair", email: "priya.nair@example.com", country: "IN", plan: "Team", page: "/pricing", seats: 120 },
      messages: [
        { id: "m1", role: "visitor", text: "Do you support SAML SSO with Okta, including SCIM provisioning? We're evaluating for 120 people.", at: ago(75) },
        { id: "m2", role: "bot", text: Core.phrase("en", "notFound") + " " + Core.phrase("en", "offerHuman"), at: ago(75) + 3000, meta: { kind: "fallback", source: "local", articles: ["kb_plans"] } },
        { id: "m3", role: "visitor", text: Core.phrase("en", "noHuman"), at: ago(72) },
        { id: "m4", role: "bot", text: Core.phrase("en", "handoff", { eta: 8 }), at: ago(71), meta: { kind: "handoff", source: "local" } },
      ],
    });
    add({
      id: "c_live_sophie", createdAt: ago(4), updatedAt: ago(3), status: "bot", lang: "fr", intent: "technical", sentiment: "neutral",
      visitor: { id: "v_sophie", name: "Sophie Martin", email: "", country: "FR", plan: "Team", page: "/app/inbox" },
      messages: [
        { id: "m1", role: "visitor", text: "Bonjour, je ne reçois plus les notifications par email depuis ce matin", at: ago(4) },
        { id: "m2", role: "bot", text: Core.phrase("fr", "incident", { title: INCIDENTS[0].title, body: INCIDENTS[0].body }), at: ago(4) + 2500, meta: { kind: "incident", incident: "inc_eu_mail", source: "local" } },
        { id: "m3", role: "bot", text: KB[14].answer, at: ago(4) + 3000, meta: { kind: "answer", articles: ["kb_notifications"], confidence: 0.77, source: "local", ask: Core.phrase("fr", "didItHelp") } },
      ],
    });
    add({
      id: "c_live_tom", createdAt: ago(190), updatedAt: ago(120), status: "resolved", resolvedBy: "agent", resolvedAt: ago(120), lang: "en", intent: "technical", sentiment: "positive", escalatedAt: ago(188), firstHumanReplyAt: ago(183), csat: 5, assignee: "ag_lena", assigneeName: "Lena Park",
      visitor: { id: "v_tom", name: "Tom Becker", email: "tom.becker@example.com", country: "GB", plan: "Team", page: "/app" },
      messages: [
        { id: "m1", role: "visitor", text: "GitHub integration stopped syncing PRs to our board", at: ago(190) },
        { id: "m2", role: "bot", text: KB[11].answer, at: ago(190) + 3000, meta: { kind: "answer", articles: ["kb_integrations"], confidence: 0.79, source: "local" } },
        { id: "m3", role: "visitor", text: "Tried reconnecting, still nothing. Can someone look?", at: ago(189) },
        { id: "m4", role: "agent", text: "Hi Tom, Lena here. The GitHub app lost access to your org after a permissions change — I've re-sent the install request to your org owner.", at: ago(183), author: "Lena Park" },
        { id: "m5", role: "visitor", text: "That was it, thanks Lena!", at: ago(125) },
      ],
    });
    return C;
  }

  function workspace(now) {
    now = now || Date.now();
    const st = Core.emptyState("demo");
    st.settings = Core.clone(SETTINGS);
    st.kb = Core.clone(KB).map((a) => Object.assign({ lang: "en", status: "published", views: 0, helpful: 0, notHelpful: 0, updatedAt: now - 9 * DAY }, a));
    st.flows = Core.clone(FLOWS);
    st.macros = Core.clone(MACROS);
    st.incidents = Core.clone(INCIDENTS).map((i, n) => Object.assign(i, { createdAt: now - (n ? 3 * DAY : 50 * MIN) }));
    st.conversations = Object.assign(history(now, st.kb), live(now));
    st.gaps = [
      { q: "Do you offer a nonprofit discount?", count: 14 }, { q: "Can I self-host Acme Cloud?", count: 9 },
      { q: "Is there a Linux desktop app?", count: 7 }, { q: "Do you support SAML SSO with Okta and SCIM?", count: 5, convId: "c_live_priya" },
      { q: "Can I change the currency of my invoices to EUR?", count: 4 },
    ].map((g, i) => ({ id: "g_seed" + i, key: Core.tokens(g.q).sort().join(" "), q: g.q, count: g.count, firstAt: now - (20 - i) * DAY, lastAt: now - i * 5 * HOUR, convId: g.convId || null, status: "open" }));
    return st;
  }

  return { workspace, KB, FLOWS, MACROS, SETTINGS };
});
