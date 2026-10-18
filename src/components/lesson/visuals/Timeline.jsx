import React from "react";

// Events appear one by one as the professor reaches them.
export default function Timeline({ data, step }) {
  return (
    <ol className="relative mx-auto max-w-xl space-y-4 border-l-2 border-[#1F7A7A] py-2 pl-6" data-testid="visual-timeline">
      {data.events.map((e, i) => {
        const shown = i <= step;
        const current = i === step;
        return (
          <li
            key={i}
            className={`relative rounded-xl border p-3 transition-opacity ${shown ? "opacity-100" : "opacity-20"} ${
              current ? "border-[#1F7A7A] bg-[#E3F1F1]" : "border-[#E3E7EB] bg-white"
            }`}
          >
            <span className="absolute -left-[34px] top-4 h-4 w-4 rounded-full border-2 border-[#1F7A7A] bg-white" />
            <p className="font-semibold text-[#1B2A49]">{e.label}</p>
            <p className="text-sm text-[#5B6478]">{e.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}