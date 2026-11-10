import { initials } from "@/lib/format";

const palette = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

// Same color for the same person everywhere in the app
function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({ name, seed, size = "size-10" }: { name: string; seed: string; size?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${size} ${colorFor(seed)}`}
    >
      {initials(name)}
    </span>
  );
}

export function GroupAvatar({ count }: { count: number }) {
  return (
    <span
      title={`${count + 1} participantes`}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
        <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1 16c0-2.8 2.7-5 6-5s6 2.2 6 5v1H1v-1zm13.5 1v-1c0-1.5-.5-2.8-1.4-3.9.3 0 .6-.1.9-.1 2.8 0 5 1.8 5 4v1h-4.5z" />
      </svg>
    </span>
  );
}
