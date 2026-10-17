import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AskTeacher({ send }) {
  const [q, setQ] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    send({ type: "ASK", question: v });
    setQ("");
  };
  return (
    <form onSubmit={submit} className="mt-6 space-y-2">
      <label htmlFor="ask-teacher" className="block text-sm font-medium text-slate-700">
        Ask the teacher a question
      </label>
      <div className="flex max-w-md gap-2">
        <Input
          id="ask-teacher"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your question"
        />
        <Button type="submit" variant="outline">
          Ask
        </Button>
      </div>
    </form>
  );
}