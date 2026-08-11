import { z } from "zod";

export const crosslistFormSchema = z.object({
  itemMode: z.enum(["existing", "new"]).default("existing"),
  inventoryItemId: z.string().optional(),

  // Shared listing fields — used both as the sell price/title/description sent to every
  // selected marketplace, and (in "new" item mode) as the created inventory item's title/description.
  price: z.coerce.number().positive("Price must be positive"),
  title: z.string().min(1, "Title is required").max(80, "eBay titles are max 80 characters"),
  description: z.string().optional(),

  // New inventory item fields (only required when itemMode === "new")
  // Note: there is no separate "target price" field here — the shared `price` field above
  // (the price sent to every selected marketplace) is also used as the item's target price.
  newBrand: z.string().optional(),
  newSku: z.string().optional(),
  newCondition: z
    .enum(["NEW_WITH_TAGS", "NEW_WITHOUT_TAGS", "VERY_GOOD", "GOOD", "SATISFACTORY"])
    .default("GOOD"),
  newQuantity: z.coerce.number().int().min(1).default(1),
  newCostPrice: z.coerce.number().positive().optional().or(z.literal("")),
  newWeight: z.coerce.number().positive().optional().or(z.literal("")),
  newCategory: z.string().optional(),
  newNotes: z.string().optional(),
  newSourceId: z.string().optional(),

  // eBay settings
  ebayCategoryId: z.string().optional(),
  ebayConditionId: z.string().optional(),
  ebayFulfillmentPolicyId: z.string().optional(),
  ebayPaymentPolicyId: z.string().optional(),
  ebayReturnPolicyId: z.string().optional(),
  ebayPostalCode: z.string().optional(),
  ebayLocation: z.string().optional(),
  ebayWeightLbs: z.coerce.number().positive().optional(),

  // Mercari settings
  mercariCategoryId: z.string().optional(),
  mercariBrandId: z.string().optional(),
  mercariSizeId: z.coerce.number().int().positive().optional(),
  mercariAddressId: z.coerce.number().int().optional(),
  mercariZipCode: z.string().optional(),

  // Poshmark settings
  poshmarkDepartmentId: z.string().optional(),
  poshmarkCategoryId: z.string().optional(),
  poshmarkSubcategoryId: z.string().optional(),
  poshmarkCondition: z.string().optional(),
  poshmarkBrand: z.string().optional(),
  poshmarkSizeId: z.string().optional(),
  poshmarkOriginalPrice: z.coerce.number().min(0).optional(),
  poshmarkShippingDiscount: z.string().optional(),
});

export type CrosslistFormValues = z.infer<typeof crosslistFormSchema>;
// Zod v4 gives z.coerce fields an `unknown` input type (pre-coercion) distinct from their
// output type — RHF needs the raw input shape for useForm's TFieldValues generic.
export type CrosslistFormInput = z.input<typeof crosslistFormSchema>;

export interface CrosslistFormProps {
  onClose: () => void;
}
