import type { CleaningWarning } from "@/types";

export default function WarningBanner({ warnings }: { warnings: CleaningWarning[] }) {
  if (warnings.length === 0) return null;
  const errors = warnings.filter((w) => w.level === "warning");
  const infos = warnings.filter((w) => w.level === "info");

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">Data warnings</p>
          <ul className="space-y-0.5">
            {errors.map((w, i) => (
              <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                <span className="mt-0.5">⚠</span>{w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {infos.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Auto-detected formats</p>
          <ul className="space-y-0.5">
            {infos.map((w, i) => (
              <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                <span className="mt-0.5">ℹ</span>{w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
