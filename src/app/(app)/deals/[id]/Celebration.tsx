"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { SocialPost } from "@/components/SocialPost";
import { markReviewRequested } from "../actions";

const COLORS = ["#12a9ee", "#0b0d0e", "#f2d24b", "#1e6b3a", "#e85d75", "#ffffff"];

type Msg = { side: "buyer" | "seller"; clientName: string; body: string; phone?: string; email?: string };
type Post = { address: string; city: string; photoUrl: string | null; agentName: string; brokerage: string; phone: string; logoUrl: string | null; shareUrl: string };
type Review = { clientId: string | null; body: string; phone?: string; email?: string } | null;

const smsHref = (phone: string | undefined, body: string) => (phone ? `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}` : null);
const mailHref = (email: string | undefined, subject: string, body: string) => (email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null);

/** Closing day: confetti, then 1) after-closing checklist, 2) "Just Closed" post, 3) review request. */
export function Celebration({ address, dealId, messages, post, review }: { address: string; dealId: string; messages: Msg[]; post: Post; review: Review }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const [asked, setAsked] = useState(false);
  const m = messages[i];
  const close = () => router.replace(`/deals/${dealId}?tab=dates`, { scroll: false });
  const steps = review ? 3 : 2;

  async function ask() {
    if (review?.clientId) await markReviewRequested(review.clientId);
    setAsked(true);
  }

  return (
    <Modal labelledBy="celebrate-title" onClose={close}>
      {step === 1 && <div className="confetti" aria-hidden="true">
        {Array.from({ length: 80 }, (_, k) => (
          <i key={k} style={{ left: `${(k * 37) % 100}%`, background: COLORS[k % COLORS.length], animationDelay: `${(k % 20) * 0.08}s`, animationDuration: `${2.4 + (k % 7) * 0.25}s`, transform: `rotate(${k * 29}deg)` }} />
        ))}
      </div>}
      <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 6 }}>
        <span style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">🎉🏡🔑</span>
        <h2 id="celebrate-title" className="page-title" style={{ fontSize: 26 }}>It&apos;s closed! Congratulations!</h2>
        <p className="small" style={{ margin: 0 }}><span className="strong">{address}</span> is officially done. Way to go!</p>
        <span className="tiny muted">Step {step} of {steps}</span>
      </div>

      {step === 1 && m && (
        <div className="stack" style={{ gap: 8 }}>
          {messages.length > 1 && (
            <div className="chips" role="group" aria-label="Which client">
              {messages.map((x, k) => <button key={x.side} type="button" className="chip" aria-pressed={k === i} onClick={() => { setI(k); setCopied(false); }}>{x.side === "buyer" ? "Buyer" : "Seller"}</button>)}
            </div>
          )}
          <span className="strong">Send {m.clientName || "your client"} their after-closing checklist</span>
          <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10, maxHeight: 200, overflowY: "auto" }}>{m.body}</p>
          <div className="grid-2">
            {smsHref(m.phone, m.body) ? <a className="btn primary block" href={smsHref(m.phone, m.body)!}>Text it</a> : <span />}
            {mailHref(m.email, `Congratulations! Your after-closing checklist for ${address}`, m.body) ? <a className="btn primary block" href={mailHref(m.email, `Congratulations! Your after-closing checklist for ${address}`, m.body)!}>Email it</a> : <span />}
          </div>
          <button type="button" className="btn block" onClick={async () => { try { await navigator.clipboard.writeText(m.body); setCopied(true); } catch { /* blocked */ } }}>{copied ? "Copied ✓" : "Copy message"}</button>
          <button type="button" className="btn dark block" onClick={() => setStep(2)}>Next: Just Closed post →</button>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="strong">Share a &ldquo;Just Closed&rdquo; post</span>
          <SocialPost kind="just_closed" {...post} />
          <button type="button" className="btn dark block" onClick={() => (review ? setStep(3) : close())}>{review ? "Next: ask for a review →" : "Done"}</button>
        </div>
      )}

      {step === 3 && review && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="strong">Ask {m?.clientName || "your client"} for a review</span>
          <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--ground)", padding: 10, borderRadius: 10 }}>{review.body}</p>
          <div className="grid-2">
            {smsHref(review.phone, review.body) ? <a className="btn primary block" href={smsHref(review.phone, review.body)!} onClick={ask}>Text it</a> : <span />}
            {mailHref(review.email, "Would you leave me a quick review?", review.body) ? <a className="btn primary block" href={mailHref(review.email, "Would you leave me a quick review?", review.body)!} onClick={ask}>Email it</a> : <span />}
          </div>
          {asked && <span className="small strong" style={{ color: "var(--green)" }}>✓ Review request sent</span>}
          <span className="tiny muted">Add more review sites (Zillow, Google, Realtor.com) in Profile → Review sites.</span>
        </div>
      )}

      <button type="button" className="btn block" style={{ border: 0, background: "transparent" }} onClick={close}>{step === steps ? "Done" : "Skip for now"}</button>
    </Modal>
  );
}
