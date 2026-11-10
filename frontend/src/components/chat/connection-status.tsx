"use client";

import { useSocket } from "@/context/socket-context";

const labels = {
  connecting: { text: "Conectando…", dot: "bg-amber-400" },
  connected: { text: "En línea", dot: "bg-emerald-500" },
  reconnecting: { text: "Sin conexión", dot: "bg-rose-500" },
} as const;

export function ConnectionStatus() {
  const { status } = useSocket();
  const { text, dot } = labels[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
      <span className={`size-2 rounded-full transition-colors ${dot} ${status !== "connected" ? "animate-pulse" : ""}`} />
      {text}
    </span>
  );
}

/** Full-width notice shown on top of a conversation while the socket is down */
export function OfflineBanner() {
  const { status } = useSocket();
  if (status !== "reconnecting") return null;

  return (
    <div role="status" className="animate-fade-in bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
      Sin conexión con el servidor. Reintentando… Los mensajes nuevos aparecerán al reconectar.
    </div>
  );
}
