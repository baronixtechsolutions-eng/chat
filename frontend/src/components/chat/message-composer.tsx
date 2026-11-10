"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useChats } from "@/context/chats-context";
import { useSocket } from "@/context/socket-context";

const MAX_LENGTH = 2000;

export function MessageComposer({ chatId }: { chatId: string }) {
  const { sendMessage } = useChats();
  const { status } = useSocket();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const connected = status === "connected";
  const trimmed = content.trim();
  const tooLong = content.length > MAX_LENGTH;
  const canSend = connected && !sending && trimmed.length > 0 && !tooLong;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const failure = await sendMessage(chatId, trimmed);
    setSending(false);
    if (failure) {
      // Keep the text so the user can retry without typing it again
      setError(failure);
      return;
    }
    setContent("");
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="border-t border-slate-200 bg-white px-4 py-3"
    >
      {error && (
        <p role="alert" className="mb-2 animate-fade-in text-xs text-rose-600">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          readOnly={sending}
          placeholder={connected ? "Escribe un mensaje…" : "Esperando conexión…"}
          aria-label="Mensaje"
          className="field-sizing-content max-h-36 min-h-10 flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {sending ? (
            <Spinner />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path d="M3.1 2.3a.75.75 0 0 0-1 .9l1.9 6.1a.75.75 0 0 0 .7.5h6.55a.75.75 0 0 1 0 1.5H4.7a.75.75 0 0 0-.7.5l-1.9 6.1a.75.75 0 0 0 1 .9l15-7.5a.75.75 0 0 0 0-1.3l-15-7.7z" />
            </svg>
          )}
        </button>
      </div>
      {content.length > MAX_LENGTH * 0.9 && (
        <p className={`mt-1 text-right text-[11px] ${tooLong ? "text-rose-600" : "text-slate-400"}`}>
          {content.length}/{MAX_LENGTH}
        </p>
      )}
    </form>
  );
}
