"use client";

import { useActionState } from "react";
import { createListing, updateListing, type ActionResult } from "@/actions/listings";
import { ImageUploader } from "@/components/ImageUploader";

type Category = { id: string; name: string };
type Region = { id: string; name: string };

type Listing = {
  id: string;
  title: string;
  description: string;
  category_id: string;
  region_id: string;
  price_info?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  website?: string | null;
};

type Props = {
  categories: Category[];
  regions: Region[];
  listing?: Listing;
};

const initialState: ActionResult | null = null;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {errors[0]}
    </p>
  );
}

function inputClass(hasError: boolean) {
  return [
    "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm",
    "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500",
    hasError
      ? "border-red-400 bg-red-50"
      : "border-gray-300 bg-white hover:border-gray-400",
  ].join(" ");
}

export function ListingForm({ categories, regions, listing }: Props) {
  const isEdit = !!listing;

  const action = isEdit
    ? updateListing.bind(null, listing.id)
    : createListing;

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => {
      return action(formData);
    },
    initialState,
  );

  const errors =
    state && !state.ok && state.errors ? state.errors : {};
  const serverError =
    state && !state.ok && state.message ? state.message : null;

  return (
    <form action={formAction} className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={listing?.title ?? ""}
          required
          autoComplete="off"
          className={inputClass(!!errors.title)}
          aria-describedby={errors.title ? "title-err" : undefined}
        />
        <FieldError errors={errors.title} />
      </div>

      {/* Category + Region */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={listing?.category_id ?? ""}
            required
            className={inputClass(!!errors.category_id)}
          >
            <option value="">— select —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError errors={errors.category_id} />
        </div>

        <div>
          <label htmlFor="region_id" className="block text-sm font-medium text-gray-700 mb-1">
            Region <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <select
            id="region_id"
            name="region_id"
            defaultValue={listing?.region_id ?? ""}
            required
            className={inputClass(!!errors.region_id)}
          >
            <option value="">— select —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <FieldError errors={errors.region_id} />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={listing?.description ?? ""}
          required
          className={inputClass(!!errors.description)}
        />
        <FieldError errors={errors.description} />
      </div>

      {/* Optional fields */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="price_info" className="block text-sm font-medium text-gray-700 mb-1">
            Price info
          </label>
          <input
            id="price_info"
            name="price_info"
            type="text"
            defaultValue={listing?.price_info ?? ""}
            placeholder="e.g. From $25 / person"
            className={inputClass(!!errors.price_info)}
          />
          <FieldError errors={errors.price_info} />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={listing?.website ?? ""}
            placeholder="https://"
            className={inputClass(!!errors.website)}
          />
          <FieldError errors={errors.website} />
        </div>

        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={listing?.contact_email ?? ""}
            className={inputClass(!!errors.contact_email)}
          />
          <FieldError errors={errors.contact_email} />
        </div>

        <div>
          <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            defaultValue={listing?.contact_phone ?? ""}
            className={inputClass(!!errors.contact_phone)}
          />
          <FieldError errors={errors.contact_phone} />
        </div>

        <div>
          <label htmlFor="contact_whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            id="contact_whatsapp"
            name="contact_whatsapp"
            type="tel"
            defaultValue={listing?.contact_whatsapp ?? ""}
            className={inputClass(!!errors.contact_whatsapp)}
          />
          <FieldError errors={errors.contact_whatsapp} />
        </div>
      </div>

      {/* Image uploader — only in edit mode */}
      {isEdit && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <ImageUploader listingId={listing.id} />
        </div>
      )}

      {/* Server-level error */}
      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {/* Success feedback */}
      {state?.ok && (
        <p role="status" className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-700">
          {isEdit ? "Listing updated — it will be reviewed before going live." : "Listing submitted for review."}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Submit listing"}
        </button>
      </div>
    </form>
  );
}
