"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import type { AccountabilityPerson } from "@repo/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, PERSON_COLORS } from "./shared";

interface Props {
  open: boolean;
  people: AccountabilityPerson[];
  /** How many active tasks each person has — shown before removing them. */
  taskCounts: Record<string, number>;
  busy: boolean;
  onAdd: (input: { name: string; color: string }) => void;
  onUpdate: (id: string, input: { name?: string; color?: string }) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function PeopleDialog({ open, people, taskCounts, busy, onAdd, onUpdate, onRemove, onClose }: Props) {
  const nextColor = PERSON_COLORS[people.length % PERSON_COLORS.length]!;
  const [name, setName] = useState("");
  const [color, setColor] = useState(nextColor);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setColor(nextColor);
      setConfirmingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setColor(nextColor), [nextColor]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>People</DialogTitle>
          <DialogDescription>
            Add the people who help you — a VA, a partner, family — and give them their own daily
            tasks. They don&apos;t need an Omventa login.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3 rounded-xl border border-zinc-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onAdd({ name: name.trim(), color });
            setName("");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="person-name">Name</Label>
            <div className="flex gap-2">
              <Avatar person={{ name: name || "?", color }} size={40} />
              <Input
                id="person-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sam"
              />
            </div>
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <Button
            type="submit"
            disabled={!name.trim() || busy}
            className="w-full bg-orange-600 text-white hover:bg-orange-500"
          >
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Add person
          </Button>
        </form>

        {people.length > 0 && (
          <ul className="divide-y divide-zinc-100">
            {people.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar person={p} />
                  <Input
                    aria-label={`Name for ${p.name}`}
                    defaultValue={p.name}
                    maxLength={60}
                    className="h-9"
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== p.name) onUpdate(p.id, { name: next });
                      else e.target.value = p.name;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmingId(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 pl-11">
                  <ColorPicker value={p.color} onChange={(c) => onUpdate(p.id, { color: c })} compact />
                </div>
                {confirmingId === p.id && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    <p>
                      Remove {p.name}
                      {taskCounts[p.id]
                        ? ` and their ${taskCounts[p.id]} task${taskCounts[p.id] === 1 ? "" : "s"}`
                        : ""}
                      ? Days already tracked keep their history.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-600 text-white hover:bg-red-500"
                        onClick={() => {
                          onRemove(p.id);
                          setConfirmingId(null);
                        }}
                      >
                        Remove {p.name}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                        Keep
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ColorPicker({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (color: string) => void;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-1.5">
      {PERSON_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={`grid place-items-center rounded-full text-white ring-offset-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
            compact ? "h-5 w-5" : "h-7 w-7"
          } ${value === c ? "ring-2 ring-zinc-900" : ""}`}
          style={{ background: c }}
        >
          {value === c && <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
