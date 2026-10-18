import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const today = () => new Date().toISOString().slice(0, 10);

export default function MissedConcepts() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    base44.entities.ReviewItem.filter({}, { sort: "nextReviewDate", limit: 50 }).then((page) => setItems(page.items));
  }, []);

  if (items === null || items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[#E3E7EB] bg-white p-5" aria-label="Concepts to review">
      <h2 className="text-lg font-semibold text-[#1B2A49]">Concepts to review</h2>
      <p className="mt-1 text-sm text-[#5B6478]">Ideas you wanted another look at. No score, just a reminder.</p>
      <ul className="mt-3 divide-y divide-[#E3E7EB]">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid="missed-concept">
            <span className="font-medium text-[#1B2A49]">{i.concept}</span>
            <span className="text-sm text-[#5B6478]">
              Missed {i.missCount}x ·{" "}
              {i.nextReviewDate <= today() ? (
                <strong className="text-[#1F7A7A]">Review today</strong>
              ) : (
                `Review on ${i.nextReviewDate}`
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}