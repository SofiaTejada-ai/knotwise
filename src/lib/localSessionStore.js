// Prototype session storage: notes, completed nodes, quiz answers, hints and
// retries are saved in this browser's local storage, so they stay available
// on this device only.
const KEY = "cyber8_live_tutor_sessions";

export function loadSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

// Merges into the saved record, so fields written elsewhere (the review quiz
// and its results) survive later saves of the live lesson.
export function saveSession(session) {
  if (!session?.id) return;
  try {
    const all = loadSessions();
    const prev = all.find((s) => s.id === session.id);
    const sessions = all.filter((s) => s.id !== session.id);
    sessions.unshift({ ...prev, ...session });
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 30)));
  } catch (err) {
    // Local storage full or unavailable: the live lesson continues regardless.
  }
}

// Changes one saved session in place (late notes, quiz results). With a
// base record, a session that was never saved yet is created from it.
export function updateSavedSession(id, change, base = null) {
  const prev = loadSessions().find((s) => s.id === id) ?? base;
  if (prev) saveSession({ ...change(prev), id, savedAt: prev.savedAt });
}

export const loadSession = (id) => loadSessions().find((s) => s.id === id) ?? null;