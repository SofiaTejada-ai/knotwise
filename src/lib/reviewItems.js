import { base44 } from "@/api/base44Client";
import { nextReviewDate } from "@/lib/functionRules";

// Saves (or bumps) a ReviewItem for a missed concept in a lesson.
export async function saveMissedConcept({ concept, lessonId }) {
  const found = await base44.entities.ReviewItem.filter({ lessonId, concept }, { limit: 1 });
  const existing = found.items?.[0];
  const missCount = (existing?.missCount ?? 0) + 1;
  const data = { concept, lessonId, missCount, nextReviewDate: nextReviewDate(missCount) };
  if (existing) await base44.entities.ReviewItem.update(existing.id, data);
  else await base44.entities.ReviewItem.create(data);
  return data;
}