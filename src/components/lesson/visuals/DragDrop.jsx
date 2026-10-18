import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";

// Student sorts cards into groups, then checks. Feedback is gentle and
// there is no score: wrong cards simply go back to the pile.
export default function DragDrop({ data }) {
  const [place, setPlace] = useState(() => Object.fromEntries(data.items.map((i) => [i.id, "pile"])));
  const [msg, setMsg] = useState("");

  const onDragEnd = (r) => {
    if (!r.destination) return;
    setMsg("");
    setPlace((p) => ({ ...p, [r.draggableId]: r.destination.droppableId }));
  };

  const check = () => {
    const wrong = data.items.filter((i) => place[i.id] !== "pile" && place[i.id] !== i.zone);
    const left = data.items.filter((i) => place[i.id] === "pile").length;
    if (wrong.length) {
      setPlace((p) => ({ ...p, ...Object.fromEntries(wrong.map((w) => [w.id, "pile"])) }));
      setMsg(`${wrong.length} card${wrong.length > 1 ? "s" : ""} didn't fit there, so I moved ${wrong.length > 1 ? "them" : "it"} back. Try again.`);
    } else if (left) setMsg(`Nice so far. ${left} card${left > 1 ? "s are" : " is"} still in the pile.`);
    else setMsg("All sorted. Well done!");
  };

  const card = (item, index) => (
    <Draggable key={item.id} draggableId={item.id} index={index}>
      {(p) => (
        <div
          ref={p.innerRef}
          {...p.draggableProps}
          {...p.dragHandleProps}
          className="mb-2 rounded-lg border border-[#E3E7EB] bg-white p-2 text-sm text-[#1B2A49] shadow-sm"
        >
          {item.text}
        </div>
      )}
    </Draggable>
  );

  const zone = (id, title, tone) => (
    <Droppable droppableId={id} key={id}>
      {(p, snap) => (
        <div
          ref={p.innerRef}
          {...p.droppableProps}
          className={`min-h-[120px] rounded-xl border-2 border-dashed p-2 ${snap.isDraggingOver ? "border-[#1F7A7A] bg-[#E3F1F1]" : tone}`}
          data-testid={`zone-${id}`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5B6478]">{title}</p>
          {data.items.filter((i) => place[i.id] === id).map(card)}
          {p.placeholder}
        </div>
      )}
    </Droppable>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-3" data-testid="visual-dragdrop">
      <DragDropContext onDragEnd={onDragEnd}>
        {zone("pile", "Cards to sort", "border-slate-300 bg-slate-50")}
        <div className={`grid gap-3 ${data.zones.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {data.zones.map((z) => zone(z.id, z.title, "border-slate-300 bg-white"))}
        </div>
      </DragDropContext>
      <div className="flex items-center gap-3">
        <Button onClick={check} className="min-h-[44px]">Check my sorting</Button>
        <p className="text-sm text-[#5B6478]" role="status">{msg}</p>
      </div>
    </div>
  );
}