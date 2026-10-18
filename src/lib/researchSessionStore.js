// Saved research sessions, kept separately from the live tutor sessions.
// Prototype storage: this browser on this device only.
const KEY = "cyber8_research_sessions";

export function loadResearchSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function saveResearchSession(session) {
  if (!session?.id) return;
  try {
    const sessions = loadResearchSessions().filter((s) => s.id !== session.id);
    sessions.unshift(session);
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch (err) {
    // Local storage full or unavailable: the study session continues regardless.
  }
}