"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { addWork, setImage } from "./actions";

type Kind = "headshot" | "logo" | "portfolio";

const SETTINGS: Record<Kind, { bucket: string; max: number; type: "image/png" | "image/jpeg" }> = {
  headshot: { bucket: "avatars", max: 600, type: "image/jpeg" },
  logo: { bucket: "logos", max: 600, type: "image/png" }, // PNG keeps transparent backgrounds
  portfolio: { bucket: "portfolio", max: 1400, type: "image/jpeg" },
};

/** Shrinks a photo in the browser so uploads are quick and small. */
async function resize(file: File, max: number, type: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), type, 0.85));
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

export function ImageUpload({ kind, userId, demo, label, className = "btn", children, askLabel }: {
  kind: Kind; userId: string; demo: boolean; label: string; className?: string; children?: ReactNode; askLabel?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Pick a photo (JPG, PNG or HEIC).");
    if (file.size > 20 * 1024 * 1024) return setError("That photo is over 20 MB.");
    const caption = askLabel ? window.prompt("Add a short caption (optional)", "") ?? "" : "";
    setBusy(true);
    try {
      const { bucket, max, type } = SETTINGS[kind];
      const blob = await resize(file, max, type);
      let value: string;
      if (demo) {
        value = await toDataUrl(blob);
      } else {
        // Files go in a folder named with your user id; the database only allows that folder.
        const path = `${userId}/${kind}-${Date.now()}.${type === "image/png" ? "png" : "jpg"}`;
        const { error: upErr } = await createClient().storage.from(bucket).upload(path, blob, { contentType: type, upsert: false });
        if (upErr) throw upErr;
        value = path;
      }
      const res = kind === "portfolio" ? await addWork(value, caption) : await setImage(kind, value);
      if (res.error) setError(res.error);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} aria-label={label} />
      <button type="button" className={className} onClick={() => input.current?.click()} disabled={busy} aria-label={label}>
        {busy ? "Uploading…" : children ?? label}
      </button>
      {error && <span className="error" role="alert">{error}</span>}
    </>
  );
}
