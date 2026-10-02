"use client";

import { useState } from "react";
import { SocialPost } from "@/components/SocialPost";

export function AnniversaryCard({ name, when, years, message, phone, email, post }: {
  name: string; when: string; years: number; message: string; phone: string; email: string;
  post: { address: string; city: string; photoUrl: string | null; agentName: string; brokerage: string; phone: string; logoUrl: string | null; shareUrl: string; clientName: string };
}) {
  const [showPost, setShowPost] = useState(false);
  const sms = phone ? `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}` : null;
  const mail = email ? `mailto:${email}?subject=${encodeURIComponent(`Happy home anniversary, ${name.split(" ")[0]}!`)}&body=${encodeURIComponent(message)}` : null;
  return (
    <article className="card">
      <div className="between" style={{ alignItems: "flex-start" }}>
        <span className="stack" style={{ gap: 2 }}>
          <span className="strong">{name}</span>
          <span className="small muted">{years} year{years > 1 ? "s" : ""} in their home · {when}</span>
        </span>
        <span className="pill" style={{ background: "#f1e6f7", color: "#6c2f87" }}>🎉 {years}</span>
      </div>
      <p className="small" style={{ margin: 0, background: "var(--ground)", padding: 10, borderRadius: 10 }}>{message}</p>
      <div className="grid-3">
        {sms ? <a className="btn primary block" href={sms}>Text</a> : <span />}
        {mail ? <a className="btn primary block" href={mail}>Email</a> : <span />}
        <button type="button" className="btn block" onClick={() => setShowPost((v) => !v)}>{showPost ? "Hide post" : "Post"}</button>
      </div>
      {showPost && <SocialPost kind="home_anniversary" years={years} {...post} />}
    </article>
  );
}
