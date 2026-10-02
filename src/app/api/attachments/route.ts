import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";

const TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic"]);
const MAX = 10 * 1024 * 1024;

/** Uploads a document (e.g. a pre-approval letter) to attach to showing requests. */
export async function POST(req: NextRequest) {
  // Same-site only (the browser sends Origin on uploads).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Upload a file." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a file." }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Use a PDF, JPG, PNG or HEIC file." }, { status: 400 });
  if (file.size === 0 || file.size > MAX) return NextResponse.json({ error: "Files can be up to 10 MB." }, { status: 400 });
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = file.name.replace(/[\\/\0]/g, "_").slice(0, 120) || "document";
    const saved = await repo().saveAttachment({ name, mime: file.type, bytes });
    return NextResponse.json({ id: saved.id, name, url: `/d/${saved.token}` });
  } catch {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}
