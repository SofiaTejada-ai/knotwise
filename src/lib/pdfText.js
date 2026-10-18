// Reads a PDF's text layer in the browser with pdf.js (about a second for a
// typical lecture deck), one section per page. Loaded only when a PDF is
// picked. A scanned PDF has no text layer and comes back nearly empty; the
// caller then falls back to the slower server reader, which can read images.
export async function extractPdfSections(bytes, onPage) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const sections = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => (it.str ?? "") + (it.hasEOL ? "\n" : " "))
        .join("")
        .replace(/[ \t]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
      if (text) sections.push({ locator: `page ${n}`, title: text.split("\n")[0].slice(0, 80), text });
      page.cleanup();
      onPage?.(n, pdf.numPages);
    }
  } finally {
    await pdf.destroy();
  }
  return { sections, pages: pdf.numPages };
}

// Fewer than ~40 characters per page means there is no real text layer.
export const looksScanned = ({ sections, pages }) =>
  sections.reduce((a, s) => a + s.text.length, 0) < Math.max(200, pages * 40);
