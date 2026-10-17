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

export function saveSession(session) {
  if (!session?.id) return;
  try {
    const sessions = loadSessions().filter((s) => s.id !== session.id);
    sessions.unshift(session);
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch (err) {
    // Local storage full or unavailable: the live lesson continues regardless.
  }
}