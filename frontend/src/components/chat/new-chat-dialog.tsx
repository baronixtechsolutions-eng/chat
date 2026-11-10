"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useChats } from "@/context/chats-context";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

export function NewChatDialog({ onClose }: { onClose: () => void }) {
  const { createChat } = useChats();
  const router = useRouter();
  const [users, setUsers] = useState<User[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    api<User[]>("/users")
      .then((list) => !cancelled && setUsers(list))
      .catch((error) => !cancelled && setLoadError(error instanceof ApiError ? error.message : "No se pudieron cargar los usuarios"));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !creating && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating, onClose]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const term = query.trim().toLowerCase();
  const visible = users?.filter(
    (u) => u.name.toLowerCase().includes(term) || u.email.includes(term),
  );

  async function handleCreate() {
    setCreating(true);
    setCreateError([]);
    try {
      const chat = await createChat([...selected]);
      onClose();
      router.push(`/chats/${chat.id}`);
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.messages : ["No se pudo crear el chat"]);
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={() => !creating && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        className="flex max-h-[80vh] w-full max-w-md animate-dialog-in flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-slate-200 px-5 py-4">
          <h2 id="new-chat-title" className="text-base font-semibold">
            Nuevo chat
          </h2>
          <p className="text-xs text-slate-500">Elige una o varias personas.</p>
          <input
            type="search"
            placeholder="Buscar por nombre o correo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!users}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </header>

        <div className="min-h-40 flex-1 overflow-y-auto px-2 py-2">
          {loadError ? (
            <p className="px-3 py-6 text-center text-sm text-rose-600">{loadError}</p>
          ) : !visible ? (
            <UserListSkeleton />
          ) : visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              {users!.length === 0 ? "Todavía no hay otros usuarios registrados." : "Nadie coincide con la búsqueda."}
            </p>
          ) : (
            <ul>
              {visible.map((user) => (
                <li key={user.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 has-[:checked]:bg-indigo-50">
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggle(user.id)}
                      disabled={creating}
                      className="size-4 accent-indigo-600"
                    />
                    <Avatar name={user.name} seed={user.id} size="size-9" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{user.name}</span>
                      <span className="block truncate text-xs text-slate-500">{user.email}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="space-y-3 border-t border-slate-200 px-5 py-4">
          <Alert messages={createError} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={selected.size === 0} loading={creating}>
              {selected.size > 1 ? `Crear grupo (${selected.size})` : "Abrir chat"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function UserListSkeleton() {
  return (
    <ul aria-label="Cargando usuarios">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 px-3 py-2.5">
          <span className="size-4 rounded bg-slate-200" />
          <span className="size-9 rounded-full bg-slate-200" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 w-1/3 rounded bg-slate-200" />
            <span className="block h-2.5 w-1/2 rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}
