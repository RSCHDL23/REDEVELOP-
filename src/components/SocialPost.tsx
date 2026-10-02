"use client";

import { useEffect, useRef, useState } from "react";

export type PostKind = "just_closed" | "under_contract" | "home_anniversary";

const BANNER: Record<PostKind, string> = {
  just_closed: "JUST CLOSED",
  under_contract: "UNDER CONTRACT",
  home_anniversary: "HAPPY HOME-IVERSARY",
};

export function defaultCaption(kind: PostKind, o: { address: string; city: string; agentName: string; brokerage: string; years?: number; clientName?: string }) {
  const place = [o.address, o.city].filter(Boolean).join(", ");
  if (kind === "just_closed") return `🔑 JUST CLOSED! Congratulations to my amazing clients on ${place}! It was an honor to be part of your journey. Thinking of buying or selling? Let's talk.\n\n${o.agentName} · ${o.brokerage}\n#JustClosed #RealEstate #NewHomeowners #SoldWithREschedule`;
  if (kind === "under_contract") return `🏡 UNDER CONTRACT! ${place} is officially under contract. On to the next step! Thinking about making a move? I'd love to help.\n\n${o.agentName} · ${o.brokerage}\n#UnderContract #RealEstate #Pending`;
  return `🎉 Happy ${o.years ?? 1}-year home anniversary${o.clientName ? `, ${o.clientName}` : ""}! It feels like yesterday we got the keys. Wishing you many more years of memories at home.\n\n${o.agentName} · ${o.brokerage}\n#HomeAnniversary #REmember`;
}

const hideNumber = (a: string) => a.replace(/^\s*\d+[A-Za-z-]*\s+/, "");

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draws a square, share-ready post (1080×1080), with an editable caption. */
export function SocialPost({ kind, address, city, photoUrl, agentName, brokerage, phone, logoUrl, shareUrl, years, clientName }: {
  kind: PostKind; address: string; city: string; photoUrl: string | null; agentName: string; brokerage: string; phone: string;
  logoUrl: string | null; shareUrl: string; years?: number; clientName?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hideNum, setHideNum] = useState(kind === "home_anniversary");
  const [caption, setCaption] = useState(() => defaultCaption(kind, { address, city, agentName, brokerage, years, clientName }));
  const [png, setPng] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const shownAddress = hideNum ? hideNumber(address) : address;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      const S = 1080;
      c.width = S; c.height = S;
      const [photo, logo] = await Promise.all([photoUrl ? load(photoUrl) : null, logoUrl ? load(logoUrl) : null]);
      if (cancelled) return;
      // Background: the home photo, or a brand gradient.
      if (photo) {
        const r = Math.max(S / photo.width, S / photo.height);
        const w = photo.width * r, h = photo.height * r;
        ctx.drawImage(photo, (S - w) / 2, (S - h) / 2, w, h);
      } else {
        const g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, "#12a9ee"); g.addColorStop(1, "#075a88");
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }
      const shade = ctx.createLinearGradient(0, S * 0.45, 0, S);
      shade.addColorStop(0, "rgba(11,13,14,0)"); shade.addColorStop(1, "rgba(11,13,14,0.92)");
      ctx.fillStyle = shade; ctx.fillRect(0, 0, S, S);

      // Banner
      const font = (w: number, px: number) => `${w} ${px}px Nunito, "Arial Rounded MT Bold", system-ui, sans-serif`;
      ctx.font = font(900, kind === "home_anniversary" ? 64 : 92);
      const text = BANNER[kind];
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = "#12a9ee";
      ctx.beginPath(); ctx.roundRect(60, 70, tw + 72, 132, 28); ctx.fill();
      ctx.fillStyle = "#0b0d0e"; ctx.textBaseline = "middle";
      ctx.fillText(text, 96, 138);

      // Address and agent
      ctx.fillStyle = "#ffffff"; ctx.textBaseline = "alphabetic";
      ctx.font = font(900, 68);
      wrap(ctx, shownAddress, 60, 820, S - 120, 76);
      ctx.font = font(700, 40); ctx.fillStyle = "#c3cbd1";
      ctx.fillText(city, 60, 880);
      ctx.fillStyle = "#ffffff"; ctx.font = font(800, 38);
      ctx.fillText(`${agentName} · ${brokerage}`, 60, 966);
      ctx.fillStyle = "#c3cbd1"; ctx.font = font(700, 34);
      ctx.fillText(phone, 60, 1016);
      if (logo) {
        const h = 96, w = Math.min(260, (logo.width / logo.height) * h);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath(); ctx.roundRect(S - w - 84, S - h - 84, w + 24, h + 24, 16); ctx.fill();
        ctx.drawImage(logo, S - w - 72, S - h - 72, w, h);
      }
      try { setPng(c.toDataURL("image/png")); } catch { setPng(""); }
    })();
    return () => { cancelled = true; };
  }, [kind, shownAddress, city, photoUrl, logoUrl, agentName, brokerage, phone]);

  async function share() {
    try {
      const blob = await (await fetch(png)).blob();
      const file = new File([blob], `${BANNER[kind].toLowerCase().replace(/\W+/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: caption }); return; }
    } catch { /* fall back to download */ }
    const a = document.createElement("a");
    a.href = png; a.download = "post.png"; a.click();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }
  const enc = encodeURIComponent;

  return (
    <div className="stack" style={{ gap: 10, textAlign: "left", width: "100%" }}>
      <canvas ref={canvas} style={{ width: "100%", aspectRatio: "1", borderRadius: 14, background: "var(--line)" }} aria-label={`${BANNER[kind]} post preview`} role="img" />
      <label className="row small" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={hideNum} onChange={(e) => setHideNum(e.target.checked)} style={{ width: 20, height: 20 }} />
        Hide the house number
      </label>
      <div className="field">
        <label htmlFor={`cap-${kind}`}>Caption</label>
        <textarea id={`cap-${kind}`} className="input" value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} />
      </div>
      <div className="grid-2">
        <button type="button" className="btn primary block" onClick={share} disabled={!png}>Share image</button>
        <button type="button" className="btn block" onClick={copy}>{copied ? "Copied ✓" : "Copy caption"}</button>
      </div>
      <div className="grid-3">
        <a className="btn block" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`} target="_blank" rel="noreferrer">Facebook</a>
        <a className="btn block" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`} target="_blank" rel="noreferrer">LinkedIn</a>
        <a className="btn block" href={`https://x.com/intent/post?text=${enc(caption.slice(0, 240))}&url=${enc(shareUrl)}`} target="_blank" rel="noreferrer">X</a>
      </div>
      {png && <a className="small" href={png} download="post.png">Download image (for Instagram or TikTok)</a>}
      <span className="tiny muted">
        Your brokerage name is on the post (Illinois requires it in ads). Get your client&apos;s OK before posting their address, and the listing broker&apos;s OK if it&apos;s their listing.
      </span>
    </div>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, bottomY: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  lines.slice(-2).forEach((l, i, arr) => ctx.fillText(l, x, bottomY - (arr.length - 1 - i) * lineH));
}
