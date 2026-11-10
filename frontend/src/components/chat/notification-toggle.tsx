"use client";

import { useEffect, useState } from "react";

/** Asks for permission only when the user clicks: browsers block prompts nobody asked for */
export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  useEffect(() => {
    // Notification only exists in the browser, so it is read after mounting
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  if (permission !== "default") return null;

  return (
    <button
      onClick={async () => setPermission(await Notification.requestPermission())}
      title="Activar notificaciones"
      aria-label="Activar notificaciones"
      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path d="M10 2a6 6 0 0 0-6 6v2.6l-1.3 2.6A1 1 0 0 0 3.6 15h12.8a1 1 0 0 0 .9-1.8L16 10.6V8a6 6 0 0 0-6-6zm0 16a2.5 2.5 0 0 1-2.4-2h4.8a2.5 2.5 0 0 1-2.4 2z" />
      </svg>
    </button>
  );
}
