import React from "react";
import { formatNumber } from "@/lib/functionRules";

const RELEASE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

// One large slider. It updates the graph while dragging and reports on release only.
export default function ParamSlider({ slider, value, onChange, onRelease, disabled }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor="param-slider" className="font-semibold">{slider.label}</label>
        <output htmlFor="param-slider" className="font-semibold text-[#1F7A7A]">{formatNumber(value)}</output>
      </div>
      <input
        id="param-slider"
        type="range"
        className="fg-slider"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        disabled={disabled}
        aria-describedby="slider-hint"
        aria-valuetext={`${slider.label} ${formatNumber(value)}`}
        onChange={(e) => onChange(e.target.value)}
        onPointerUp={onRelease}
        onTouchEnd={onRelease}
        onKeyUp={(e) => RELEASE_KEYS.includes(e.key) && onRelease()}
      />
      <p id="slider-hint" className="text-[0.85em] text-[#5B6478]">
        {disabled ? "Make a guess first to unlock the slider." : "Drag, or use the arrow keys."}
      </p>
    </div>
  );
}