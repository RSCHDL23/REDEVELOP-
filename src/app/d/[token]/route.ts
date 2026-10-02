import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { repo } from "@/lib/data";
import { isDemoMode, supabaseUrl } from "@/lib/env";

/**
 * Private document link (/d/<token>), for listing agents who aren't on REschedule.
 * Links expire after 14 days. The file is never public: the server checks the
 * token, then hands out a 5-minute download link.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-z0-9]{20,80}$/i.test(token)) return new NextResponse("This link isn't valid.", { status: 404 });
  const file = await repo().getAttachment(token);
  if (!file) return new NextResponse("This link has expired or isn't valid. Ask the agent to send it again.", { status: 404 });

  const headers = {
    "Content-Type": file.mime,
    "Content-Disposition": `inline; filename="${file.name.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  };
  if (isDemoMode && file.bytes) return new NextResponse(Buffer.from(file.bytes), { headers });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !file.path) return new NextResponse("Document links need the SUPABASE_SERVICE_ROLE_KEY setting. See the README.", { status: 503 });
  const admin = createAdmin(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.storage.from("showing-docs").createSignedUrl(file.path, 300, { download: false });
  if (error || !data) return new NextResponse("Couldn't open the document.", { status: 500 });
  return NextResponse.redirect(data.signedUrl, 302);
}
