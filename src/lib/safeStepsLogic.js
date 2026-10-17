// Safe Steps lesson logic (content, answer key, circle checking, lesson rules).
// Generated from src/lib by esbuild. Do not edit by hand: edit src/lib and rebuild.
// src/lib/content.ts
var DATE_CHECKED = "Oct 17, 2026";
var SOURCES = {
  S1: {
    id: "S1",
    title: "Fake shipping notification emails and text messages",
    publisher: "FTC Consumer Alert",
    date: "Dec 14, 2023",
    url: "https://consumer.ftc.gov/consumer-alerts/2023/12/fake-shipping-notification-emails-text-messages-what-you-need-know-holiday-season"
  },
  S2: {
    id: "S2",
    title: "How To Recognize and Avoid Phishing Scams",
    publisher: "FTC Consumer Advice",
    date: "Sep 2022",
    url: "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams"
  },
  S3: {
    id: "S3",
    title: "New FTC Data Show Top Text Message Scams of 2024",
    publisher: "FTC Press Release",
    date: "Apr 16, 2025",
    url: "https://www.ftc.gov/news-events/news/press-releases/2025/04/new-ftc-data-show-top-text-message-scams-2024-overall-losses-text-scams-hit-470-million"
  }
};
var FLAGS = [
  {
    id: "F1",
    text: "From (555) 010-0142",
    hint: "Do you know who sent this?",
    clue: "Look at the very top. Check who the message is from.",
    why: "You do not know this sender, and it is not in your contacts.",
    source: "S2",
    claim: "Before you trust a message, check if you know the sender.",
    keywords: ["sender", "number", "who", "contact", "know", "from"]
  },
  {
    id: "F2",
    text: "Dear customer",
    hint: "Does this message say your name?",
    clue: "Look at the first words of the message. Check how it greets you.",
    why: "It says 'Dear customer' instead of your name or an order number.",
    source: "S2",
    claim: "Phishing messages often use a general greeting instead of your name.",
    keywords: ["greeting", "name", "dear", "customer", "generic"]
  },
  {
    id: "F3",
    text: "within 2 hours or it will be sent back",
    hint: "Why does it give you only 2 hours?",
    clue: "Look for a time limit in the message.",
    why: "It rushes you so you do not stop to think.",
    source: "S1",
    claim: "Fake delivery messages push you to act fast, for example by saying the package will be sent back.",
    keywords: ["rush", "hurry", "time", "hours", "fast", "urgent", "deadline", "quick"]
  },
  {
    id: "F4",
    text: "Pay a $1.99 fee",
    hint: "Should a text ask you to pay?",
    clue: "Look for a part that asks for money.",
    why: "It asks you to pay money through a link in a text.",
    source: "S2",
    claim: "Scam messages often ask you to pay or give information through a link.",
    keywords: ["pay", "money", "fee", "cost", "dollar", "card", "payment", "small"]
  },
  {
    id: "F5",
    text: "parcelpoint-redelivery.help/pay",
    hint: "Do you know this web address?",
    clue: "Look at the web link at the end.",
    why: "The link can open a fake website that looks real and saves what you type.",
    source: "S1",
    claim: "Links in fake delivery messages can open look-alike websites that collect your information.",
    keywords: ["link", "website", "site", "url", "address", "click", "web"]
  }
];
var FLAG_IDS = FLAGS.map((f) => f.id);
var flagById = (id) => FLAGS.find((f) => f.id === id);
var DECOY = {
  id: "D1",
  text: "Today at 9 AM",
  why: "This is the time the message came in. A time stamp is normal, so look at the words of the message instead."
};
var MESSAGE_HEADER = [
  { kind: "flag", id: "F1", text: FLAGS[0].text },
  { kind: "plain", text: ", not in your contacts. " },
  { kind: "decoy", id: "D1", text: DECOY.text }
];
var MESSAGE_BODY = [
  { kind: "plain", text: "ParcelPoint ALERT. " },
  { kind: "flag", id: "F2", text: "Dear customer" },
  { kind: "plain", text: ", your package is on hold. " },
  { kind: "flag", id: "F4", text: "Pay a $1.99 fee" },
  { kind: "plain", text: " " },
  { kind: "flag", id: "F3", text: "within 2 hours or it will be sent back" },
  { kind: "plain", text: ". Pay now at " },
  { kind: "flag", id: "F5", text: "parcelpoint-redelivery.help/pay" }
];
var MESSAGE_SPOKEN = "From 5 5 5, 0 1 0, 0 1 4 2. ParcelPoint alert. Dear customer, your package is on hold. Pay a 1 dollar 99 fee within 2 hours or it will be sent back. Pay now at parcelpoint dash redelivery dot help.";
var STEPS = [
  { num: 1, title: "Welcome" },
  { num: 2, title: "Read the message" },
  { num: 3, title: "Circle the red flags" },
  { num: 4, title: "Feedback" },
  { num: 5, title: "Check the sources" },
  { num: 6, title: "Quiz" }
];
var LINES = {
  welcome: [
    "Hi, I am your Safe Steps teacher. Today you will learn to spot red flags in a scam text message.",
    "This lesson has 6 steps. Are you ready to start?"
  ],
  readMessage: [
    "Here is a text message. I will read it to you.",
    MESSAGE_SPOKEN,
    "When you are ready, press the button to start circling."
  ],
  circleStartDraw: [
    "Circle anything that feels off. Take your time.",
    "I will wait until you stop drawing."
  ],
  circleStartTap: ["Tap anything that feels off. Take your time."],
  tooBig: ["That circle covers a lot of the message. Try to circle one small part."],
  emptyMiss: (next) => [`I do not see a red flag inside that circle. ${next}`],
  plainTap: (next) => [`That part looks normal by itself. ${next}`],
  decoy: [DECOY.why],
  hit: (f) => [`Good eye. ${f.why}`],
  hintQuestion: (f) => [f.hint],
  hintClue: (f) => [f.clue],
  reveal: (f) => [
    `This one is tricky, so here it is: "${f.text}".`,
    f.why
  ],
  allFound: [
    "You found all five red flags. The message has an unknown sender, a general greeting, a rush, a payment request, and a strange link.",
    "Do you want to go over each one?"
  ],
  feedbackIntro: ["Let us go over each red flag, one at a time."],
  feedbackFlag: (f) => [`"${f.text}".`, f.why],
  feedbackDone: ["That is all five. Next, you can see where each rule comes from."],
  evidenceIntro: [
    "Every rule in this lesson comes from a government website.",
    "Press a card to hear about it, or press Check it yourself to open the page."
  ],
  evidenceCard: (f) => [
    `This comes from the ${SOURCES[f.source].publisher}.`,
    f.claim
  ],
  evidenceStat: [
    "This comes from an FTC press release.",
    "In 2024, people reported losing 470 million dollars to scams that started with a text."
  ],
  quizReady: ["Ready for a quiz? It has 3 short questions and no timer."],
  quizNotYet: ["That is fine. You can practice circling again."],
  quizRight: ["Yes, that is right."],
  quizUnsure: [
    "That is a safe answer.",
    "When you are not sure, check on a website you already know."
  ],
  quizDone: [
    "You finished the lesson. Here are three steps to remember."
  ],
  breakStart: ["Take as long as you need. Press I am back when you are ready."],
  breakEnd: ["Welcome back. We are on the same step as before."],
  askUnknown: [
    "I do not know. I can only answer from the sources in this lesson."
  ]
};
var lookNext = (f) => f ? f.clue : "Try the Hint button if you want help.";
var QUIZ_CHOICES = [
  { id: "scam", label: "Scam" },
  { id: "check", label: "Looks okay, but I will check on the site I know" },
  { id: "unsure", label: "I am not sure" }
];
var SCENARIOS = [
  {
    context: "You get this text.",
    from: "(555) 010-0177",
    message: "Your bank account is locked because of a problem. Fix it now at mybank-verify.help/login",
    best: "scam",
    hint: "Look again. Does the text ask you to fix a problem through its link?",
    explain: "This is a scam. A text about a problem with your account plus a link is a common trick.",
    sources: ["S2", "S3"]
  },
  {
    context: "Yesterday you ordered a book from Maple Books.",
    from: "Maple Books",
    message: "Hi Sam, your order #4821 has shipped. It should arrive on Tuesday.",
    best: "check",
    hint: "Look again. Did you just place an order, and does this text have a link?",
    explain: "This one looks okay. You did place an order and it has no link, but you can still check on the store website you know.",
    sources: ["S1"]
  },
  {
    context: "You did not buy a headset.",
    from: "(555) 010-0193",
    message: "Invoice #77310: your GamePro headset order for $249.99 is confirmed. To cancel, pay at invoice-desk.help/cancel",
    best: "scam",
    hint: "Look again. Did you buy this headset?",
    explain: "This is a scam. An invoice for something you never bought, with a link to pay, is fake.",
    sources: ["S2"]
  }
];
var TAKE_HOME = [
  "Do not click the link or reply.",
  "If you think it might be true, check on the store or carrier website you already know, not the one in the text.",
  "Forward the text to 7726 (SPAM) and report it at ReportFraud.ftc.gov."
];
var DESIGN_RULES = [
  { need: "Knowing what comes next", feature: "Step bar at the top. The quiz starts only after a yes." },
  { need: "Staying focused", feature: "The teacher says 1 to 2 sentences and covers one red flag at a time." },
  { need: "Literal language", feature: "No sarcasm or idioms. The teacher says exactly what the message does." },
  { need: "Sensory comfort", feature: "Calm mode: muted colors, no fading, no motion." },
  { need: "Feeling safe to try", feature: "Hint first, then the answer. Never 'wrong' without a next step." },
  { need: "Taking breaks", feature: "A visible timer and a Need a break button that pauses everything." },
  { need: "Comfort with voices", feature: "Voice or text, your choice. Captions are always on." }
];

// src/lib/geometry.ts
var CUTOFFS = {
  minCoverage: 0.6,
  // stroke box must cover this share of the target
  maxSizeRatio: 6,
  // stroke box area may be at most this many times the target box
  tooBigShare: 0.5,
  // a stroke covering this share of the whole message is "too big"
  minStrokeSize: 12
  // px: smaller strokes are treated as stray dots
};
function boxOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
var area = (b) => Math.max(0, b.w) * Math.max(0, b.h);
function intersect(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return { x, y, w: Math.max(0, w), h: Math.max(0, h) };
}
function unionBox(rects) {
  return boxOf(rects.flatMap((r) => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h }]));
}
function coverage(stroke, t) {
  const total = t.rects.reduce((s, r) => s + area(r), 0);
  if (total === 0) return 0;
  const covered = t.rects.reduce((s, r) => s + area(intersect(stroke, r)), 0);
  return covered / total;
}
function checkStroke(points, targets, messageBox) {
  if (points.length < 2) return { kind: "ignore" };
  const box = boxOf(points);
  if (box.w < CUTOFFS.minStrokeSize && box.h < CUTOFFS.minStrokeSize) return { kind: "ignore" };
  if (area(box) >= CUTOFFS.tooBigShare * area(messageBox)) return { kind: "tooBig" };
  const covered = targets.filter((t) => coverage(box, t) >= CUTOFFS.minCoverage);
  const flagsCovered = covered.filter((t) => t.id !== "D1");
  if (flagsCovered.length >= 2) return { kind: "tooBig" };
  if (flagsCovered.length === 1) {
    const t = flagsCovered[0];
    if (area(box) > CUTOFFS.maxSizeRatio * area(unionBox(t.rects))) return { kind: "tooBig" };
    return { kind: "hit", id: t.id };
  }
  if (covered.some((t) => t.id === "D1")) return { kind: "decoy" };
  return { kind: "miss" };
}

// src/lib/lesson.ts
var freshBoard = () => ({
  found: [],
  revealed: [],
  outlined: [],
  target: null,
  hintLevel: {},
  misses: {}
});
var freshQuiz = () => ({
  phase: "ready",
  index: 0,
  tries: 0,
  status: "open",
  picked: null
});
function initialState() {
  return {
    step: 1,
    completed: [],
    inputMode: "draw",
    ...freshBoard(),
    reviewIndex: -1,
    activeEvidence: null,
    quiz: freshQuiz(),
    paused: false,
    say: { id: 1, lines: LINES.welcome }
  };
}
var accounted = (s) => [...s.found, ...s.revealed];
var allAccounted = (s) => FLAG_IDS.every((id) => accounted(s).includes(id));
var nextOpenFlag = (s) => FLAG_IDS.find((id) => !accounted(s).includes(id));
var say = (s, lines) => ({
  ...s,
  say: { id: s.say.id + 1, lines }
});
var complete = (s, step) => s.completed.includes(step) ? s : { ...s, completed: [...s.completed, step] };
var withTarget = (s) => s.target ? s : { ...s, target: nextOpenFlag(s) ?? null };
function introLines(s, step) {
  switch (step) {
    case 1:
      return LINES.welcome;
    case 2:
      return LINES.readMessage;
    case 3:
      return s.inputMode === "draw" ? LINES.circleStartDraw : LINES.circleStartTap;
    case 4:
      return LINES.feedbackIntro;
    case 5:
      return LINES.evidenceIntro;
    case 6:
      return LINES.quizReady;
  }
}
function reveal(s, id) {
  const next = {
    ...s,
    revealed: s.revealed.includes(id) ? s.revealed : [...s.revealed, id],
    outlined: s.outlined.includes(id) ? s.outlined : [...s.outlined, id],
    target: s.target === id ? null : s.target
  };
  return { s: next, lines: LINES.reveal(flagById(id)) };
}
function wrongAttempt(s, lines) {
  let next = withTarget(s);
  const t = next.target;
  if (!t) return { s: next, lines: lines(lookNext(void 0)) };
  const misses = (next.misses[t] ?? 0) + 1;
  next = { ...next, misses: { ...next.misses, [t]: misses } };
  if (misses >= 2) {
    const r = reveal(next, t);
    return { s: r.s, lines: [...lines("").slice(0, 1).map((l) => l.trim()), ...r.lines] };
  }
  return { s: next, lines: lines(lookNext(flagById(t))) };
}
function applyResult(s, r) {
  switch (r.kind) {
    case "ignore":
      return { s, lines: [] };
    case "hit": {
      if (accounted(s).includes(r.id)) {
        return { s, lines: [`You already found that one. ${lookNext(flagById(nextOpenFlag(s) ?? r.id))}`] };
      }
      const next = {
        ...s,
        found: [...s.found, r.id],
        outlined: s.outlined.filter((id) => id !== r.id),
        target: s.target === r.id ? null : s.target
      };
      const left = FLAG_IDS.length - accounted(next).length;
      const lines = LINES.hit(flagById(r.id));
      if (left > 0) lines.push(`${left} red ${left === 1 ? "flag" : "flags"} left.`);
      return { s: next, lines };
    }
    case "tooBig":
      return { s, lines: LINES.tooBig };
    case "decoy":
      return wrongAttempt(s, () => LINES.decoy);
    case "miss":
      return wrongAttempt(s, (look) => LINES.emptyMiss(look));
    case "plain":
      return wrongAttempt(s, (look) => LINES.plainTap(look));
  }
}
function afterBoardChange(s, lines) {
  if (lines.length === 0) return s;
  if (allAccounted(s)) {
    return say(complete(s, 3), [...lines, ...LINES.allFound]);
  }
  return say(s, lines);
}
var STAT_WORDS = ["how many", "lost", "470", "million", "common", "2024", "often", "real", "happen"];
var TODO_WORDS = ["what do i do", "what should i", "report", "7726", "forward", "delete", "block"];
function answerQuestion(q) {
  const text = q.toLowerCase();
  const words = text.split(/[^a-z0-9$]+/).filter(Boolean);
  let best = null;
  for (const f of FLAGS) {
    const score = f.keywords.filter((k) => words.some((w) => w.startsWith(k))).length;
    if (score > 0 && (!best || score > best.score)) best = { id: f.id, score };
  }
  if (TODO_WORDS.some((w) => text.includes(w))) {
    return {
      lines: ["Do not click the link or reply.", "Forward the text to 7726 and report it at ReportFraud.ftc.gov."],
      evidence: "F1"
    };
  }
  if (best) {
    const f = flagById(best.id);
    return { lines: [f.why, f.claim], evidence: f.id };
  }
  if (STAT_WORDS.some((w) => text.includes(w))) {
    return { lines: LINES.evidenceStat, evidence: "stat" };
  }
  return { lines: LINES.askUnknown, evidence: null };
}
function reducer(s, a) {
  if (s.paused && a.type !== "RESUME" && a.type !== "RESET") return s;
  switch (a.type) {
    case "GO_STEP": {
      let next = { ...s, step: a.step };
      if (a.step > s.step) {
        for (let n = s.step; n < a.step; n++) next = complete(next, n);
      }
      if (a.step === 4) next = { ...next, reviewIndex: -1 };
      if (a.step === 5) next = { ...next, activeEvidence: null };
      if (a.step === 6 && next.quiz.phase !== "done") next = { ...next, quiz: freshQuiz() };
      return say(next, introLines(next, a.step));
    }
    case "SET_INPUT": {
      const next = { ...s, inputMode: a.mode };
      return s.step === 3 ? say(next, introLines(next, 3)) : next;
    }
    case "STROKES": {
      let next = s;
      const lines = [];
      for (const r of a.results) {
        const out = applyResult(next, r);
        next = out.s;
        lines.push(...out.lines);
      }
      return afterBoardChange(next, lines);
    }
    case "TAP": {
      const r = a.id === "plain" ? { kind: "plain" } : a.id === "D1" ? { kind: "decoy" } : { kind: "hit", id: a.id };
      const out = applyResult(s, r);
      return afterBoardChange(out.s, out.lines);
    }
    case "HINT": {
      const next = withTarget(s);
      const t = next.target;
      if (!t) return say(next, ["You found them all. There are no more hints."]);
      const level = (next.hintLevel[t] ?? 0) + 1;
      const leveled = { ...next, hintLevel: { ...next.hintLevel, [t]: level } };
      const f = flagById(t);
      if (level === 1) return say(leveled, LINES.hintQuestion(f));
      if (level === 2) {
        return say({ ...leveled, outlined: [...leveled.outlined, t] }, LINES.hintClue(f));
      }
      const r = reveal(leveled, t);
      return afterBoardChange(r.s, r.lines);
    }
    case "REVIEW_NEXT": {
      const i = s.reviewIndex + 1;
      if (i >= FLAGS.length) return say(complete({ ...s, reviewIndex: i }, 4), LINES.feedbackDone);
      return say({ ...s, reviewIndex: i, activeEvidence: FLAGS[i].id }, LINES.feedbackFlag(FLAGS[i]));
    }
    case "SHOW_EVIDENCE": {
      const lines = a.id === "stat" ? LINES.evidenceStat : LINES.evidenceCard(flagById(a.id));
      return say({ ...s, activeEvidence: a.id }, lines);
    }
    case "QUIZ_READY": {
      if (a.answer === "notyet") {
        const next = { ...s, step: 3, ...freshBoard() };
        return say(next, [...LINES.quizNotYet, ...introLines(next, 3)]);
      }
      return say(
        { ...s, quiz: { ...freshQuiz(), phase: "question" } },
        [`Question 1 of ${SCENARIOS.length}.`, SCENARIOS[0].context]
      );
    }
    case "QUIZ_ANSWER": {
      const q = s.quiz;
      if (q.phase !== "question" || q.status === "right" || q.status === "explained") return s;
      const sc = SCENARIOS[q.index];
      if (a.choice === sc.best) {
        return say({ ...s, quiz: { ...q, picked: a.choice, status: "right" } }, [...LINES.quizRight, sc.explain]);
      }
      if (a.choice === "unsure") {
        return say({ ...s, quiz: { ...q, picked: a.choice, status: "right" } }, LINES.quizUnsure);
      }
      const tries = q.tries + 1;
      if (tries === 1) {
        return say({ ...s, quiz: { ...q, picked: a.choice, tries, status: "hint" } }, [sc.hint]);
      }
      return say({ ...s, quiz: { ...q, picked: a.choice, tries, status: "explained" } }, [sc.explain]);
    }
    case "QUIZ_NEXT": {
      const i = s.quiz.index + 1;
      if (i >= SCENARIOS.length) {
        return say(complete({ ...s, quiz: { ...s.quiz, phase: "done" } }, 6), LINES.quizDone);
      }
      return say(
        { ...s, quiz: { phase: "question", index: i, tries: 0, status: "open", picked: null } },
        [`Question ${i + 1} of ${SCENARIOS.length}.`, SCENARIOS[i].context]
      );
    }
    case "PAUSE":
      return { ...say(s, LINES.breakStart), paused: true };
    case "RESUME":
      return say({ ...s, paused: false }, LINES.breakEnd);
    case "ASK": {
      const out = answerQuestion(a.question);
      return say({ ...s, activeEvidence: out.evidence ?? s.activeEvidence }, out.lines);
    }
    case "FILL_ALL":
      return {
        ...s,
        found: [...FLAG_IDS],
        revealed: [],
        outlined: [],
        target: null,
        completed: [],
        quiz: { ...freshQuiz(), phase: "done" }
      };
    case "RESET": {
      const fresh = initialState();
      return { ...fresh, inputMode: s.inputMode, say: { id: s.say.id + 1, lines: fresh.say.lines } };
    }
  }
}
export {
  CUTOFFS,
  DATE_CHECKED,
  DECOY,
  DESIGN_RULES,
  FLAGS,
  FLAG_IDS,
  LINES,
  MESSAGE_BODY,
  MESSAGE_HEADER,
  MESSAGE_SPOKEN,
  QUIZ_CHOICES,
  SCENARIOS,
  SOURCES,
  STEPS,
  TAKE_HOME,
  accounted,
  allAccounted,
  answerQuestion,
  area,
  boxOf,
  checkStroke,
  coverage,
  flagById,
  initialState,
  intersect,
  lookNext,
  reducer,
  unionBox
};