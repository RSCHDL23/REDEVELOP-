"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { SocialPost } from "@/components/SocialPost";

/** Shown right after a new deal is created. */
export function UnderContract({ dealId, post }: {
  dealId: string;
  post: { address: string; city: string; photoUrl: string | null; agentName: string; brokerage: string; phone: string; logoUrl: string | null; shareUrl: string };
}) {
  const router = useRouter();
  const close = () => router.replace(`/deals/${dealId}`, { scroll: false });
  return (
    <Modal labelledBy="uc-title" onClose={close}>
      <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 4 }}>
        <span style={{ fontSize: 42, lineHeight: 1 }} aria-hidden="true">🏡✍️</span>
        <h2 id="uc-title" className="page-title" style={{ fontSize: 24 }}>Under contract!</h2>
        <p className="small" style={{ margin: 0 }}>Your dates are set. Want to share the news?</p>
      </div>
      <SocialPost kind="under_contract" {...post} />
      <button type="button" className="btn block" style={{ border: 0, background: "transparent" }} onClick={close}>Not now</button>
    </Modal>
  );
}
