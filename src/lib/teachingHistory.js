// Structured record of everything taught in this live lesson, kept apart from
// the authoritative data (the real queue/stack) and from what is drawn.
//
// TeachingHistoryEvent = {
//   eventId, lessonId, nodeId, stepId, eventType, description,
//   stateBefore, stateAfter, timestamp          (+ args, seq for replay)
// }
// stateBefore/stateAfter are RECORDED SNAPSHOTS: replay only displays them,
// it never writes them back into the real data.

const MAX_EVENTS = 200;
const MAX_NOTES = 20;

export function createHistory() {
  const events = [];
  const students = []; // previous student questions
  const professor = []; // previous professor explanations
  const camera = []; // camera navigation history
  const focused = []; // previously focused nodes (distinct, in order)
  let counter = 0;

  const add = (ev) => {
    const full = { eventId: `evt_${++counter}`, timestamp: Date.now(), ...ev };
    events.push(full);
    if (events.length > MAX_EVENTS) events.shift();
    return full;
  };
  const note = (list, text) => {
    const t = String(text ?? "").trim();
    if (!t || list[list.length - 1]?.text === t) return;
    list.push({ text: t.slice(0, 400), at: Date.now() });
    if (list.length > MAX_NOTES) list.shift();
  };
  const noteCamera = (nodeId, via) => {
    if (!nodeId) return;
    if (camera[camera.length - 1]?.nodeId !== nodeId) camera.push({ nodeId, via, at: Date.now() });
    if (focused[focused.length - 1] !== nodeId) focused.push(nodeId);
    if (camera.length > 60) camera.shift();
    if (focused.length > 60) focused.shift();
  };
  const forLesson = (lessonId) => events.filter((e) => e.lessonId === lessonId);
  const touches = (e, id) => e.nodeId === id || e.args?.from_id === id || e.args?.to_id === id;

  // Find an event by its stepId or eventId; a bare number is a numbered step.
  const resolve = (lessonId, id) => {
    if (id === undefined || id === null || id === "") return null;
    const list = forLesson(lessonId);
    const key = /^\d+$/.test(String(id)) ? `step_${id}` : String(id);
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].stepId === key || list[i].eventId === key) return list[i];
    }
    return null;
  };

  const brief = (lessonId, labelOf, n = 12) =>
    forLesson(lessonId)
      .slice(-n)
      .map((e) => `${e.stepId} [${e.eventType}] ${labelOf(e.nodeId)}: ${e.description}`)
      .join("; ");

  return {
    events,
    students,
    professor,
    camera,
    focused,
    committed: null, // last committed visual state (snapshot)
    add,
    forLesson,
    touches,
    resolve,
    brief,
    noteStudent: (t) => note(students, t),
    noteProfessor: (t) => note(professor, t),
    noteCamera
  };
}