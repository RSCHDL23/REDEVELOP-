import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";

/** The address people use to reach this app, e.g. https://reschedule.vercel.app */
export async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteUrl;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
