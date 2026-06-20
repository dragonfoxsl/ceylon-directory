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

function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <p role="alert" id={id} className="mt-1.5 text-sm text-rejected">
      {errors[0]}
    </p>
  );
}

function inputClass(hasError: boolean) {
  return hasError ? "field !border-rejected/60" : "field";
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
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-ink">
          Title <span aria-hidden="true" className="text-accent">*</span>
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
        <FieldError errors={errors.title} id="title-err" />
      </div>

      {/* Category + Region */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category_id" className="mb-1.5 block text-sm font-medium text-ink">
            Category <span aria-hidden="true" className="text-accent">*</span>
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
          <label htmlFor="region_id" className="mb-1.5 block text-sm font-medium text-ink">
            Region <span aria-hidden="true" className="text-accent">*</span>
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
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-ink">
          Description <span aria-hidden="true" className="text-accent">*</span>
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
          <label htmlFor="price_info" className="mb-1.5 block text-sm font-medium text-ink">
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
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-ink">
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
          <label htmlFor="contact_email" className="mb-1.5 block text-sm font-medium text-ink">
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
          <label htmlFor="contact_phone" className="mb-1.5 block text-sm font-medium text-ink">
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
          <label htmlFor="contact_whatsapp" className="mb-1.5 block text-sm font-medium text-ink">
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
        <div className="rounded-xl border border-hairline bg-linen p-4">
          <ImageUploader listingId={listing.id} />
        </div>
      )}

      {/* Server-level error */}
      {serverError && (
        <p role="alert" className="rounded-lg border border-rejected/30 bg-rejected/10 px-4 py-3 text-sm text-rejected">
          {serverError}
        </p>
      )}

      {/* Success feedback */}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-approved/30 bg-approved/10 px-4 py-3 text-sm text-approved">
          {isEdit ? "Listing updated — it will be reviewed before going live." : "Listing submitted for review."}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Submit listing"}
        </button>
      </div>
    </form>
  );
}
