"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCreateListing } from "@/hooks/use-listings";
import { useInventory } from "@/hooks/use-inventory";
import { useQuery } from "@tanstack/react-query";
import { marketplacesApi } from "@/lib/api";
import { getMarketplaceLabel } from "@repo/utils";

const schema = z.object({
  inventoryItemId: z.string().min(1, "Select an inventory item"),
  marketplaceConnectionId: z.string().min(1, "Select a marketplace"),
  price: z.coerce.number().positive("Price must be positive"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewListingPage(): import("react").JSX.Element {
  const router = useRouter();
  const createMutation = useCreateListing();
  const { data: inventoryData } = useInventory({ status: "ACTIVE", limit: "100" });
  const { data: connectionsData } = useQuery({
    queryKey: ["marketplace-connections"],
    queryFn: marketplacesApi.listConnections,
  });

  const inventoryItems = inventoryData?.data ?? [];
  const connections = connectionsData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedItemId = watch("inventoryItemId");
  const selectedItem = inventoryItems.find((i: any) => i.id === selectedItemId);
  const selectedConnectionId = watch("marketplaceConnectionId");
  const selectedConnection = connections.find((c: any) => c.id === selectedConnectionId);

  async function onSubmit(values: FormValues) {
    await createMutation.mutateAsync({
      ...values,
      marketplace: selectedConnection?.marketplace,
    });
    router.push("/listings");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/listings">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create Listing</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Source & Destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Inventory Item *</Label>
              <Select onValueChange={(val) => {
                setValue("inventoryItemId", val);
                const item = inventoryItems.find((i: any) => i.id === val);
                if (item) {
                  setValue("title", item.title);
                  if (item.targetPrice) setValue("price", Number(item.targetPrice));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.inventoryItemId && <p className="text-sm text-destructive">{errors.inventoryItemId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Marketplace *</Label>
              <Select onValueChange={(val) => setValue("marketplaceConnectionId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select marketplace..." />
                </SelectTrigger>
                <SelectContent>
                  {connections.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No marketplaces connected
                    </SelectItem>
                  ) : (
                    connections.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getMarketplaceLabel(c.marketplace)}
                        {c.accountName ? ` (${c.accountName})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.marketplaceConnectionId && <p className="text-sm text-destructive">{errors.marketplaceConnectionId.message}</p>}
              {connections.length === 0 && (
                <p className="text-sm text-gray-500">
                  <Link href="/settings/marketplaces" className="text-blue-600 hover:underline">
                    Connect a marketplace
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/listings">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {(isSubmitting || createMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create listing
          </Button>
        </div>
      </form>
    </div>
  );
}

