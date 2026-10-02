"use client";
import { useEffect } from "react";
import { markNotificationsSeen } from "./actions";

/** Clears the bell's count once the list has been opened. */
export function MarkSeen({ unread }: { unread: number }) {
  useEffect(() => { if (unread > 0) void markNotificationsSeen(); }, [unread]);
  return null;
}
