"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
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

        if (insertErr) throw new Error(insertErr.message);

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
      <p className="text-sm font-medium text-gray-700">Photos</p>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.publicUrl}
                alt=""
                className="h-24 w-full rounded-lg object-cover border border-gray-200"
              />
              {img.is_cover && (
                <span className="absolute top-1 left-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(img)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                ×
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
          accept="image/*"
          multiple
          onChange={handleFiles}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
        />
      </label>
      {uploading && (
        <p className="text-sm text-teal-600 animate-pulse">Uploading…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
