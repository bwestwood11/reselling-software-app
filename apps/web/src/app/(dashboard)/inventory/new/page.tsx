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
import { useCreateInventoryItem } from "@/hooks/use-inventory";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  condition: z.enum([
    "NEW_WITH_TAGS",
    "NEW_WITHOUT_TAGS",
    "VERY_GOOD",
    "GOOD",
    "SATISFACTORY",
  ]),
  quantity: z.coerce.number().int().min(1),
  costPrice: z.coerce.number().positive().optional().or(z.literal("")),
  targetPrice: z.coerce.number().positive().optional().or(z.literal("")),
  category: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewInventoryItemPage(): import("react").JSX.Element {
  const router = useRouter();
  const createMutation = useCreateInventoryItem();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { condition: "GOOD", quantity: 1 },
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      costPrice: values.costPrice === "" ? undefined : values.costPrice,
      targetPrice: values.targetPrice === "" ? undefined : values.targetPrice,
    };

    await createMutation.mutateAsync(payload);
    router.push("/inventory");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add Inventory Item</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="e.g. Vintage Levi 501 Jeans Size 32x30" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="e.g. Levi's" {...register("brand")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="e.g. ITEM-001" {...register("sku")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condition *</Label>
              <Select
                defaultValue="GOOD"
                onValueChange={(val) => setValue("condition", val as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_WITH_TAGS">New with tags</SelectItem>
                  <SelectItem value="NEW_WITHOUT_TAGS">New without tags</SelectItem>
                  <SelectItem value="VERY_GOOD">Very good</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="SATISFACTORY">Satisfactory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe the item in detail..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Quantity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" min="1" {...register("quantity")} />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost price ($)</Label>
              <Input id="costPrice" type="number" step="0.01" placeholder="0.00" {...register("costPrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetPrice">List price ($)</Label>
              <Input id="targetPrice" type="number" step="0.01" placeholder="0.00" {...register("targetPrice")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="e.g. Clothing > Jeans" {...register("category")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Internal notes</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Notes visible only to you..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/inventory">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {(isSubmitting || createMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save item
          </Button>
        </div>
      </form>
    </div>
  );
}

