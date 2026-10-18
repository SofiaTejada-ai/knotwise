import { unzipSync, strFromU8 } from "fflate";

// Source-grounded teaching for Live Tutor: a student's own class material
// (PDF, Word, PowerPoint) is turned into small passages that keep where they
// came from (page, slide or section), indexed for keyword search (BM25), and
// searched by the professor while teaching. Everything after extraction runs
// in the browser, so a search adds no network round trip mid-conversation.
//
//   validate -> extract (PDF via the extractDocument function; .docx/.pptx
//   read here) -> sections with locators -> passages -> BM25 index -> search

export const ACCEPT = ".pdf,.docx,.pptx,.doc,.ppt";
export const MAX_BYTES = 25 * 1024 * 1024;
const CHUNK = 700; // target characters per passage
const OVERLAP = 120;

// ---------- validation ----------

export function validateFile(file) {
  const name = String(file?.name ?? "");
  const ext = name.toLowerCase().split(".").pop();
  if (!file) return { ok: false, error: "No file was chosen." };
  if (ext === "doc" || ext === "ppt")
    return { ok: false, error: `Older .${ext} files cannot be read. Save it as .${ext}x or as a PDF, then upload that.` };
  if (!["pdf", "docx", "pptx"].includes(ext)) return { ok: false, error: "Upload a PDF, Word (.docx) or PowerPoint (.pptx) file." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That file is larger than 25 MB. Try a smaller export." };
  if (!file.size) return { ok: false, error: "That file is empty." };
  return { ok: true, kind: ext };
}

// ---------- extraction ----------

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
const runs = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g"))].map((m) => decode(m[1])).join("");
const paragraphs = (xml, p, t) =>
  xml
    .split(new RegExp(`<${p}[\\s>]`))
    .slice(1)
    .map((chunk) => ({ xml: chunk, text: runs(chunk, t).replace(/\s+/g, " ").trim() }))
    .filter((x) => x.text);

// Word: headings start new sections ("section 'Results'"); no page numbers
// exist in a .docx (pages only appear when Word lays it out).
export function extractDocx(bytes) {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"] ? strFromU8(files["word/document.xml"]) : "";
  if (!xml) throw new Error("This Word file has no readable body.");
  const sections = [];
  let cur = { locator: "the beginning", title: "", lines: [] };
  for (const para of paragraphs(xml, "w:p", "w:t")) {
    const style = para.xml.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? "";
    if (/^(Heading|Title)/i.test(style)) {
      if (cur.lines.length) sections.push(cur);
      cur = { locator: `section "${para.text.slice(0, 60)}"`, title: para.text, lines: [] };
    } else cur.lines.push(para.text);
  }
  if (cur.lines.length || cur.title) sections.push(cur);
  return sections.map((s) => ({ locator: s.locator, title: s.title, text: s.lines.join("\n") }));
}

// PowerPoint: one section per slide, in slide order, with speaker notes.
export function extractPptx(bytes) {
  const files = unzipSync(bytes, { filter: (f) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(f.name) });
  const num = (n) => Number(n.match(/(\d+)\.xml$/)[1]);
  const slides = Object.keys(files)
    .filter((n) => n.startsWith("ppt/slides/"))
    .sort((a, b) => num(a) - num(b));
  if (!slides.length) throw new Error("This PowerPoint file has no slides.");
  return slides.map((name) => {
    const n = num(name);
    const lines = paragraphs(strFromU8(files[name]), "a:p", "a:t").map((p) => p.text);
    const notesXml = files[`ppt/notesSlides/notesSlide${n}.xml`];
    const notes = notesXml ? paragraphs(strFromU8(notesXml), "a:p", "a:t").map((p) => p.text).filter((t) => !/^\d+$/.test(t)) : [];
    return {
      locator: `slide ${n}`,
      title: lines[0] ?? "",
      text: [...lines.slice(1), ...(notes.length ? [`Speaker notes: ${notes.join(" ")}`] : [])].join("\n")
    };
  });
}

// PDF text from the extractDocument function, which marks pages [[Page N]].
export function sectionsFromPagedText(fullText) {
  const parts = String(fullText ?? "").split(/\[\[Page (\d+)\]\]/);
  const out = [];
  if (parts[0].trim()) out.push({ locator: "page 1", title: "", text: parts[0].trim() });
  for (let i = 1; i < parts.length; i += 2) {
    const text = (parts[i + 1] ?? "").trim();
    if (text) out.push({ locator: `page ${parts[i]}`, title: text.split("\n")[0].slice(0, 80), text });
  }
  return out;
}

// ---------- passages ----------

export function chunkSections(sections, docName) {
  const passages = [];
  for (const s of sections) {
    const body = `${s.title ? `${s.title}\n` : ""}${s.text}`.trim();
    if (!body) continue;
    let start = 0;
    while (start < body.length) {
      let end = Math.min(body.length, start + CHUNK);
      if (end < body.length) {
        // end on a sentence or line boundary when one is near
        const cut = Math.max(body.lastIndexOf(". ", end), body.lastIndexOf("\n", end));
        if (cut > start + CHUNK * 0.5) end = cut + 1;
      }
      passages.push({ id: `p${passages.length + 1}`, doc: docName, locator: s.locator, title: s.title, text: body.slice(start, end).trim() });
      if (end >= body.length) break;
      start = Math.max(end - OVERLAP, start + 1);
    }
  }
  return passages;
}

// ---------- BM25 search ----------

const STOP = new Set(
  "a an and are as at be by for from has have how in is it its of on or that the this to was were what when where which who why will with do does did you your we our they their can could would should about into than then there these those".split(
    " "
  )
);
// Light, consistent stemming: "messages" and "message" match, "queued" and "queue" may not.
const stem = (w) =>
  w.length > 5 && w.endsWith("ing")
    ? w.slice(0, -3)
    : w.length > 4 && w.endsWith("ed")
      ? w.slice(0, -2)
      : w.length > 3 && w.endsWith("s") && !w.endsWith("ss")
        ? w.slice(0, -1)
        : w;
export const tokenize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);

export function buildIndex(passages) {
  const docs = passages.map((p) => {
    const terms = tokenize(`${p.title} ${p.text}`);
    const tf = new Map();
    terms.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    return { p, tf, len: terms.length };
  });
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const avg = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  return { docs, df, avg, n: docs.length };
}

export function search(index, query, k = 4) {
  if (!index?.n) return [];
  const q = [...new Set(tokenize(query))];
  const K1 = 1.4;
  const B = 0.75;
  return index.docs
    .map((d) => {
      let score = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (index.n - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
        score += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / index.avg));
      }
      return { ...d.p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ---------- the document as the professor and the diagram see it ----------

export function buildDocument(name, sections) {
  const passages = chunkSections(sections, name);
  if (!passages.length) throw new Error("No readable text was found in this document.");
  const unit = sections[0]?.locator.startsWith("slide") ? "slides" : sections[0]?.locator.startsWith("page") ? "pages" : "sections";
  return { name, unit, sections: sections.length, passages, index: buildIndex(passages) };
}

export const outline = (doc, max = 18) =>
  doc.passages
    .filter((p, i, all) => p.title && all.findIndex((q) => q.locator === p.locator) === i)
    .slice(0, max)
    .map((p) => `${p.locator}: ${p.title.slice(0, 70)}`)
    .join("; ");

// Tool result for search_document: exact passages with where they came from.
export function searchResult(doc, query) {
  const hits = search(doc.index, query, 4);
  if (!hits.length)
    return `"${doc.name}" has nothing about "${query}". Say the document does not cover it, then explain from general knowledge and make clear that part is not from their material.`;
  return `From "${doc.name}" (cite the location when you use it; quote only what is written here):\n${hits
    .map((h) => `[${h.locator}] ${h.text.replace(/\s+/g, " ").slice(0, 600)}`)
    .join("\n")}\nTeach from these passages, using their terms, examples and numbers. If they only partly answer, say what the document says and what you are adding.`;
}

// Short text that grounds a generated diagram in the material (callTutor
// accepts up to 3000 characters).
export const groundingFor = (doc, query) =>
  search(doc.index, query, 4)
    .map((h) => `[${h.locator}] ${h.text}`)
    .join("\n\n")
    .slice(0, 3000);

// Appended to the professor's instructions while a document is active.
export const documentInstructions = (doc) =>
  `SOURCE DOCUMENT: the student uploaded their own material, "${doc.name}" (${doc.sections} ${doc.unit}). Outline: ${outline(doc) || "no headings found"}.
- Ground your teaching in it. Before explaining anything it may cover, call search_document with a short query, then teach from the passages it returns: use the document's terms, examples, definitions and numbers, and say where it comes from ("as your slide 4 puts it...").
- Diagrams and examples should match the document's own examples when it has them.
- If the document does not cover something, say so plainly, then explain from general knowledge and mark it as extra. Never invent quotes, page numbers or slide numbers.`;
