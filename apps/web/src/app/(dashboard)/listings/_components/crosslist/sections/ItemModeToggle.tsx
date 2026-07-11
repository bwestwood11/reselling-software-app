"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "../../ui/SectionHeader";

interface Props {
  itemMode: "existing" | "new";
  onChange: (mode: "existing" | "new") => void;
}

export function ItemModeToggle({ itemMode, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.12)]">
      <SectionHeader step="01" title="Item" />
      <div className="mt-5">
        <Tabs value={itemMode} onValueChange={(v) => onChange(v as "existing" | "new")}>
          <TabsList className="h-9 w-full">
            <TabsTrigger value="existing" className="flex-1">
              Use existing item
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1">
              Create new item
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </section>
  );
}
