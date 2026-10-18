// Development timing log for the live lesson. It records only event names and
// short ids (never what anyone said) so lag can be traced to its source:
// voice command, scheduling, GSAP execution, camera, state commit or images.
const buf = [];

export function trace(ev, data = {}) {
  const e = { t: Math.round(performance.now()), ev, ...data };
  buf.push(e);
  if (buf.length > 300) buf.shift();
  return e;
}

export const getTrace = () => buf;

if (typeof window !== "undefined") window.__lessonTrace = buf;