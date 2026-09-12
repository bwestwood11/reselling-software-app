import { Suspense } from "react";
import { InventoryWorkspace } from "@/components/inventory/InventoryWorkspace";

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense>
      <InventoryWorkspace currentSourceId={id} forcedView="sources" />
    </Suspense>
  );
}
