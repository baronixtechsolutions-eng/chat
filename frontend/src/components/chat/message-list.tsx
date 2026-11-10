"use client";

import { Fragment, useLayoutEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { type Conversation, useChats } from "@/context/chats-context";
import { formatDay, formatTime, isSameDay } from "@/lib/format";
import type { Message } from "@/lib/types";

const STICK_TO_BOTTOM_PX = 120;

interface Props {
  chatId: string;
  conversation: Conversation | undefined;
}

export function MessageList({ chatId, conversation }: Props) {
  const { user } = useAuth();
  const { loadOlder } = useChats();
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previous = useRef({ firstId: "", lastId: "", scrollHeight: 0 });

  const messages = conversation?.messages ?? [];
  const firstId = messages[0]?.id ?? "";
  const lastId = messages.at(-1)?.id ?? "";
  const lastIsMine = messages.at(-1)?.sender.id === user!.id;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prev = previous.current;

    if (prev.firstId && firstId !== prev.firstId && lastId === prev.lastId) {
      // Older messages were added on top: keep the visible ones where they were
      el.scrollTop += el.scrollHeight - prev.scrollHeight;
    } else if (lastId !== prev.lastId && (stickToBottom.current || lastIsMine)) {
      el.scrollTo({ top: el.scrollHeight, behavior: prev.lastId ? "smooth" : "instant" });
    }
    previous.current = { firstId, lastId, scrollHeight: el.scrollHeight };
  }, [firstId, lastId, lastIsMine]);

  const handleScroll = () => {
    const el = containerRef.current!;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4"
      aria-live="polite"
    >
      {!conversation || conversation.status === "loading" ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        <p className="mt-10 animate-fade-in text-center text-sm text-slate-400">
          No hay mensajes todavía. ¡Escribe el primero!
        </p>
      ) : (
        <>
          {conversation.hasMore && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => loadOlder(chatId)}
                disabled={conversation.loadingOlder}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
              >
                {conversation.loadingOlder && <Spinner className="size-3" />}
                Cargar mensajes anteriores
              </button>
            </div>
          )}
          <ol className="space-y-1.5">
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              return (
                <Fragment key={message.id}>
                  {(!prev || !isSameDay(prev.createdAt, message.createdAt)) && (
                    <li className="py-3 text-center">
                      <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-medium text-slate-500">
                        {formatDay(message.createdAt)}
                      </span>
                    </li>
                  )}
                  <MessageBubble message={message} mine={message.sender.id === user!.id} />
                </Fragment>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <li className={`flex animate-message-in ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[65%] ${
          mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"
        }`}
      >
        <p className={`mb-0.5 text-xs font-semibold ${mine ? "text-indigo-100" : "text-indigo-600"}`}>
          {mine ? "Tú" : message.sender.name}
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        <time
          dateTime={message.createdAt}
          className={`mt-0.5 block text-right text-[10px] ${mine ? "text-indigo-200" : "text-slate-400"}`}
        >
          {formatTime(message.createdAt)}
        </time>
      </div>
    </li>
  );
}

function MessagesSkeleton() {
  const widths = ["w-48", "w-64", "w-40", "w-56", "w-32"];
  return (
    <ul aria-label="Cargando mensajes" className="space-y-3">
      {widths.map((width, i) => (
        <li key={i} className={`flex animate-pulse ${i % 2 ? "justify-end" : ""}`}>
          <span className={`h-12 rounded-2xl ${width} ${i % 2 ? "bg-indigo-100" : "bg-slate-200"}`} />
        </li>
      ))}
    </ul>
  );
}
