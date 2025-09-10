import type { ReactNode } from "react";

export default function Shell({
  left, center, right, top,
}: { left: ReactNode; center: ReactNode; right: ReactNode; top?: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col text-white">
      {top}
      {/* Fill the rest of viewport */}
      <div className="flex-1 px-3 sm:px-4 py-3">
        {/* minmax(0,1fr) + min-w-0 stop center from shrinking/clipping */}
        <div className="grid grid-cols-[300px,minmax(0,1fr),420px] gap-3 sm:gap-4 h-full">
          <aside className="rounded-2xl border border-white/10 bg-white/5 h-full overflow-hidden">{left}</aside>
          <main  className="rounded-2xl border border-white/10 bg-white/5 h-full overflow-hidden min-w-0">{center}</main>
          <aside className="rounded-2xl border border-white/10 bg-white/5 h-full overflow-hidden">{right}</aside>
        </div>
      </div>
    </div>
  );
}
