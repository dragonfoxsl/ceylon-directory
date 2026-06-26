"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

type ImageRow = {
  id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
  publicUrl: string;
};

export function ImageUploader({ listingId }: { listingId: string }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing images on mount
  useEffect(() => {
    let active = true;
    supabase
      .from("listing_images")
      .select("id, storage_path, sort_order, is_cover")
      .eq("listing_id", listingId)
      .order("sort_order")
      .then(({ data }) => {
        if (!active || !data) return;
        const rows: ImageRow[] = data.map((row) => ({
          ...row,
          publicUrl: supabase.storage
            .from("listing-images")
            .getPublicUrl(row.storage_path).data.publicUrl,
        }));
        setImages(rows);
      });
    return () => {
      active = false;
    };
  }, [listingId, supabase]);

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const invalid = files.find((f) => !ALLOWED_TYPES.has(f.type));
    if (invalid) {
      setError(`"${invalid.name}" is not a supported format. Use JPG, PNG, WebP, or GIF.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" is too large. Maximum file size is 8 MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const currentMax = images.reduce(
        (max, img) => Math.max(max, img.sort_order),
        -1,
      );
      const hasCover = images.some((img) => img.is_cover);

      const newImages: ImageRow[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storagePath = `${user.id}/${listingId}/${crypto.randomUUID()}-${file.name}`;

        const { error: uploadErr } = await supabase.storage
          .from("listing-images")
          .upload(storagePath, file);

        if (uploadErr) throw new Error(uploadErr.message);

        const sortOrder = currentMax + 1 + i;
        const isCover = !hasCover && i === 0;

        const { data: row, error: insertErr } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listingId,
            storage_path: storagePath,
            sort_order: sortOrder,
            is_cover: isCover,
          })
          .select("id, storage_path, sort_order, is_cover")
          .single();

        if (insertErr) {
          // The object uploaded but its DB row failed — remove the now-orphaned
          // file so storage doesn't accumulate unreferenced uploads.
          await supabase.storage.from("listing-images").remove([storagePath]);
          throw new Error(insertErr.message);
        }

        const publicUrl = supabase.storage
          .from("listing-images")
          .getPublicUrl(storagePath).data.publicUrl;

        newImages.push({ ...row, publicUrl });
      }

      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(img: ImageRow) {
    setError(null);
    const { error: removeErr } = await supabase.storage
      .from("listing-images")
      .remove([img.storage_path]);
    if (removeErr) {
      setError(removeErr.message);
      return;
    }
    const { error: deleteErr } = await supabase
      .from("listing_images")
      .delete()
      .eq("id", img.id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    setImages((prev) => prev.filter((x) => x.id !== img.id));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">Photos</p>
      <p className="text-xs text-muted">
        JPG, PNG, WebP, or GIF — max 8 MB each. The first photo becomes the cover.
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative h-24">
              <Image
                src={img.publicUrl}
                alt={img.is_cover ? "Cover photo" : "Listing photo"}
                fill
                sizes="160px"
                className="rounded-lg border border-hairline object-cover"
              />
              {img.is_cover && (
                <span className="chip chip-featured absolute left-1 top-1 !px-1.5 !py-0.5 !text-[10px]">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(img)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-rejected text-xs font-bold text-white shadow transition-opacity hover:opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <span className="sr-only">Upload photos</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFiles}
          disabled={uploading}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-accent/10 disabled:opacity-50"
        />
      </label>
      {uploading && (
        <p className="animate-pulse text-sm text-accent">Uploading…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rejected">
          {error}
        </p>
      )}
    </div>
  );
}
