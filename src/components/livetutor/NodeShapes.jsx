import React from "react";

// Meaningful silhouettes for concept-map nodes. Each shape is drawn by hand in
// SVG, centered at (0,0), roughly 90x70 units, with its own color pair so every
// node reads as "what it teaches" at a glance. Shapes are chosen per node by
// matching the node's label + description against each shape's keywords.

const SHAPE_DEFS = [
  {
    id: "bug",
    color: "#dc2626",
    soft: "#fee2e2",
    keywords: ["bug", "virus", "malware", "worm", "glitch", "error", "mistake", "problem", "flaw", "attack", "hacker", "hijack", "infect"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} strokeLinecap="round" fill="none">
        <line x1="-20" y1="-4" x2="-33" y2="-14" />
        <line x1="-22" y1="5" x2="-35" y2="7" />
        <line x1="-18" y1="13" x2="-29" y2="23" />
        <line x1="20" y1="-4" x2="33" y2="-14" />
        <line x1="22" y1="5" x2="35" y2="7" />
        <line x1="18" y1="13" x2="29" y2="23" />
        <line x1="-6" y1="-24" x2="-12" y2="-34" />
        <line x1="6" y1="-24" x2="12" y2="-34" />
        <circle cx="0" cy="-21" r="8" fill={soft} />
        <ellipse cx="0" cy="4" rx="23" ry="24" fill={soft} />
        <line x1="0" y1="-15" x2="0" y2="27" />
        <circle cx="-10" cy="-2" r="3.4" fill={C} stroke="none" />
        <circle cx="10" cy="-2" r="3.4" fill={C} stroke="none" />
        <circle cx="-9" cy="13" r="2.8" fill={C} stroke="none" />
        <circle cx="9" cy="13" r="2.8" fill={C} stroke="none" />
      </g>
    )
  },
  {
    id: "chip",
    color: "#475569",
    soft: "#f1f5f9",
    keywords: ["data", "computer", "storage", "memory", "register", "code", "program", "software", "chip", "hardware", "device", "machine", "bot", "ai"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none">
        <rect x="-20" y="-20" width="40" height="40" rx="7" fill={soft} />
        <rect x="-9" y="-9" width="18" height="18" rx="2.5" />
        {[-12, 0, 12].map((o) => (
          <g key={o}>
            <line x1={o} y1="-28" x2={o} y2="-20" />
            <line x1={o} y1="28" x2={o} y2="20" />
            <line x1="-28" y1={o} x2="-20" y2={o} />
            <line x1="28" y1={o} x2="20" y2={o} />
          </g>
        ))}
        <circle cx="0" cy="0" r="2" fill={C} stroke="none" />
      </g>
    )
  },
  {
    id: "brain",
    color: "#c026d3",
    soft: "#fae8ff",
    keywords: ["brain", "mind", "think", "thinking", "thought", "decision", "decide", "psychology", "attention", "focus", "emotion", "feel", "learn", "learning", "understand", "understanding", "remember", "practice"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M0,-27 C-7,-33 -18,-30 -20,-21 C-30,-21 -35,-10 -28,-4 C-35,2 -31,13 -22,14 C-20,24 -7,28 0,21 C7,28 20,24 22,14 C31,13 35,2 28,-4 C35,-10 30,-21 20,-21 C18,-30 7,-33 0,-27 Z"
          fill={soft}
        />
        <path d="M0,-26 C-3,-12 3,6 0,20" />
        <path d="M-13,-8 C-17,-3 -10,1 -14,6" strokeWidth={sw * 0.8} />
        <path d="M13,-8 C17,-3 10,1 14,6" strokeWidth={sw * 0.8} />
      </g>
    )
  },
  {
    id: "eye",
    color: "#0891b2",
    soft: "#cffafe",
    keywords: ["eye", "see", "look", "notice", "spot", "watch", "observe", "detect", "signal", "visual", "read", "clue"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none">
        <circle cx="0" cy="0" r="26" fill="#ffffff" />
        <circle cx="0" cy="0" r="12.5" fill={C} stroke="none" />
        <circle cx="0" cy="0" r="5.5" fill="#111827" stroke="none" />
        <circle cx="-4.5" cy="-4.5" r="2" fill="#ffffff" stroke="none" />
      </g>
    )
  },
  {
    id: "shield",
    color: "#059669",
    soft: "#d1fae5",
    keywords: ["protect", "protection", "safe", "safety", "defend", "defense", "guard", "block", "filter", "prevent", "secure", "security"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0,-30 C9,-25 19,-23 26,-21 L26,2 C26,16 14,27 0,33 C-14,27 -26,16 -26,2 L-26,-21 C-19,-23 -9,-25 0,-30 Z" fill={soft} />
        <path d="M-9,0 L-2,8 L12,-7" strokeWidth={sw * 1.1} />
      </g>
    )
  },
  {
    id: "lock",
    color: "#b45309",
    soft: "#fef3c7",
    keywords: ["password", "passcode", "pin", "lock", "encrypt", "privacy", "private", "account", "login", "secret", "credential", "username"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinecap="round">
        <path d="M-12,-9 L-12,-16 A12,13 0 0 1 12,-16 L12,-9" strokeWidth={sw * 1.3} />
        <rect x="-18" y="-9" width="36" height="32" rx="6" fill={soft} />
        <circle cx="0" cy="3" r="4.5" fill="#ffffff" />
        <line x1="0" y1="7.5" x2="0" y2="14" strokeWidth={sw * 1.2} />
      </g>
    )
  },
  {
    id: "phone",
    color: "#4f46e5",
    soft: "#e0e7ff",
    keywords: ["phone", "text", "texting", "message", "call", "mobile", "smartphone", "sms", "number", "app", "contact"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none">
        <rect x="-14" y="-27" width="28" height="54" rx="7" fill={soft} />
        <rect x="-9" y="-20" width="18" height="36" rx="2.5" fill="#ffffff" />
        <rect x="-6" y="-15" width="12" height="8" rx="3" strokeWidth={sw * 0.8} />
        <line x1="-4" y1="-2" x2="4" y2="-2" strokeWidth={sw * 0.8} strokeLinecap="round" />
        <line x1="-4" y1="4" x2="0" y2="4" strokeWidth={sw * 0.8} strokeLinecap="round" />
        <circle cx="0" cy="22" r="2.2" fill={C} stroke="none" />
      </g>
    )
  },
  {
    id: "envelope",
    color: "#0d9488",
    soft: "#ccfbf1",
    keywords: ["email", "mail", "phish", "phishing", "inbox", "letter"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <rect x="-27" y="-17" width="54" height="34" rx="5" fill={soft} />
        <path d="M-27,-17 L0,4 L27,-17" />
        <path d="M-27,17 L-8,1" strokeWidth={sw * 0.8} />
        <path d="M27,17 L8,1" strokeWidth={sw * 0.8} />
      </g>
    )
  },
  {
    id: "magnifier",
    color: "#7c3aed",
    soft: "#ede9fe",
    keywords: ["check", "verify", "search", "investigate", "clue", "evidence", "source", "fact", "research", "compare", "inspect", "examine", "test"],
    art: (C, soft, sw) => (
      <g stroke={C} fill="none" strokeLinecap="round">
        <circle cx="-7" cy="-9" r="16.5" fill={soft} strokeWidth={sw * 1.2} />
        <line x1="5" y1="3" x2="21" y2="19" strokeWidth={sw * 2.2} />
        <path d="M-15,-13 C-12,-16 -8,-17 -4,-16" strokeWidth={sw * 0.9} />
      </g>
    )
  },
  {
    id: "bulb",
    color: "#ca8a04",
    soft: "#fef9c3",
    keywords: ["idea", "tip", "trick", "concept", "why", "reason", "explain", "explanation", "insight", "goal", "strategy", "plan", "hint", "clever"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0,-28 C-13,-28 -21,-17 -18,-6 C-16,0 -12,5 -12,10 L12,10 C12,5 16,0 18,-6 C21,-17 13,-28 0,-28 Z" fill={soft} />
        <path d="M-5,-6 L0,2 L5,-6" />
        <line x1="-10" y1="15" x2="10" y2="15" />
        <line x1="-7" y1="21" x2="7" y2="21" />
        <line x1="-24" y1="-21" x2="-19" y2="-16" />
        <line x1="24" y1="-21" x2="19" y2="-16" />
        <line x1="0" y1="-33" x2="0" y2="-28" />
      </g>
    )
  },
  {
    id: "warning",
    color: "#ea580c",
    soft: "#ffedd5",
    keywords: ["warning", "risk", "danger", "scam", "fraud", "fake", "alert", "trap", "suspicious", "bait", "hook", "lure", "spoof", "pretend", "disguise", "lie", "pressure", "urgent", "threat"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinejoin="round">
        <path d="M0,-28 L26,17 C29,22 26,27 20,27 L-20,27 C-26,27 -29,22 -26,17 Z" fill={soft} />
        <rect x="-2.6" y="-9" width="5.2" height="16" rx="2.6" fill={C} stroke="none" />
        <circle cx="0" cy="17" r="3" fill={C} stroke="none" />
      </g>
    )
  },
  {
    id: "gear",
    color: "#3f3f46",
    soft: "#f4f4f5",
    keywords: ["process", "step", "system", "automate", "automation", "automatic", "engine", "server", "tool", "method", "routine", "setting"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect key={a} x="-4" y="-26" width="8" height="11" rx="2.5" fill={soft} transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="17" fill={soft} />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>
    )
  },
  {
    id: "network",
    color: "#2563eb",
    soft: "#dbeafe",
    keywords: ["network", "internet", "connect", "connection", "spread", "share", "social", "online", "link", "web", "route", "travel", "send", "cloud", "wifi"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none">
        <line x1="0" y1="0" x2="-24" y2="-18" />
        <line x1="0" y1="0" x2="24" y2="-18" />
        <line x1="0" y1="0" x2="0" y2="26" />
        <circle cx="0" cy="0" r="8" fill={C} stroke="none" />
        <circle cx="-24" cy="-18" r="6" fill={soft} />
        <circle cx="24" cy="-18" r="6" fill={soft} />
        <circle cx="0" cy="26" r="6" fill={soft} />
      </g>
    )
  },
  {
    id: "coin",
    color: "#a16207",
    soft: "#fef08a",
    keywords: ["money", "pay", "payment", "cost", "price", "prize", "gift", "win", "free", "bank", "cash", "reward", "dollar", "card", "refund", "offer", "deal", "bill"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none">
        <circle cx="0" cy="0" r="25" fill={soft} />
        <circle cx="0" cy="0" r="19" strokeDasharray="3 4" />
        <text x="0" y="8.5" textAnchor="middle" fontSize="24" fontWeight="700" fill={C} stroke="none" className="font-mono">
          $
        </text>
      </g>
    )
  },
  {
    id: "clock",
    color: "#0284c7",
    soft: "#e0f2fe",
    keywords: ["time", "timing", "when", "moment", "wait", "delay", "fast", "slow", "quick", "minute", "hour", "day", "schedule", "history", "before", "after", "deadline", "soon"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinecap="round">
        <circle cx="0" cy="0" r="25" fill={soft} />
        <line x1="0" y1="0" x2="0" y2="-14" strokeWidth={sw * 1.2} />
        <line x1="0" y1="0" x2="9" y2="4" strokeWidth={sw * 1.2} />
        <circle cx="0" cy="0" r="2.2" fill={C} stroke="none" />
        <line x1="0" y1="-21" x2="0" y2="-18" />
        <line x1="0" y1="21" x2="0" y2="18" />
        <line x1="-21" y1="0" x2="-18" y2="0" />
        <line x1="21" y1="0" x2="18" y2="0" />
      </g>
    )
  },
  {
    id: "flag",
    color: "#f43f5e",
    soft: "#ffe4e6",
    keywords: ["report", "tell", "trusted", "trust", "authority", "official", "police", "federal", "law", "rule", "flag", "mark", "adult", "teacher", "parent", "helper", "help"],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <line x1="-14" y1="-30" x2="-14" y2="30" strokeWidth={sw * 1.3} />
        <path d="M-14,-26 C-4,-31 5,-22 15,-27 L15,-3 C5,2 -4,-7 -14,-2 Z" fill={soft} />
      </g>
    )
  },
  {
    id: "hex",
    color: "#64748b",
    soft: "#f8fafc",
    keywords: [],
    art: (C, soft, sw) => (
      <g stroke={C} strokeWidth={sw} fill="none" strokeLinejoin="round">
        <path d="M0,-27 L23,-14 L23,14 L0,27 L-23,14 L-23,-14 Z" fill={soft} />
        <circle cx="0" cy="0" r="5" fill={C} stroke="none" />
      </g>
    )
  }
];

export const SHAPES = SHAPE_DEFS;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Choose a distinct, meaningful shape per node. Keywords score the node's label
// and description; the highest-scoring unused shape wins, so a scene never
// repeats silhouettes while node count allows it.
export function pickShapes(nodes, context = "") {
  const scored = nodes.map((node) => {
    const text = `${node.label ?? ""} ${node.description ?? ""} ${context}`.toLowerCase();
    const scores = SHAPE_DEFS.map((s) => {
      let score = 0;
      s.keywords.forEach((k) => {
        const re = new RegExp(`\\b${escapeRegex(k)}`, "g");
        score += (text.match(re) || []).length;
      });
      return { id: s.id, score };
    }).sort((a, b) => b.score - a.score);
    return { id: node.id, scores };
  });
  const order = [...scored].sort((a, b) => (b.scores[0]?.score ?? 0) - (a.scores[0]?.score ?? 0));
  const used = new Set();
  const result = {};
  order.forEach((entry) => {
    let choice = entry.scores.find((s) => s.score > 0 && !used.has(s.id));
    if (!choice) choice = SHAPE_DEFS.map((s) => ({ id: s.id })).find((s) => !used.has(s.id));
    if (!choice) choice = entry.scores[0] ?? { id: "hex" };
    used.add(choice.id);
    result[entry.id] = choice.id;
  });
  return result;
}

export function getShape(shapeId) {
  return SHAPE_DEFS.find((s) => s.id === shapeId) ?? SHAPE_DEFS[SHAPE_DEFS.length - 1];
}

// The hand-drawn artwork for one node silhouette, centered at (0,0).
export default function NodeShapeArt({ shapeId, active }) {
  const def = getShape(shapeId);
  const sw = active ? 3.4 : 2.2;
  return def.art(def.color, def.soft, sw);
}