/*!
 * Tickless core — the shared brain.
 * Runs in the browser (widget + console) and in Node (server), no dependencies.
 *
 *  - text pipeline: fold, phrases, multilingual glossary, stemmer
 *  - BM25 knowledge-base search with IDF-weighted confidence
 *  - language, intent, sentiment, entity detection, PII redaction
 *  - local bot brain (answers, troubleshooter offers, incidents, handoff)
 *  - op-log state machine (same applyOp on every client and on the server)
 *  - analytics
 *  - transports: localStorage + BroadcastChannel (demo) or HTTP + SSE (server)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TicklessCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = 1;
  const LANGS = ["en", "es", "fr", "de", "it", "pt"];
  const uid = (p) => (p || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ------------------------------------------------------------------ */
  /* Text pipeline                                                       */
  /* ------------------------------------------------------------------ */

  function fold(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "");
  }

  // Multi-word phrases collapsed into one canonical token before splitting.
  const PHRASES = [
    [/\b(log ?in|sign ?in|log on|logon)\b/g, " login "],
    [/\b(sign ?up)\b/g, " signup "],
    [/\bmoney back\b/g, " refund "],
    [/\b(two[- ]?factor|two[- ]?step|2[- ]?step|multi[- ]?factor)\b/g, " 2fa "],
    [/\b(credit|debit) card\b/g, " card "],
    [/\bmot de passe\b/g, " password "],
    [/\b(iniciar|inicio de) sesion\b/g, " login "],
    [/\bse connecter\b/g, " login "],
    [/\bfazer login\b/g, " login "],
    [/\brate ?limit(s|ed|ing)?\b/g, " ratelimit "],
    [/\btoo many requests\b/g, " ratelimit "],
    [/\bsingle sign[- ]?on\b/g, " sso "],
    [/\bdata residency\b/g, " residency "],
    [/\bdark mode\b/g, " darkmode "],
  ];

  // Glossary: any language / variant -> canonical English concept.
  const GLOSSARY = {};
  [
    ["password", "passwort contrasena senha mdp pwd passcode kennwort"],
    ["login", "signin anmelden anmeldung einloggen connexion accedere accesso acceso entrar acessar logar"],
    ["refund", "refunds reembolso remboursement rimborso erstattung ruckerstattung reembolsar rembourser rimborsare"],
    ["invoice", "invoices receipt receipts factura facturas facture factures fattura fatture rechnung rechnungen fatura faturas recibo quittung bill"],
    ["payment", "pay paid paying charge charged charges pago pagos pagamento paiement zahlung pagar payer bezahlen cobro cobrado addebito abbuchung"],
    ["twice", "double duplicate duplicated doppelt deux veces doppio duas"],
    ["cancel", "cancellation unsubscribe cancelar cancelacion annuler annulation annullare disdire disdetta kundigen kundigung cancelamento"],
    ["subscription", "abonnement suscripcion abbonamento assinatura abo"],
    ["slow", "lag laggy sluggish lento lenta lent lente langsam freeze freezing frozen loading"],
    ["delete", "remove erase eliminar borrar supprimer cancellare loschen excluir apagar"],
    ["export", "exportar exporter esportare exportieren backup"],
    ["account", "cuenta compte konto conta"],
    ["email", "mail emails correo courriel"],
    ["notification", "notifications alert alerts notificaciones notificacion benachrichtigung benachrichtigungen notifiche notifica notificacoes"],
    ["error", "bug bugs broken crash crashes fehler erreur errore erro falla"],
    ["price", "pricing prices cost costs precio precios prix prezzo prezzi preis preise preco"],
    ["security", "secure gdpr soc2 compliance privacy dsgvo rgpd hipaa encryption"],
    ["mobile", "ios android phone iphone smartphone movil cellulare handy celular"],
    ["sync", "syncing synchronize synchronise sincronizar sincronizzare synchronisieren"],
    ["card", "tarjeta carte carta karte cartao kreditkarte"],
    ["declined", "decline rejected refused rechazada rechazado refusee rifiutata abgelehnt recusado"],
    ["2fa", "mfa otp authenticator totp verification"],
    ["locked", "lock lockout blocked bloqueado bloquee bloccato gesperrt"],
    ["invite", "invitation invitar inviter invitare einladen convidar"],
    ["team", "teammate teammates colleague colleagues coworker equipo equipe squadra"],
    ["upgrade", "downgrade change switch cambiar changer cambiare wechseln mudar"],
    ["integration", "integrations integrate connect slack github drive zapier"],
    ["help", "ayuda aide aiuto hilfe ajuda"],
    ["forgot", "forget forgotten olvide olvidado oublie vergessen dimenticato esqueci"],
    ["download", "descargar descargo telecharger herunterladen scaricare scarico baixar baixo"],
    ["price", "costa cuesta coute kostet custa"],
    ["plan", "piano plano forfait tarif"],
  ].forEach(([canon, list]) => list.split(" ").forEach((w) => { GLOSSARY[w] = canon; }));

  const STOP = new Set((
    "a an the and or but if of to in on at for from by with about as is are was were be been am do does did " +
    "i me my we our you your it its this that these those there here what which who how when where why " +
    "can could would should will just please hi hello hey thanks thank so not no yes have has had get got " +
    "any some all more most very too also than then them they he she his her us im ive id youre dont doesnt " +
    "el la los las de del que y en un una mi mis es por para con como se lo al su " +
    "le les des et je ne pas mon ma est une pour avec du au vous " +
    "der die das und ich nicht mein meine ist ein eine mit fur wie zu den dem es " +
    "il di che non mio mia sono per con come gli lo " +
    "o os da do nao meu minha uma com voce " +
    "cant cannot unable wont doesnt didnt isnt problem issue working work help need want getting today now " +
    "super really very still again donde cuando quiero necesito puedo tengo he ou quand ai wo wann habe hat haben " +
    "dove quando ho onde tenho quanto cuanto combien wieviel"
  ).split(" "));

  function stem(w) {
    if (w.length <= 3 || /\d/.test(w)) return w;
    if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
    if (w.endsWith("sses")) w = w.slice(0, -2);
    else if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) w = w.slice(0, -1);
    for (const suf of ["ation", "ment", "ing", "ed", "ly"]) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length); break; }
    }
    if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
    if (/([bcdfgklmnprt])\1$/.test(w)) w = w.slice(0, -1);
    return w;
  }

  function tokens(text, keepStop) {
    let s = " " + fold(text) + " ";
    for (const [re, rep] of PHRASES) s = s.replace(re, rep);
    const raw = s.match(/[a-z0-9]+/g) || [];
    const out = [];
    for (const w of raw) {
      const canon = GLOSSARY[w] || w;
      if (!keepStop && STOP.has(canon)) continue;
      out.push(stem(canon));
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Knowledge-base search (BM25)                                        */
  /* ------------------------------------------------------------------ */

  const FIELD_WEIGHT = { title: 3, questions: 2.2, tags: 2, answer: 1.4, body: 1 };

  function docTerms(a) {
    const tf = new Map();
    let len = 0;
    const add = (text, w) => {
      for (const t of tokens(text)) { tf.set(t, (tf.get(t) || 0) + w); len += w; }
    };
    add(a.title, FIELD_WEIGHT.title);
    add((a.questions || []).join(" . "), FIELD_WEIGHT.questions);
    add((a.tags || []).join(" "), FIELD_WEIGHT.tags);
    add(a.answer, FIELD_WEIGHT.answer);
    add(a.body, FIELD_WEIGHT.body);
    return { tf, len };
  }

  const indexCache = new WeakMap();
  function buildIndex(kb) {
    const cached = indexCache.get(kb);
    if (cached) return cached;
    const docs = kb.filter((a) => a.status !== "draft").map((a) => ({ a, ...docTerms(a) }));
    const df = new Map();
    for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    const avg = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
    const N = docs.length;
    const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
    const idx = { docs, idf, avg, maxIdf: Math.log(1 + (N + 0.5) / 0.5) };
    indexCache.set(kb, idx);
    return idx;
  }

  /** Returns [{article, score, confidence, matched:[terms]}] best first. */
  function searchKB(kb, query, limit) {
    const q = [...new Set(tokens(query))];
    if (!q.length || !kb || !kb.length) return [];
    const idx = buildIndex(kb);
    const k1 = 1.4, b = 0.7;
    const totalIdf = q.reduce((s, t) => s + (idx.idf(t) || idx.maxIdf), 0);
    const res = [];
    for (const d of idx.docs) {
      let score = 0, hitIdf = 0;
      const matched = [];
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = idx.idf(t);
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / idx.avg));
        hitIdf += idf;
        matched.push(t);
      }
      if (!score) continue;
      const titleHit = tokens(d.a.title).some((t) => q.includes(t)) ? 0.08 : 0;
      const coverage = hitIdf / totalIdf;
      res.push({ article: d.a, score, matched, confidence: clamp(coverage * 0.92 + titleHit, 0, 1) });
    }
    res.sort((x, y) => y.score - x.score);
    // Confidence also reflects how clearly the winner beats the runner-up.
    if (res.length > 1) {
      const margin = (res[0].score - res[1].score) / res[0].score;
      res[0].confidence = clamp(res[0].confidence * (0.85 + 0.3 * margin), 0, 1);
    }
    return res.slice(0, limit || 5);
  }

  /* ------------------------------------------------------------------ */
  /* Language, intent, sentiment, entities, PII                          */
  /* ------------------------------------------------------------------ */

  const LANG_WORDS = {
    en: "the is and to my i you it can not how what do does with for this that have cant dont please hello thanks charged",
    es: "el los las que y mi no puedo como por para una es con hola gracias quiero necesito donde esta cuenta factura",
    fr: "le les et je ne pas mon ma est une pour avec bonjour merci comment vous suis mes compte facture",
    de: "der die das und ich nicht mein meine ist ein eine mit fur wie hallo danke kann bitte wir seit konto",
    it: "il di che non mio mia sono una per con come ciao grazie posso voglio perche gli ho account",
    pt: "o os que nao meu minha uma para com como ola obrigado obrigada posso quero voce estou conta",
  };
  const LANG_SETS = Object.fromEntries(Object.entries(LANG_WORDS).map(([k, v]) => [k, new Set(v.split(" "))]));

  function detectLanguage(text, fallback) {
    const raw = String(text || "").toLowerCase();
    const ws = fold(text).match(/[a-z]+/g) || [];
    const score = { en: 0, es: 0, fr: 0, de: 0, it: 0, pt: 0 };
    for (const w of ws) for (const l of LANGS) if (LANG_SETS[l].has(w)) score[l] += 1;
    if (/[ñ¿¡]/.test(raw)) score.es += 2;
    if (/[ãõ]|ção|ções/.test(raw)) score.pt += 2;
    if (/[ßäöü]/.test(raw)) score.de += 2;
    if (/[êâîôûœ]|ç(?![ãõa])/.test(raw)) score.fr += 1.5;
    if (/\b(perché|più|può|è)\b/.test(raw)) score.it += 2;
    let best = fallback || "en", top = 0;
    for (const l of LANGS) if (score[l] > top) { top = score[l]; best = l; }
    if (ws.length < 3 && top < 2 && fallback) return fallback;
    return best;
  }

  const INTENTS = {
    cancellation: "cancel delet close",
    billing: "invoice payment card refund billing vat bill twice declin subscription",
    account: "password login 2fa lock account sso email profil",
    technical: "error slow api ratelimit sync notification integration export import crash webhook mobile load",
    sales: "price plan upgrad demo enterpris discount quote trial seat",
    privacy: "security residency gdpr dpa data",
  };
  const INTENT_SETS = Object.fromEntries(Object.entries(INTENTS).map(([k, v]) => [k, new Set(v.split(" ").map(stem))]));
  const INTENT_LABEL = {
    billing: "Billing", account: "Account & login", technical: "Technical", cancellation: "Cancellation",
    sales: "Plans & sales", privacy: "Privacy & security", other: "Other",
  };

  const HUMAN_RE = new RegExp([
    "\\b(talk|speak|chat|connect|transfer)\\b.{0,24}\\b(human|person|agent|someone|somebody|representative|rep|support|team|operator)\\b",
    "^(human|agent|operator|representative|person)\\b",
    "\\breal (person|human)\\b", "\\bcustomer service\\b",
    "\\b(hablar con|quiero hablar)\\b.{0,20}\\b(persona|humano|agente|alguien)\\b",
    "\\b(parler a|parler avec)\\b.{0,20}\\b(humain|personne|conseiller|agent)\\b",
    "\\b(mit einem|mit einer)\\b.{0,20}\\b(mensch|menschen|mitarbeiter|mitarbeiterin)\\b",
    "\\b(parlare con)\\b.{0,20}\\b(persona|operatore|umano)\\b",
    "\\b(falar com)\\b.{0,20}\\b(pessoa|humano|atendente)\\b",
  ].join("|"));
  const GREET_RE = /^(hi|hello|hey|hiya|yo|hola|bonjour|salut|hallo|servus|ciao|ola|oi|good (morning|afternoon|evening)|buenos dias|buongiorno|bom dia)\b/;
  const THANKS_RE = /\b(thanks|thank you|thx|ty|cheers|gracias|merci|danke|grazie|obrigad[oa]|that worked|it worked|solved|perfect)\b/;

  function detectIntent(text) {
    const f = fold(text).trim();
    if (HUMAN_RE.test(f)) return "human";
    const toks = tokens(text);
    if (toks.length <= 2 && GREET_RE.test(f)) return "greeting";
    if (toks.length <= 4 && THANKS_RE.test(f)) return "thanks";
    let best = "other", top = 0;
    for (const [k, set] of Object.entries(INTENT_SETS)) {
      const n = toks.filter((t) => set.has(t)).length;
      if (n > top) { top = n; best = k; }
    }
    return best;
  }

  const NEG = {};
  ("angry:2 furious:3 terrible:2 awful:2 worst:3 useless:2 ridiculous:2 scam:3 fraud:3 unacceptable:3 frustrated:2 " +
   "frustrating:2 annoyed:2 annoying:2 disappointed:2 horrible:2 hate:2 still:1 again:1 lawyer:3 chargeback:3 " +
   "never:1 wtf:3 joke:1 waste:2 garbage:3 nobody:1 pathetic:3 incompetent:3 sucks:2 " +
   "pesimo:2 horrible:2 inaceptable:3 estafa:3 harto:2 nul:2 inadmissible:3 arnaque:3 marre:2 " +
   "schrecklich:2 unverschamt:3 betrug:3 katastrophe:2 inaccettabile:3 vergogna:3 truffa:3 schifo:3 " +
   "pessimo:2 absurdo:2 golpe:2 ridicule:2 lamentable:2").split(" ").forEach((p) => { const [w, n] = p.split(":"); NEG[w] = +n; });
  const POS = new Set("thanks thank great awesome love perfect helpful amazing excellent nice cool brilliant gracias genial merci parfait danke toll grazie perfetto obrigado otimo".split(" "));

  function sentiment(text) {
    const raw = String(text || "");
    const ws = fold(raw).match(/[a-z]+/g) || [];
    let neg = 0, pos = 0;
    for (const w of ws) { if (NEG[w]) neg += NEG[w]; if (POS.has(w)) pos += 1; }
    const letters = raw.replace(/[^A-Za-z]/g, "");
    const caps = letters.length > 10 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6;
    if (caps) neg += 2;
    if (/!{2,}/.test(raw)) neg += neg > 0 ? 1.5 : 0.5;
    const score = pos - neg;
    let label = "neutral";
    if (neg >= 4 || (neg >= 3 && caps)) label = "angry";
    else if (score < 0) label = "negative";
    else if (score > 0) label = "positive";
    return { score, label, frustrated: label === "angry" || neg >= 3 };
  }

  function luhn(num) {
    let sum = 0, dbl = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  /** Masks card numbers and "password is X" before anything is stored. */
  function redactPII(text) {
    let hits = 0;
    let out = String(text || "").replace(/\b\d(?:[ -]?\d){12,18}\b/g, (m) => {
      const digits = m.replace(/\D/g, "");
      if (digits.length < 13 || !luhn(digits)) return m;
      hits++;
      return "•••• •••• •••• " + digits.slice(-4);
    });
    out = out.replace(/\b(password|passwort|contrase[ñn]a|mot de passe|senha)(\s+(is|ist|es|est|e|é)|\s*[:=])\s*(\S+)/gi, (m, w, sep) => {
      hits++;
      return w + sep + " ••••••";
    });
    return { text: out, redacted: hits };
  }

  function entities(text) {
    const s = String(text || "");
    const out = [];
    const push = (type, value) => { if (!out.some((e) => e.value === value)) out.push({ type, value }); };
    for (const m of s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []) push("email", m);
    for (const m of s.match(/\b(?:INV|ORD|ORDER|TCK)-?\d{3,}\b/gi) || []) push("reference", m.toUpperCase());
    for (const m of s.match(/#\d{4,}\b/g) || []) push("reference", m);
    for (const m of s.match(/(?:[$€£]\s?\d+(?:[.,]\d+)*|\d+(?:[.,]\d+)*\s?(?:USD|EUR|GBP|€))/g) || []) push("amount", m.trim());
    for (const m of s.match(/\b(?:error|fehler|erreur|errore|code)\s*:?\s*([1-5]\d\d|\d{4})\b|\b(4\d\d|5\d\d)\b(?=\s|$|[.,!?])/gi) || []) push("error", m.trim());
    for (const m of s.match(/https?:\/\/[^\s)]+/g) || []) push("url", m);
    for (const m of s.match(/\b(chrome|firefox|safari|edge|windows|macos|mac|linux|android|ios|iphone)\b/gi) || []) push("device", m.toLowerCase());
    return out;
  }

  function analyze(text, prevLang) {
    return {
      lang: detectLanguage(text, prevLang),
      intent: detectIntent(text),
      sentiment: sentiment(text),
      entities: entities(text),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Bot phrases (6 languages)                                           */
  /* ------------------------------------------------------------------ */

  const PHR = {
    en: {
      greet: "Hi{name}! I'm {bot}, {brand}'s assistant. Ask me anything — I can also fix common problems with you step by step.",
      hello: "Hello! What can I help you with today?",
      didItHelp: "Did this solve it?",
      yes: "Yes, solved", noHuman: "No, talk to a person", rephrase: "I'll rephrase",
      glad: "Glad I could help! Anything else?", gladShort: "Happy to help!",
      notFound: "I'm not sure about that one and I'd rather not guess.",
      offerHuman: "Want me to connect you with someone from the team? They'll see this whole conversation.",
      handoff: "I'm passing this to the team with a summary, so you won't have to repeat yourself. Typical reply time: about {eta} min.",
      handoffOffline: "The team is offline right now (back {when}). Leave your email and we'll reply there — this conversation is saved.",
      frustration: "I'm really sorry this has been frustrating. I'm getting a person on it right now.",
      flowOffer: "I can also walk you through a quick fix:",
      start: "Fix it: {name}", fixed: "It's fixed", notFixed: "Still not working",
      incident: "Heads up — we're aware of an ongoing issue: **{title}**. {body}",
      emailSaved: "Thanks! We'll reply to {email}.",
      topics: "Popular topics",
      also: "These might also help:",
      humanAsk: "Sure — connecting you with a person.",
      maxTurns: "I don't want to keep you going in circles.",
    },
    es: {
      greet: "¡Hola{name}! Soy {bot}, el asistente de {brand}. Pregúntame lo que quieras — también puedo ayudarte a resolver problemas paso a paso.",
      hello: "¡Hola! ¿En qué puedo ayudarte hoy?",
      didItHelp: "¿Esto lo ha resuelto?",
      yes: "Sí, resuelto", noHuman: "No, hablar con una persona", rephrase: "Lo diré de otra forma",
      glad: "¡Me alegra haber ayudado! ¿Algo más?", gladShort: "¡Encantado de ayudar!",
      notFound: "No estoy seguro de eso y prefiero no adivinar.",
      offerHuman: "¿Quieres que te ponga en contacto con alguien del equipo? Verán toda esta conversación.",
      handoff: "Paso esto al equipo con un resumen, así no tendrás que repetirte. Tiempo de respuesta habitual: unos {eta} min.",
      handoffOffline: "El equipo no está disponible ahora (vuelve {when}). Déjanos tu email y te responderemos allí — la conversación queda guardada.",
      frustration: "Siento mucho que esto haya sido tan frustrante. Ahora mismo te paso con una persona.",
      flowOffer: "También puedo guiarte en una solución rápida:",
      start: "Resolver: {name}", fixed: "Ya funciona", notFixed: "Sigue sin funcionar",
      incident: "Aviso — estamos al tanto de una incidencia en curso: **{title}**. {body}",
      emailSaved: "¡Gracias! Te responderemos en {email}.",
      topics: "Temas populares", also: "Esto también puede ayudarte:",
      humanAsk: "Claro — te paso con una persona.", maxTurns: "No quiero hacerte dar vueltas.",
    },
    fr: {
      greet: "Bonjour{name} ! Je suis {bot}, l'assistant de {brand}. Posez-moi vos questions — je peux aussi résoudre les problèmes courants avec vous, étape par étape.",
      hello: "Bonjour ! Comment puis-je vous aider ?",
      didItHelp: "Est-ce que cela a résolu le problème ?",
      yes: "Oui, résolu", noHuman: "Non, parler à quelqu'un", rephrase: "Je reformule",
      glad: "Ravi d'avoir pu aider ! Autre chose ?", gladShort: "Avec plaisir !",
      notFound: "Je ne suis pas sûr de la réponse et je préfère ne pas deviner.",
      offerHuman: "Voulez-vous que je vous mette en relation avec l'équipe ? Elle verra toute la conversation.",
      handoff: "Je transmets à l'équipe avec un résumé, vous n'aurez pas à vous répéter. Délai de réponse habituel : environ {eta} min.",
      handoffOffline: "L'équipe est hors ligne (retour {when}). Laissez votre e-mail et nous vous répondrons — la conversation est enregistrée.",
      frustration: "Je suis vraiment désolé pour ce désagrément. Je fais intervenir une personne tout de suite.",
      flowOffer: "Je peux aussi vous guider vers une solution rapide :",
      start: "Résoudre : {name}", fixed: "C'est réglé", notFixed: "Ça ne marche toujours pas",
      incident: "Info — nous avons connaissance d'un incident en cours : **{title}**. {body}",
      emailSaved: "Merci ! Nous répondrons à {email}.",
      topics: "Sujets fréquents", also: "Ceci peut aussi aider :",
      humanAsk: "Bien sûr — je vous mets en relation.", maxTurns: "Je ne veux pas vous faire tourner en rond.",
    },
    de: {
      greet: "Hallo{name}! Ich bin {bot}, der Assistent von {brand}. Frag mich alles — ich löse häufige Probleme auch Schritt für Schritt mit dir.",
      hello: "Hallo! Wobei kann ich helfen?",
      didItHelp: "Hat das das Problem gelöst?",
      yes: "Ja, gelöst", noHuman: "Nein, mit einem Menschen sprechen", rephrase: "Ich formuliere neu",
      glad: "Freut mich, dass ich helfen konnte! Sonst noch etwas?", gladShort: "Gern geschehen!",
      notFound: "Da bin ich mir nicht sicher und rate lieber nicht.",
      offerHuman: "Soll ich dich mit dem Team verbinden? Es sieht den gesamten Verlauf.",
      handoff: "Ich gebe das mit einer Zusammenfassung ans Team weiter, du musst nichts wiederholen. Übliche Antwortzeit: ca. {eta} Min.",
      handoffOffline: "Das Team ist gerade offline (zurück {when}). Hinterlasse deine E-Mail, wir antworten dort — der Verlauf ist gespeichert.",
      frustration: "Es tut mir wirklich leid, dass das so frustrierend war. Ich hole sofort einen Menschen dazu.",
      flowOffer: "Ich kann dich auch durch eine schnelle Lösung führen:",
      start: "Lösen: {name}", fixed: "Funktioniert wieder", notFixed: "Geht immer noch nicht",
      incident: "Hinweis — uns ist eine laufende Störung bekannt: **{title}**. {body}",
      emailSaved: "Danke! Wir antworten an {email}.",
      topics: "Beliebte Themen", also: "Das könnte auch helfen:",
      humanAsk: "Klar — ich verbinde dich mit einem Menschen.", maxTurns: "Ich will dich nicht im Kreis schicken.",
    },
    it: {
      greet: "Ciao{name}! Sono {bot}, l'assistente di {brand}. Chiedimi qualsiasi cosa — posso anche risolvere con te i problemi più comuni, passo dopo passo.",
      hello: "Ciao! Come posso aiutarti oggi?",
      didItHelp: "Ha risolto il problema?",
      yes: "Sì, risolto", noHuman: "No, parlare con una persona", rephrase: "Riformulo",
      glad: "Felice di averti aiutato! Altro?", gladShort: "Con piacere!",
      notFound: "Su questo non sono sicuro e preferisco non tirare a indovinare.",
      offerHuman: "Vuoi che ti metta in contatto con qualcuno del team? Vedrà tutta la conversazione.",
      handoff: "Passo tutto al team con un riepilogo, così non dovrai ripeterti. Tempo di risposta tipico: circa {eta} min.",
      handoffOffline: "Il team ora è offline (torna {when}). Lasciaci la tua email e ti risponderemo lì — la conversazione è salvata.",
      frustration: "Mi dispiace davvero per il disagio. Faccio intervenire subito una persona.",
      flowOffer: "Posso anche guidarti in una soluzione rapida:",
      start: "Risolvi: {name}", fixed: "Ora funziona", notFixed: "Non funziona ancora",
      incident: "Avviso — siamo al corrente di un problema in corso: **{title}**. {body}",
      emailSaved: "Grazie! Ti risponderemo a {email}.",
      topics: "Argomenti frequenti", also: "Potrebbe esserti utile anche:",
      humanAsk: "Certo — ti metto in contatto con una persona.", maxTurns: "Non voglio farti girare in tondo.",
    },
    pt: {
      greet: "Olá{name}! Sou {bot}, o assistente da {brand}. Pergunte o que quiser — também posso resolver problemas comuns com você, passo a passo.",
      hello: "Olá! Como posso ajudar hoje?",
      didItHelp: "Isso resolveu?",
      yes: "Sim, resolvido", noHuman: "Não, falar com uma pessoa", rephrase: "Vou reformular",
      glad: "Que bom que ajudei! Mais alguma coisa?", gladShort: "Com prazer!",
      notFound: "Não tenho certeza sobre isso e prefiro não chutar.",
      offerHuman: "Quer que eu chame alguém da equipe? Eles verão toda esta conversa.",
      handoff: "Estou passando para a equipe com um resumo, você não vai precisar repetir nada. Tempo de resposta típico: cerca de {eta} min.",
      handoffOffline: "A equipe está offline agora (volta {when}). Deixe seu email e responderemos por lá — a conversa fica salva.",
      frustration: "Sinto muito pela frustração. Vou chamar uma pessoa agora mesmo.",
      flowOffer: "Também posso guiar você numa solução rápida:",
      start: "Resolver: {name}", fixed: "Resolvido", notFixed: "Continua sem funcionar",
      incident: "Aviso — estamos cientes de um problema em andamento: **{title}**. {body}",
      emailSaved: "Obrigado! Responderemos para {email}.",
      topics: "Assuntos populares", also: "Isto também pode ajudar:",
      humanAsk: "Claro — vou chamar uma pessoa.", maxTurns: "Não quero deixar você andando em círculos.",
    },
  };

  function phrase(lang, key, vars) {
    const table = PHR[lang] || PHR.en;
    let s = table[key] != null ? table[key] : PHR.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : ""));
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Business hours                                                      */
  /* ------------------------------------------------------------------ */

  function zonedParts(date, tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
      const get = (t) => (parts.find((p) => p.type === t) || {}).value;
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
      return { day, minutes: (+get("hour") % 24) * 60 + +get("minute") };
    } catch (e) {
      return { day: date.getUTCDay(), minutes: date.getUTCHours() * 60 + date.getUTCMinutes() };
    }
  }
  const hm = (s) => { const [h, m] = String(s || "0:0").split(":"); return +h * 60 + (+m || 0); };

  function isOpen(hours, date) {
    if (!hours || hours.always) return true;
    const p = zonedParts(date || new Date(), hours.tz);
    return (hours.days || []).includes(p.day) && p.minutes >= hm(hours.start) && p.minutes < hm(hours.end);
  }

  function nextOpenLabel(hours, lang) {
    const names = { en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
    const p = zonedParts(new Date(), hours.tz);
    for (let i = 0; i < 8; i++) {
      const d = (p.day + i) % 7;
      if (!(hours.days || []).includes(d)) continue;
      if (i === 0 && p.minutes >= hm(hours.end)) continue;
      const when = i === 0 ? "today" : i === 1 ? "tomorrow" : names.en[d];
      return `${when} ${hours.start} (${hours.tz})`;
    }
    return hours.start;
  }

  /* ------------------------------------------------------------------ */
  /* Local bot brain                                                     */
  /* ------------------------------------------------------------------ */

  function flowMatch(flows, query) {
    const q = new Set(tokens(query));
    let best = null, top = 0;
    for (const f of flows || []) {
      if (f.enabled === false) continue;
      const trig = new Set(tokens((f.triggers || []).join(" ")));
      let n = 0;
      for (const t of q) if (trig.has(t)) n++;
      if (n > top) { top = n; best = f; }
    }
    return top >= 1 ? { flow: best, hits: top } : null;
  }

  function incidentMatch(incidents, query) {
    const q = new Set(tokens(query));
    return (incidents || []).find((i) => i.active && tokens((i.keywords || []).join(" ") + " " + i.title).some((t) => q.has(t))) || null;
  }

  function botTurns(conv) {
    let n = 0;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      const m = conv.messages[i];
      if (m.role === "agent") break;
      if (m.role === "bot" && m.meta && m.meta.kind === "fallback") n++;
    }
    return n;
  }

  function topicReplies(state, lang) {
    return (state.settings.quickTopics || []).slice(0, 4).map((t) => ({ label: t.label, action: "send", value: t.query || t.label }));
  }

  /**
   * Decide what the bot says. Pure: returns messages + patches, never mutates.
   * opts.forceHuman: visitor clicked "talk to a person".
   */
  function respond(state, conv, text, opts) {
    opts = opts || {};
    const s = state.settings;
    const prevLang = conv.lang || null;
    const a = analyze(text, prevLang);
    const lang = s.languages && s.languages.includes(a.lang) ? a.lang : (prevLang || s.defaultLang || "en");
    const P = (k, v) => phrase(lang, k, v);
    const out = { messages: [], patch: { lang, intent: a.intent !== "greeting" && a.intent !== "thanks" ? a.intent : conv.intent || a.intent, sentiment: a.sentiment.label }, gaps: [], handoff: null, analysis: a };
    const bot = (text, meta) => out.messages.push({ id: uid("m_"), role: "bot", text, at: Date.now(), meta: Object.assign({ source: "local" }, meta) });

    const handoff = (reason, lead) => {
      out.handoff = { reason, priority: a.sentiment.label === "angry" ? "urgent" : a.sentiment.frustrated || a.intent === "billing" ? "high" : "normal" };
      const open = isOpen(s.hours);
      const msg = open ? P("handoff", { eta: (s.handoff && s.handoff.etaMinutes) || 10 }) : P("handoffOffline", { when: nextOpenLabel(s.hours, lang) });
      bot((lead ? lead + " " : "") + msg, { kind: open ? "handoff" : "offline", askEmail: !open && !(conv.visitor && conv.visitor.email) });
      return out;
    };

    if (opts.forceHuman || a.intent === "human") return handoff(opts.forceHuman ? "visitor_request" : "asked_for_human", P("humanAsk"));
    if (a.sentiment.frustrated && s.handoff && s.handoff.onFrustration) return handoff("frustration", P("frustration"));
    if (a.intent === "greeting") { bot(P("hello"), { kind: "greeting", quick: topicReplies(state, lang) }); return out; }
    if (a.intent === "thanks") { bot(P("glad"), { kind: "thanks" }); return out; }

    const inc = incidentMatch(state.incidents, text);
    if (inc) bot(P("incident", { title: inc.title, body: inc.body }), { kind: "incident", incident: inc.id });

    const results = searchKB(state.kb, text, 3);
    const threshold = (s.bot && s.bot.threshold) || 0.45;
    const fm = flowMatch(state.flows, text);
    const top = results[0];

    if (top && top.confidence >= threshold) {
      const quick = [{ label: P("yes"), action: "resolve" }, { label: P("noHuman"), action: "handoff" }];
      if (fm) quick.unshift({ label: P("start", { name: fm.flow.name }), action: "flow", value: fm.flow.id });
      const extra = results.slice(1).filter((r) => r.confidence >= threshold * 0.8 && r.score > top.score * 0.6).map((r) => r.article.id);
      bot(top.article.answer || top.article.title, {
        kind: "answer", articles: [top.article.id].concat(extra.slice(0, 1)), confidence: +top.confidence.toFixed(2),
        quick, ask: P("didItHelp"),
      });
      return out;
    }
    if (fm) {
      bot(P("flowOffer"), { kind: "flow-offer", quick: [{ label: P("start", { name: fm.flow.name }), action: "flow", value: fm.flow.id }, { label: P("noHuman"), action: "handoff" }] });
      return out;
    }
    if (inc) return out;

    // Not confident: never bluff. Record the content gap, offer a person.
    out.gaps.push(text);
    const lead = botTurns(conv) >= ((s.handoff && s.handoff.maxFallbacks) || 2) ? P("maxTurns") + " " : "";
    const quick = [{ label: P("noHuman"), action: "handoff" }, { label: P("rephrase"), action: "focus" }];
    const weak = results.filter((r) => r.confidence >= threshold * 0.5).map((r) => r.article.id).slice(0, 2);
    bot(lead + P("notFound") + " " + P("offerHuman"), { kind: "fallback", quick, articles: weak, confidence: top ? +top.confidence.toFixed(2) : 0, alsoLabel: weak.length ? P("also") : null });
    return out;
  }

  /** The note an agent sees on escalation: nobody asks the customer to repeat. */
  function handoffSummary(state, conv, reason) {
    const vis = conv.messages.filter((m) => m.role === "visitor");
    const first = vis[0] ? vis[0].text : "";
    const tried = [];
    for (const m of conv.messages) {
      if (m.role !== "bot" || !m.meta) continue;
      if (m.meta.articles && m.meta.articles.length && m.meta.kind === "answer") {
        const art = state.kb.find((x) => x.id === m.meta.articles[0]);
        if (art) tried.push(`article “${art.title}” (${Math.round((m.meta.confidence || 0) * 100)}% match)`);
      }
    }
    if (conv.flow && conv.flow.id) {
      const f = state.flows.find((x) => x.id === conv.flow.id);
      if (f) {
        const steps = (conv.flow.path || []).map((p) => p.label).filter(Boolean);
        tried.push(`troubleshooter “${f.name}”${steps.length ? ": " + steps.join(" → ") : ""}`);
      }
    }
    const ents = [];
    for (const m of vis) for (const e of entities(m.text)) if (!ents.some((x) => x.value === e.value)) ents.push(e);
    const reasons = { frustration: "frustration detected", asked_for_human: "customer asked for a person", visitor_request: "customer clicked “talk to a person”", flow: "troubleshooter could not fix it", ai: "AI flagged for a human" };
    const lines = [
      `Handoff — ${reasons[reason] || reason}`,
      `Intent: ${INTENT_LABEL[conv.intent] || conv.intent || "—"} · Mood: ${conv.sentiment || "neutral"} · Language: ${(conv.lang || "en").toUpperCase()}`,
      first ? `Asked: “${first.slice(0, 220)}”` : "",
      tried.length ? `Bot tried: ${tried.join("; ")}` : "Bot tried: nothing matched",
      ents.length ? `Detected: ${ents.map((e) => e.value).join(", ")}` : "",
      conv.visitor && conv.visitor.page ? `Page: ${conv.visitor.page}` : "",
    ];
    return lines.filter(Boolean).join("\n");
  }

  /* ------------------------------------------------------------------ */
  /* Markdown-lite (safe)                                                */
  /* ------------------------------------------------------------------ */

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^\s)]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function md(text) {
    const lines = String(text || "").split(/\r?\n/);
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const line of lines) {
      const ul = line.match(/^\s*[-*]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/);
      if (ul || ol) {
        const tag = ul ? "ul" : "ol";
        if (list !== tag) { close(); html += `<${tag}>`; list = tag; }
        html += `<li>${inline((ul || ol)[1])}</li>`;
      } else if (!line.trim()) close();
      else { close(); html += `<p>${inline(line)}</p>`; }
    }
    close();
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* State machine                                                       */
  /* ------------------------------------------------------------------ */

  function emptyState(id) {
    return { v: VERSION, id: id || "demo", settings: {}, kb: [], flows: [], macros: [], incidents: [], conversations: {}, gaps: [], rev: 0 };
  }

  const EPHEMERAL = new Set(["typing", "presence"]);

  function upsert(list, item) {
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = Object.assign({}, list[i], item);
    else list.push(item);
  }

  function mergeSettings(dst, patch) {
    for (const [k, v] of Object.entries(patch || {})) {
      if (v && typeof v === "object" && !Array.isArray(v) && dst[k] && typeof dst[k] === "object" && !Array.isArray(dst[k])) dst[k] = Object.assign({}, dst[k], v);
      else dst[k] = v;
    }
  }

  /** Mutates and returns state. Every client and the server run exactly this. */
  function applyOp(state, op) {
    if (!op || EPHEMERAL.has(op.t)) return state;
    const C = state.conversations;
    switch (op.t) {
      case "reset": return Object.assign(state, clone(op.state));
      case "conv.create":
        if (!C[op.conv.id]) C[op.conv.id] = Object.assign({ messages: [], tags: [], status: "bot", priority: "normal", createdAt: op.at || Date.now() }, op.conv);
        break;
      case "msg.add": {
        const c = C[op.convId];
        if (!c || c.messages.some((m) => m.id === op.msg.id)) break;
        c.messages.push(op.msg);
        c.updatedAt = op.msg.at;
        if (op.msg.role === "visitor") {
          c.unread = (c.unread || 0) + 1;
          if (c.status === "pending") c.status = "open"; // customer replied: back in the team's queue
        }
        if (op.msg.role === "agent" && !c.firstHumanReplyAt) c.firstHumanReplyAt = op.msg.at;
        break;
      }
      case "conv.update": {
        const c = C[op.convId];
        if (c) Object.assign(c, op.patch, { updatedAt: op.at || Date.now() });
        break;
      }
      case "conv.delete": delete C[op.convId]; break;
      case "kb.upsert": upsert(state.kb, op.item); break;
      case "kb.delete": state.kb = state.kb.filter((x) => x.id !== op.id); break;
      case "kb.view": { const a = state.kb.find((x) => x.id === op.id); if (a) a.views = (a.views || 0) + 1; break; }
      case "kb.feedback": { const a = state.kb.find((x) => x.id === op.id); if (a) a[op.helpful ? "helpful" : "notHelpful"] = (a[op.helpful ? "helpful" : "notHelpful"] || 0) + 1; break; }
      case "flow.upsert": upsert(state.flows, op.item); break;
      case "flow.delete": state.flows = state.flows.filter((x) => x.id !== op.id); break;
      case "flow.stat": {
        const f = state.flows.find((x) => x.id === op.id);
        if (f) { f.stats = f.stats || {}; f.stats[op.key] = (f.stats[op.key] || 0) + 1; }
        break;
      }
      case "macro.upsert": upsert(state.macros, op.item); break;
      case "macro.delete": state.macros = state.macros.filter((x) => x.id !== op.id); break;
      case "incident.upsert": upsert(state.incidents, op.item); break;
      case "incident.delete": state.incidents = state.incidents.filter((x) => x.id !== op.id); break;
      case "settings.update": mergeSettings(state.settings, op.patch); break;
      case "gap.add": {
        const key = tokens(op.q).sort().join(" ");
        const g = state.gaps.find((x) => x.key === key && x.status === "open");
        if (g) { g.count++; g.lastAt = op.at; g.convId = op.convId || g.convId; }
        else state.gaps.push({ id: op.id || uid("g_"), key, q: op.q, count: 1, firstAt: op.at, lastAt: op.at, convId: op.convId, status: "open" });
        break;
      }
      case "gap.update": { const g = state.gaps.find((x) => x.id === op.id); if (g) Object.assign(g, op.patch); break; }
      default: break;
    }
    state.rev = (state.rev || 0) + 1;
    return state;
  }

  /** What a widget may see of a conversation: no internal notes, no tags. */
  function publicConversation(c) {
    if (!c) return null;
    return {
      id: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt, status: c.status, lang: c.lang, csat: c.csat, visitor: c.visitor,
      flow: c.flow, resolvedBy: c.resolvedBy, assignee: c.assignee, assigneeName: c.assigneeName,
      messages: c.messages.filter((m) => m.role !== "note"),
    };
  }
  const WIDGET_PATCH_FIELDS = ["status", "csat", "lang", "intent", "sentiment", "visitor", "flow", "resolvedBy", "resolvedAt", "escalatedAt", "priority", "handoffReason"];
  function publicSettings(st) {
    const s = clone(st.settings || {});
    delete s.costPerTicket;
    return { id: st.id, settings: s, kb: st.kb.filter((a) => a.status !== "draft"), flows: st.flows.filter((f) => f.enabled !== false), incidents: st.incidents.filter((i) => i.active) };
  }

  /* ------------------------------------------------------------------ */
  /* Analytics                                                           */
  /* ------------------------------------------------------------------ */

  const DAY = 86400000;
  const median = (arr) => {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  function periodStats(convs, from, to) {
    const list = convs.filter((c) => c.createdAt >= from && c.createdAt < to);
    const bot = list.filter((c) => c.resolvedBy === "bot").length;
    const escalated = list.filter((c) => c.escalatedAt);
    const rated = list.filter((c) => c.csat);
    const frt = escalated.filter((c) => c.firstHumanReplyAt).map((c) => (c.firstHumanReplyAt - c.escalatedAt) / 60000);
    const res = list.filter((c) => c.resolvedAt).map((c) => (c.resolvedAt - c.createdAt) / 60000);
    return {
      list, total: list.length, bot, escalated: escalated.length,
      automation: list.length ? bot / list.length : 0,
      csat: rated.length ? rated.filter((c) => c.csat >= 4).length / rated.length : null,
      csatAvg: rated.length ? rated.reduce((s, c) => s + c.csat, 0) / rated.length : null,
      rated: rated.length, frt: median(frt), resolution: median(res),
    };
  }

  function metrics(state, opts) {
    const days = (opts && opts.days) || 30;
    const now = (opts && opts.now) || Date.now();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    const to = end.getTime(), from = to - days * DAY;
    const convs = Object.values(state.conversations);
    const cur = periodStats(convs, from, to);
    const prev = periodStats(convs, from - days * DAY, from);

    const daily = [];
    for (let i = 0; i < days; i++) {
      const d0 = from + i * DAY;
      const ds = cur.list.filter((c) => c.createdAt >= d0 && c.createdAt < d0 + DAY);
      daily.push({ date: d0, bot: ds.filter((c) => c.resolvedBy === "bot").length, human: ds.filter((c) => c.resolvedBy !== "bot").length });
    }
    const heat = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const c of cur.list) { const d = new Date(c.createdAt); heat[(d.getDay() + 6) % 7][d.getHours()]++; }
    const count = (key) => {
      const m = {};
      for (const c of cur.list) { const k = c[key] || "other"; m[k] = (m[k] || 0) + 1; }
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const csatDist = [1, 2, 3, 4, 5].map((n) => cur.list.filter((c) => c.csat === n).length);
    const intentAuto = count("intent").map(([k, n]) => {
      const sub = cur.list.filter((c) => (c.intent || "other") === k);
      return { key: k, label: INTENT_LABEL[k] || k, total: n, bot: sub.filter((c) => c.resolvedBy === "bot").length };
    });
    const sla = ((state.settings.handoff && state.settings.handoff.slaMinutes) || 30) * 60000;
    const open = convs.filter((c) => c.status === "open" || c.status === "pending");
    return {
      days, from, to, cur, prev, daily, heat, csatDist, intents: intentAuto,
      langs: count("lang"), moods: count("sentiment"),
      savings: cur.bot * ((state.settings.costPerTicket) || 6),
      prevSavings: prev.bot * ((state.settings.costPerTicket) || 6),
      openNow: open.length,
      slaBreached: open.filter((c) => c.escalatedAt && !c.firstHumanReplyAt && now - c.escalatedAt > sla).length,
      articles: state.kb.slice().sort((a, b) => (b.views || 0) - (a.views || 0)),
      flows: state.flows.map((f) => ({ f, started: (f.stats && f.stats.started) || 0, fixed: (f.stats && f.stats.fixed) || 0, handoff: (f.stats && f.stats.handoff) || 0 })),
      gaps: state.gaps.filter((g) => g.status === "open").sort((a, b) => b.count - a.count),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Transports                                                          */
  /* ------------------------------------------------------------------ */

  class Emitter {
    constructor() { this.subs = new Set(); }
    subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
    emit(op, state) { for (const fn of this.subs) { try { fn(op, state); } catch (e) { console.error(e); } } }
  }

  /** Demo mode: everything in this browser, live across tabs. */
  class LocalStore extends Emitter {
    constructor(ws, seed) {
      super();
      this.ws = ws;
      this.key = "tickless:ws:" + ws;
      this.mode = "local";
      this.state = this.load() || this.reseed(seed);
      this.chan = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("tickless:" + ws) : null;
      if (this.chan) this.chan.onmessage = (e) => this.receive(e.data);
      this.timer = null;
    }
    load() {
      try {
        const s = JSON.parse(localStorage.getItem(this.key));
        return s && s.v === VERSION ? s : null;
      } catch (e) { return null; }
    }
    reseed(seed) {
      const s = seed ? seed() : emptyState(this.ws);
      this.state = s;
      this.persistNow();
      return s;
    }
    persistNow() {
      try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch (e) { console.warn("Tickless: storage full", e); }
    }
    persist() { clearTimeout(this.timer); this.timer = setTimeout(() => this.persistNow(), 150); }
    receive(op) {
      if (!EPHEMERAL.has(op.t)) { applyOp(this.state, op); this.persist(); }
      this.emit(op, this.state);
    }
    dispatch(op) {
      op.at = op.at || Date.now();
      if (!EPHEMERAL.has(op.t)) { applyOp(this.state, op); this.persistNow(); }
      if (this.chan) this.chan.postMessage(op);
      this.emit(op, this.state);
      return Promise.resolve(op);
    }
  }

  /** Server mode. role "admin" sees everything; role "widget" only its own conversations. */
  class RemoteStore extends Emitter {
    constructor(opts) {
      super();
      this.api = opts.api.replace(/\/$/, "");
      this.role = opts.role;
      this.token = opts.token;
      this.visitor = opts.visitor;
      this.mode = "remote";
      this.state = null;
    }
    headers() {
      const h = { "content-type": "application/json" };
      if (this.role === "admin") h.authorization = "Bearer " + this.token;
      return h;
    }
    async init() {
      const url = this.role === "admin" ? `${this.api}/api/admin/state` : `${this.api}/api/widget/session?vid=${encodeURIComponent(this.visitor.id)}&key=${encodeURIComponent(this.visitor.key)}`;
      const r = await fetch(url, { headers: this.headers() });
      if (!r.ok) throw new Error("Tickless server: " + r.status);
      const data = await r.json();
      this.state = this.role === "admin" ? data : Object.assign(emptyState(data.id), data);
      this.connect();
      return this;
    }
    connect() {
      const url = this.role === "admin"
        ? `${this.api}/api/admin/stream?token=${encodeURIComponent(this.token)}`
        : `${this.api}/api/widget/stream?vid=${encodeURIComponent(this.visitor.id)}&key=${encodeURIComponent(this.visitor.key)}`;
      this.es = new EventSource(url);
      this.es.onmessage = (e) => {
        const op = JSON.parse(e.data);
        if (op.origin && op.origin === this.originId) return;
        if (!EPHEMERAL.has(op.t)) applyOp(this.state, op);
        this.emit(op, this.state);
      };
    }
    async dispatch(op) {
      op.at = op.at || Date.now();
      this.originId = this.originId || uid("o_");
      op.origin = this.originId;
      if (!EPHEMERAL.has(op.t)) applyOp(this.state, op);
      this.emit(op, this.state);
      const url = this.role === "admin" ? `${this.api}/api/admin/ops` : `${this.api}/api/widget/ops`;
      const body = this.role === "admin" ? { op } : { op, vid: this.visitor.id, key: this.visitor.key };
      const r = await fetch(url, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
      if (!r.ok) console.warn("Tickless: op rejected", op.t, r.status);
      return op;
    }
    async ai(path, payload) {
      const r = await fetch(`${this.api}${path}`, { method: "POST", headers: this.headers(), body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("AI " + r.status);
      return r.json();
    }
  }

  return {
    VERSION, LANGS, INTENT_LABEL, uid, clone, esc, md, fold, tokens, stem,
    searchKB, detectLanguage, detectIntent, sentiment, entities, redactPII, analyze,
    phrase, isOpen, nextOpenLabel, respond, handoffSummary, flowMatch, incidentMatch,
    emptyState, applyOp, publicConversation, publicSettings, WIDGET_PATCH_FIELDS, EPHEMERAL,
    metrics, periodStats, LocalStore, RemoteStore,
  };
});
