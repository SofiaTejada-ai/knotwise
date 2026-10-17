import * as L from "@/lib/safeStepsLogic";

// Approved sources for the visual tutor: the same government sources the
// lesson already uses. The backend only ever returns one of these ids.
export const APPROVED_SOURCES = [
  {
    id: "S1",
    passage:
      "Fake delivery messages push you to act fast, for example by saying the package will be sent back, and their links can open look-alike websites that collect your information.",
    publisher: L.SOURCES.S1.publisher,
    title: L.SOURCES.S1.title,
    date: L.SOURCES.S1.date,
    url: L.SOURCES.S1.url
  },
  {
    id: "S2",
    passage:
      "Before you trust a message, check if you know the sender. Phishing messages often use a general greeting and ask you to pay or give information through a link.",
    publisher: L.SOURCES.S2.publisher,
    title: L.SOURCES.S2.title,
    date: L.SOURCES.S2.date,
    url: L.SOURCES.S2.url
  },
  {
    id: "S3",
    passage: "In 2024, people reported losing 470 million dollars to scams that started with a text.",
    publisher: L.SOURCES.S3.publisher,
    title: L.SOURCES.S3.title,
    date: L.SOURCES.S3.date,
    url: L.SOURCES.S3.url
  }
];