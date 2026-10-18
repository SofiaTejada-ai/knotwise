import React, { useState } from "react";
import { parseGuess, differenceFrom, formatNumber } from "@/lib/functionRules";

// Predict then reveal: the student types a guess before the slider unlocks.
export default function PredictBox({ x, prediction, onSubmit }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  if (prediction) {
    return (
      <div className="rounded-2xl border border-[#E4DED2] bg-white p-4" data-testid="prediction-result">
        <p>
          You guessed <strong>{formatNumber(prediction.guess)}</strong>. The curve is at{" "}
          <strong className="text-[#1F7A7A]">{formatNumber(prediction.actual)}</strong> when x = {formatNumber(prediction.x)}.
        </p>
        <p className="text-[#5B6478]">Difference: {formatNumber(differenceFrom(prediction.guess, prediction.actual))}</p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const guess = parseGuess(text);
    if (guess === null) {
      setMessage("Please type a number, like 2.5.");
      return;
    }
    onSubmit(guess);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#E4DED2] bg-white p-4" data-testid="predict-form">
      <label htmlFor="guess" className="block font-semibold">
        Your guess: what is y when x = {formatNumber(x)}?
      </label>
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          id="guess"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => { setText(e.target.value); setMessage(""); }}
          aria-describedby="guess-message"
          className="h-11 w-40 rounded-lg border border-[#B9B2A3] bg-white px-3 text-[#1B2A49]"
        />
        <button type="submit" className="h-11 rounded-lg bg-[#2E8B8B] px-5 font-semibold text-white hover:bg-[#1F7A7A]">
          Show me the answer
        </button>
      </div>
      <p id="guess-message" role="status" className="mt-1 min-h-[1.6em] text-[#5B6478]">{message}</p>
    </form>
  );
}