"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Avatar, GroupAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useChats } from "@/context/chats-context";
import { chatTitle, otherParticipants } from "@/lib/format";
import { OfflineBanner } from "./connection-status";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";

export function Conversation({ chatId }: { chatId: string }) {
  const { user } = useAuth();
  const { chats, conversation, openConversation } = useChats();
  const chat = chats?.find((c) => c.id === chatId);
  const state = conversation(chatId);

  useEffect(() => {
    void openConversation(chatId);
  }, [chatId, openConversation]);

  if (chats && !chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <p>Esta conversación no existe o no tienes acceso.</p>
        <Link href="/chats" className="font-semibold text-indigo-600">
          Volver a mis chats
        </Link>
      </div>
    );
  }

  const others = chat ? otherParticipants(chat, user!.id) : [];

  return (
    <div className="flex min-w-0 flex-1 animate-fade-in flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <Link href="/chats" aria-label="Volver" className="-ml-1 rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
            <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0z" />
          </svg>
        </Link>
        {chat ? (
          <>
            {others.length > 1 ? (
              <GroupAvatar count={others.length} />
            ) : (
              <Avatar name={others[0]?.name ?? "?"} seed={others[0]?.id ?? chat.id} />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{chatTitle(chat, user!.id)}</h1>
              <p className="text-xs text-slate-500">
                {others.length > 1 ? `${others.length + 1} participantes` : "Chat privado"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex animate-pulse items-center gap-3">
            <span className="size-10 rounded-full bg-slate-200" />
            <span className="h-3 w-32 rounded bg-slate-200" />
          </div>
        )}
      </header>

      <OfflineBanner />

      {state?.status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-500">
          <p>{state.error}</p>
          <Button variant="ghost" onClick={() => openConversation(chatId)}>
            Reintentar
          </Button>
        </div>
      ) : (
        <MessageList chatId={chatId} conversation={state} />
      )}

      <MessageComposer chatId={chatId} />
    </div>
  );
}
