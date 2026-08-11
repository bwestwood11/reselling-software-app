import { z } from "zod";

export const listingFormSchema = z.object({
  inventoryItemId: z.string().min(1, "Select an inventory item"),
  marketplaceConnectionId: z.string().min(1, "Select a marketplace"),
  price: z.coerce.number().positive("Price must be positive"),
  title: z.string().min(1, "Title is required").max(80, "eBay titles are max 80 characters"),
  description: z.string().optional(),
  ebayCategoryId: z.string().optional(),
  ebayConditionId: z.string().optional(),
  ebayFulfillmentPolicyId: z.string().optional(),
  ebayPaymentPolicyId: z.string().optional(),
  ebayReturnPolicyId: z.string().optional(),
  ebayPostalCode: z.string().optional(),
  ebayLocation: z.string().optional(),
  ebayWeightLbs: z.coerce.number().positive().optional(),
  mercariCategoryId: z.string().optional(),
  mercariBrandId: z.string().optional(),
  mercariSizeId: z.coerce.number().int().positive().optional(),
  mercariAddressId: z.coerce.number().int().optional(),
  mercariZipCode: z.string().optional(),
  poshmarkDepartmentId: z.string().optional(),
  poshmarkCategoryId: z.string().optional(),
  poshmarkSubcategoryId: z.string().optional(),
  poshmarkCondition: z.string().optional(),
  poshmarkBrand: z.string().optional(),
  poshmarkSizeId: z.string().optional(),
  poshmarkOriginalPrice: z.coerce.number().min(0).optional(),
  poshmarkShippingDiscount: z.string().optional(),
});

export type FormValues = z.infer<typeof listingFormSchema>;
// Zod v4 gives z.coerce fields an `unknown` input type (pre-coercion) distinct from their
// `number` output type — RHF needs the raw input shape for useForm's TFieldValues generic.
export type FormInput = z.input<typeof listingFormSchema>;

export interface CreateListingFormProps {
  defaultInventoryItemId?: string;
  /** Resolved marketplace connection ID — pre-selects the Marketplace dropdown */
  defaultConnectionId?: string;
  onClose: () => void;
}

export const EBAY_CONDITIONS = [
  { id: "1000", label: "New with tags" },
  { id: "1500", label: "New without tags" },
  { id: "2000", label: "New with defects" },
  { id: "2500", label: "New other" },
  { id: "3000", label: "Pre-owned" },
] as const;

export function defaultEbayConditionId(condition?: string): string {
  const map: Record<string, string> = {
    NEW_WITH_TAGS: "1000",
    NEW_WITHOUT_TAGS: "1500",
    VERY_GOOD: "3000",
    GOOD: "3000",
    SATISFACTORY: "3000",
  };
  return map[condition ?? "GOOD"] ?? "3000";
}
