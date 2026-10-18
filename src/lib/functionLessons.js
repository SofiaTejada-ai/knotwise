// All hardcoded lesson data for the function graph lesson lives here.
// Four formulas only: linear, quadratic, exponential, sine.

const q = (concept, question, choices, correctIndex, why) => ({ concept, question, choices, correctIndex, why });

export const LESSONS = [
  {
    id: "linear",
    formula: "linear",
    name: "Linear",
    title: "Linear: y = ax + b",
    goal: "See how the slope a tilts a straight line.",
    defaults: { a: 1, b: 0 },
    slider: { key: "a", label: "Slope (a)", min: -3, max: 3, step: 0.1 },
    view: { xMin: -5, xMax: 5, yMin: -10, yMax: 10, tickX: 1, tickY: 2 },
    predictX: 3,
    instruction: "Drag the slider to change the slope a and watch the line tilt.",
    questions: [
      q("slope", "With b = 0, what does a bigger a do to the line?", ["It gets steeper", "It moves up without tilting", "It turns into a curve"], 0, "The slope a sets how steep the line is."),
      q("evaluating a line", "What is y when a = 2, b = 0 and x = 3?", ["5", "6", "9"], 1, "y = 2 × 3 = 6."),
      q("negative slope", "When a is negative, the line...", ["goes up to the right", "goes down to the right", "stays flat"], 1, "A negative slope means y falls as x grows.")
    ],
    takeaways: [
      "a is the slope: it sets how steep the line is.",
      "b is where the line crosses the y axis.",
      "A negative a makes the line fall as x grows."
    ]
  },
  {
    id: "quadratic",
    formula: "quadratic",
    name: "Quadratic",
    title: "Quadratic: y = ax²",
    goal: "See how a changes the width and direction of a U shape.",
    defaults: { a: 1 },
    slider: { key: "a", label: "Stretch (a)", min: -2, max: 2, step: 0.1 },
    view: { xMin: -5, xMax: 5, yMin: -10, yMax: 10, tickX: 1, tickY: 2 },
    predictX: 2,
    instruction: "Drag the slider to change a and watch the U stretch or flip.",
    questions: [
      q("parabola shape", "What shape is y = ax² when a is positive?", ["A U shape opening up", "A straight line", "A wave"], 0, "Squaring makes a U shape that opens upward."),
      q("squaring negatives", "What is y when a = 1 and x = -3?", ["-9", "9", "6"], 1, "(-3) × (-3) = 9, because a negative times a negative is positive."),
      q("sign of a", "What happens when a becomes negative?", ["The U flips upside down", "The U only gets wider", "Nothing changes"], 0, "A negative a turns the U upside down.")
    ],
    takeaways: [
      "x² is never negative, so with a positive a the curve stays above zero.",
      "A bigger a makes the U narrower and steeper.",
      "A negative a flips the U upside down."
    ]
  },
  {
    id: "exponential",
    formula: "exponential",
    name: "Exponential",
    title: "Exponential: y = a × b^x",
    goal: "See how the growth factor b makes a curve climb or fade.",
    defaults: { a: 1, b: 1.2 },
    slider: { key: "b", label: "Growth factor (b)", min: 0.5, max: 2, step: 0.05 },
    view: { xMin: -3, xMax: 8, yMin: -2, yMax: 10, tickX: 1, tickY: 2 },
    predictX: 5,
    instruction: "Drag the slider to change b and watch the curve grow faster or fade away.",
    questions: [
      q("exponential growth", "With a = 1 and b = 1.2, what happens to y as x grows?", ["It grows faster and faster", "It grows by the same amount each step", "It shrinks"], 0, "Each step multiplies y by 1.2, so the gains keep getting bigger."),
      q("starting value", "With a = 1, what is y when x = 0, for any b?", ["0", "1", "b"], 1, "Any number to the power 0 is 1, so y = a × 1 = 1."),
      q("decay", "If b is less than 1, the curve...", ["keeps growing", "fades toward zero", "turns into a wave"], 1, "Multiplying by a number below 1 makes y smaller each step.")
    ],
    takeaways: [
      "b is the number y is multiplied by for each step in x.",
      "When b is above 1 the curve grows, faster and faster.",
      "When b is below 1 the curve fades toward zero."
    ]
  },
  {
    id: "sine",
    formula: "sine",
    name: "Sine",
    title: "Sine: y = a sin(x)",
    goal: "See how a sets the height of a repeating wave.",
    defaults: { a: 1 },
    slider: { key: "a", label: "Wave height (a)", min: -3, max: 3, step: 0.1 },
    view: { xMin: -6, xMax: 6, yMin: -4, yMax: 4, tickX: 2, tickY: 1 },
    predictX: 1,
    instruction: "Drag the slider to change a and watch the wave grow taller or flip.",
    questions: [
      q("amplitude", "What does a do in y = a sin(x)?", ["Sets how tall the wave is", "Sets how wide each wave is", "Slides the wave left"], 0, "a stretches the wave up and down."),
      q("sine at zero", "What is y when x = 0?", ["0", "1", "a"], 0, "sin(0) = 0, so y = a × 0 = 0."),
      q("wave height", "When a = 2, how high does the wave reach?", ["1", "2", "4"], 1, "sin(x) peaks at 1, so the top is 2 × 1 = 2.")
    ],
    takeaways: [
      "The wave repeats forever in both directions.",
      "a sets how high and how low the wave goes.",
      "A negative a flips the wave upside down."
    ]
  }
];

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0];
}

export function introText(lesson) {
  return `Hi, I'm your professor. Before we touch the slider, take a guess: what is y when x = ${lesson.predictX}?`;
}