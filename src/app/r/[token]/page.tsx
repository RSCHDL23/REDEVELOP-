import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "Leave a review" };

/** Private review link sent to a client (no account needed). */
export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const target = await repo().getReviewTarget(token);
  if (!target) notFound();
  const agentFirst = target.agentName.split(" ")[0];
  return (
    <div className="shell">
      <main className="page">
        <img src="/wordmark-light.png" alt="REschedule" style={{ height: 24, width: "auto", alignSelf: "flex-start" }} />
        <h1 className="page-title">Review {target.agentName}</h1>
        {target.already && <p className="notice small">You already left a review. Sending again updates it.</p>}
        <ReviewForm token={token} agentFirst={agentFirst} clientFirst={target.clientFirst} sites={target.reviewLinks} />
      </main>
    </div>
  );
}
