import Link from "next/link";
import { listNotices } from "@/lib/data/notifications";

/** Logo plus Messages and the notification bell, on every signed-in screen. */
export async function TopBar() {
  let unread = 0;
  let messages = 0;
  try {
    const n = await listNotices();
    unread = n.unread;
    messages = n.unreadMessages;
  } catch {
    // Signed out or offline: show the icons without counts.
  }
  return (
    <header className="topbar">
      <Link href="/today" aria-label="REschedule home"><img src="/wordmark-light.png" alt="REschedule" style={{ height: 22, width: "auto", display: "block" }} /></Link>
      <nav className="row" style={{ gap: 8 }} aria-label="Messages and notifications">
        <Link href="/messages" className="icon-btn" aria-label={messages ? `Messages, ${messages} unread` : "Messages"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /></svg>
          {messages > 0 && <span className="badge">{messages > 9 ? "9+" : messages}</span>}
        </Link>
        <Link href="/notifications" className="icon-btn" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
        </Link>
      </nav>
    </header>
  );
}
