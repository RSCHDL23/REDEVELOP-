"use server";

import { revalidatePath } from "next/cache";
import { repo } from "@/lib/data";

export async function markNotificationsSeen() {
  await repo().updateMe({ notificationsSeenAt: new Date().toISOString() });
  revalidatePath("/", "layout");
}
