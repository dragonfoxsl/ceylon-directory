import { z } from "zod";

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));

// UUID regex pattern that validates UUID format (adjusted for zod v4 strict UUID validation)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listingSchema = z.object({
  title: z.string().trim().min(4, "Title too short").max(120),
  description: z.string().trim().min(20, "Description too short").max(4000),
  category_id: z.string().regex(uuidRegex, "Pick a category"),
  region_id: z.string().regex(uuidRegex, "Pick a region"),
  price_info: z.string().trim().max(120).optional().or(z.literal("")),
  contact_phone: optionalText,
  contact_whatsapp: optionalText,
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ListingInput = z.infer<typeof listingSchema>;
