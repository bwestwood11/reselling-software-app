import { Input } from "@repo/ui";

export function AspectRow({
  aspect,
  value,
  customValue,
  onChange,
  onCustomChange,
  showEmpty = false,
}: {
  aspect: { name: string; required: boolean; suggestedValues: string[] };
  value: string;
  customValue: string;
  onChange: (val: string) => void;
  onCustomChange: (val: string) => void;
  showEmpty?: boolean;
}) {
  const needsValue = showEmpty && !value.trim();
  return (
    <div className="flex items-start gap-2">
      <div className="w-36 shrink-0 pt-2.5">
        <span className="text-xs font-medium text-zinc-700">
          {aspect.name}
          {aspect.required && <span className="ml-1 text-orange-400">*</span>}
        </span>
      </div>
      <div className="flex-1">
        {aspect.suggestedValues.length > 0 ? (
          <>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={[
                "w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400",
                needsValue ? "border-orange-300 bg-orange-50/50" : "border-zinc-200 bg-white",
              ].join(" ")}
            >
              <option value="">Select…</option>
              {aspect.suggestedValues.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
              <option value="__custom__">Other (type below)</option>
            </select>
            {value === "__custom__" && (
              <Input
                className="mt-1.5 border-zinc-200 focus-visible:ring-orange-400"
                placeholder={`Enter ${aspect.name}…`}
                value={customValue}
                onChange={(e) => onCustomChange(e.target.value)}
              />
            )}
          </>
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${aspect.name}…`}
            className={[
              "transition-colors focus-visible:ring-orange-400",
              needsValue ? "border-orange-300 bg-orange-50/50" : "border-zinc-200",
            ].join(" ")}
          />
        )}
      </div>
    </div>
  );
}
