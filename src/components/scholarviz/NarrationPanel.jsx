import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import TopicChips from "./TopicChips";

export default function NarrationPanel({
  messages,
  isLoading,
  error,
  onRetry,
  onSend,
  suggestions,
  topics,
  topic,
  onTopic,
  onClearTopic
}) {
  const feedRef = useRef(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [messages, isLoading, error]);

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    onSend(q);
  };

  return (
    <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !isLoading && (
          <div className="space-y-3 py-4 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-blue-500" />
            <p className="text-sm text-slate-600">Press the microphone and ask out loud, or pick a question:</p>
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => onSend(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {m.spoken && <span className="mr-1 text-xs font-medium text-blue-500">spoken question:</span>}
              {m.text}
            </div>
          ) : (
            <div key={i} className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
              {m.text}
            </div>
          )
        )}
        {isLoading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            composing scene…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>
      <TopicChips topics={topics} selected={topic} onSelect={onTopic} onClear={onClearTopic} />
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Or type your question"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send question">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}