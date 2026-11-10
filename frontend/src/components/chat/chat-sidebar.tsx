"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { ChatList } from "./chat-list";
import { ConnectionStatus } from "./connection-status";
import { NewChatDialog } from "./new-chat-dialog";
import { NotificationToggle } from "./notification-toggle";

export function ChatSidebar({ activeChatId }: { activeChatId?: string }) {
  const { user, logout } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <Avatar name={user!.name} seed={user!.id} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user!.name}</p>
          <ConnectionStatus />
        </div>
        <NotificationToggle />
        <Button variant="ghost" onClick={handleLogout} loading={loggingOut} className="px-2.5 py-1.5 text-xs">
          Salir
        </Button>
      </header>

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversaciones</h2>
        <Button onClick={() => setDialogOpen(true)} className="px-3 py-1.5 text-xs">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
            <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z" />
          </svg>
          Nuevo chat
        </Button>
      </div>

      <ChatList activeChatId={activeChatId} />

      {dialogOpen && <NewChatDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
