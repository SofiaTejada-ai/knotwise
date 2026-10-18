import React from "react";

// Notes written on a whiteboard, one line per spoken step.
export default function Whiteboard({ data, step }) {
  return (
    <div className="mx-auto min-h-[260px] max-w-2xl rounded-2xl border-4 border-slate-300 bg-white p-6 shadow-inner" data-testid="visual-whiteboard">
      <ul className="space-y-4">
        {data.lines.map((l, i) => (
          <li
            key={i}
            className={`text-xl transition-opacity duration-500 ${i <= step ? "opacity-100" : "opacity-0"} ${
              i === step ? "font-semibold text-[#1F7A7A]" : "text-[#1B2A49]"
            }`}
          >
            {i + 1}. {l}
          </li>
        ))}
      </ul>
    </div>
  );
}