"use client";

import Link from "next/link";
import { Avatar, GroupAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useChats } from "@/context/chats-context";
import { chatTitle, formatListDate, otherParticipants } from "@/lib/format";
import type { Chat } from "@/lib/types";

export function ChatList({ activeChatId }: { activeChatId?: string }) {
  const { chats, chatsError, reloadChats } = useChats();

  if (chatsError && !chats) {
    return (
      <div className="space-y-3 px-4 py-8 text-center text-sm text-slate-500">
        <p>{chatsError}</p>
        <Button variant="ghost" onClick={reloadChats}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!chats) return <ChatListSkeleton />;

  if (chats.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-slate-400">
        Aún no tienes conversaciones. Pulsa «Nuevo chat» para empezar.
      </p>
    );
  }

  return (
    <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
      {chats.map((chat) => (
        <li key={chat.id} className="animate-fade-in">
          <ChatListItem chat={chat} active={chat.id === activeChatId} />
        </li>
      ))}
    </ul>
  );
}

function ChatListItem({ chat, active }: { chat: Chat; active: boolean }) {
  const { user } = useAuth();
  const { unread } = useChats();
  const unreadCount = unread[chat.id] ?? 0;
  const others = otherParticipants(chat, user!.id);
  const last = chat.lastMessage;
  const author = last && (last.sender.id === user!.id ? "Tú" : others.length > 1 ? last.sender.name : null);

  return (
    <Link
      href={`/chats/${chat.id}`}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "bg-indigo-50" : "hover:bg-slate-50"
      }`}
    >
      {others.length > 1 ? (
        <GroupAvatar count={others.length} />
      ) : (
        <Avatar name={others[0]?.name ?? "?"} seed={others[0]?.id ?? chat.id} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm font-semibold ${active ? "text-indigo-700" : ""}`}>
            {chatTitle(chat, user!.id)}
          </p>
          <time className="shrink-0 text-[11px] text-slate-400" dateTime={chat.lastActivityAt}>
            {formatListDate(chat.lastActivityAt)}
          </time>
        </div>
        <div className="flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-xs ${unreadCount ? "font-medium text-slate-800" : "text-slate-500"}`}>
            {last ? (
              <>
                {author && <span className="font-medium text-slate-600">{author}: </span>}
                {last.content}
              </>
            ) : (
              <span className="italic text-slate-400">Sin mensajes todavía</span>
            )}
          </p>
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} sin leer`}
              className="animate-dialog-in rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ChatListSkeleton() {
  return (
    <ul aria-label="Cargando conversaciones" className="space-y-1 px-2">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 px-3 py-2.5">
          <span className="size-10 rounded-full bg-slate-200" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-2/3 rounded bg-slate-200" />
            <span className="block h-2.5 w-1/2 rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}
