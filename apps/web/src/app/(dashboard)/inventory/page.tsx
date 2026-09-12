"use client";

import { Suspense } from "react";
import { InventoryWorkspace } from "@/components/inventory/InventoryWorkspace";

export default function InventoryPage(): import("react").JSX.Element {
  return (
    <Suspense>
      <InventoryWorkspace currentSourceId={null} />
    </Suspense>
  );
}
