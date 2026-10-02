"use client";

import { useActionState, useMemo, useState } from "react";
import type { Faq, ResourceLink, Section } from "@/lib/core/resources";
import { addResource, removeResource, type LibState } from "./actions";

type Mine = { title: string; url: string; category: string };
type Assoc = { name: string; url: string; kind: string };

function ShareLink({ link }: { link: ResourceLink }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const text = `${link.title} (${link.source}): ${link.url}`;
    if (navigator.share) { try { await navigator.share({ title: link.title, text, url: link.url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ }
  }
  return <button type="button" className="btn" style={{ minHeight: 32, fontSize: 12 }} onClick={share} aria-label={`Share ${link.title}`}>{copied ? "Copied ✓" : "Share"}</button>;
}

function LinkRow({ link }: { link: ResourceLink }) {
  return (
    <li className="between" style={{ gap: 8 }}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="stack" style={{ gap: 0, color: "var(--ink)", minWidth: 0 }}>
        <span className="small strong" style={{ color: "var(--blue-text)" }}>{link.title} ↗</span>
        <span className="tiny muted">{link.source}</span>
      </a>
      <ShareLink link={link} />
    </li>
  );
}

export function ResourceBrowser({ faqs, sections, mine, assocs }: { faqs: Faq[]; sections: Section[]; mine: Mine[]; assocs: Assoc[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"agents" | "clients">("agents");
  const [state, action, pending] = useActionState<LibState, FormData>(addResource, {});
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const match = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const faqHits = useMemo(() => (words.length ? faqs.filter((f) => match(`${f.q} ${f.a} ${f.tags.join(" ")}`)) : faqs), [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownSections = sections
    .filter((s) => (words.length ? true : s.audience === tab))
    .map((s) => ({ ...s, links: words.length ? s.links.filter((l) => match(`${l.title} ${l.source} ${s.title}`)) : s.links }))
    .filter((s) => s.links.length);
  const mineHits = mine.map((m, i) => ({ ...m, i })).filter((m) => !words.length || match(`${m.title} ${m.category}`));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="field">
        <label htmlFor="q" className="sr-only">Search REsource</label>
        <input id="q" type="search" className="input" placeholder="Ask or search: dual agency, radon, tax appeal, grants…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!words.length && (
        <nav className="grid-2" aria-label="Audience">
          <button type="button" className={`btn block ${tab === "agents" ? "dark" : ""}`} onClick={() => setTab("agents")}>For agents</button>
          <button type="button" className={`btn block ${tab === "clients" ? "dark" : ""}`} onClick={() => setTab("clients")}>For clients</button>
        </nav>
      )}

      {(words.length > 0 || tab === "agents") && faqHits.length > 0 && (
        <section className="stack">
          <h2 className="section-label">Questions &amp; answers</h2>
          {faqHits.map((f) => (
            <details key={f.q} className="card" open={words.length > 0 && faqHits.length <= 2}>
              <summary className="strong" style={{ cursor: "pointer" }}>{f.q}</summary>
              <p className="small" style={{ margin: "8px 0 0" }}>{f.a}</p>
              <ul className="stack" style={{ listStyle: "none", margin: "8px 0 0", padding: 0, gap: 8 }}>{f.links.map((l) => <LinkRow key={l.url} link={l} />)}</ul>
            </details>
          ))}
          <p className="tiny muted" style={{ margin: 0 }}>General information, not legal advice. For a specific deal, ask your managing broker or a real estate attorney.</p>
        </section>
      )}

      {shownSections.map((s) => (
        <section key={s.id} className="stack">
          <h2 className="section-label">{s.title}</h2>
          <div className="card" style={{ gap: 10 }}>
            <span className="small muted">{s.blurb}{s.audience === "clients" ? " Tap Share to send one to a client." : ""}</span>
            <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}>{s.links.map((l) => <LinkRow key={l.url} link={l} />)}</ul>
          </div>
        </section>
      ))}

      {(tab === "agents" || words.length > 0) && (
        <section className="stack">
          <h2 className="section-label">Your associations &amp; MLS</h2>
          <div className="card" style={{ gap: 10 }}>
            {assocs.length === 0 && <span className="small muted">Add your associations and MLS in Profile to keep their forms and member resources here.</span>}
            <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}>
              {assocs.map((a) => (
                <li key={a.name} className="between">
                  <span className="stack" style={{ gap: 0 }}><span className="small strong">{a.name}</span><span className="tiny muted">{a.kind === "mls" ? "MLS" : "Association"} · forms and member resources (sign in on their site)</span></span>
                  {a.url ? <a className="btn" style={{ minHeight: 32, fontSize: 12 }} href={a.url} target="_blank" rel="noreferrer">Open ↗</a> : <a className="btn" style={{ minHeight: 32, fontSize: 12 }} href="/profile#memberships">Add website</a>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="stack">
        <h2 className="section-label">My saved forms &amp; links</h2>
        <div className="card" style={{ gap: 10 }}>
          {mineHits.length === 0 && <span className="small muted">Save your brokerage forms, checklists and favorite links here.</span>}
          <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}>
            {mineHits.map((m) => (
              <li key={`${m.i}-${m.url}`} className="between" style={{ gap: 8 }}>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="stack" style={{ gap: 0, minWidth: 0 }}>
                  <span className="small strong">{m.title} ↗</span>
                  <span className="tiny muted">{m.category}</span>
                </a>
                <span className="row" style={{ gap: 4 }}>
                  <ShareLink link={{ title: m.title, url: m.url, source: m.category }} />
                  <form action={removeResource}><input type="hidden" name="index" value={m.i} /><button className="btn danger" style={{ minHeight: 32, border: 0, fontSize: 12 }} aria-label={`Remove ${m.title}`}>✕</button></form>
                </span>
              </li>
            ))}
          </ul>
          <details>
            <summary className="small strong" style={{ cursor: "pointer", color: "var(--blue-text)" }}>+ Save a form or link</summary>
            <form action={action} className="stack" style={{ marginTop: 8 }}>
              <input name="title" className="input" placeholder="Title, e.g. Brokerage buyer agreement" aria-label="Title" maxLength={100} required />
              <input name="url" className="input" placeholder="https://" aria-label="Link" maxLength={500} required inputMode="url" />
              <input name="category" className="input" placeholder="Category (optional), e.g. Listing forms" aria-label="Category" maxLength={40} />
              {state.error && <p className="error" role="alert">{state.error}</p>}
              <button className="btn dark block" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            </form>
          </details>
        </div>
      </section>
    </div>
  );
}
