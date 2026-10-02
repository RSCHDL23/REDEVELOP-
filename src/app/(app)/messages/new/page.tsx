import { redirect } from "next/navigation";

/** The "New message to…" picker lands here and opens that conversation. */
export default async function NewMessage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  redirect(to && /^[\w-]{1,64}$/.test(to) ? `/messages/${to}` : "/messages");
}
