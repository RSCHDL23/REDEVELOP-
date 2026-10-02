import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { PROFESSION_LABELS } from "@/lib/core/access";
import { Initials } from "@/components/ui";
import { ConnectForm } from "./ConnectForm";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await repo().getPublicProfile((await params).slug);
  return { title: p ? `${p.fullName}${p.brokerage ? ` · ${p.brokerage}` : ""}` : "Profile" };
}

const digits = (p: string) => p.replace(/[^\d+]/g, "");

/** A professional's public card, opened from their personal link or QR code. */
export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params;
  const p = await repo().getPublicProfile(slug);
  if (!p) notFound();
  const first = p.fullName.split(" ")[0] || "them";
  return (
    <div className="shell">
      <main className="page" style={{ paddingBottom: 40 }}>
        <section className="card" style={{ alignItems: "center", textAlign: "center", gap: 8 }}>
          <Initials name={p.fullName} url={p.headshotUrl} size={104} />
          <h1 className="page-title">{p.fullName}</h1>
          {p.tagline && <span style={{ fontStyle: "italic" }}>&ldquo;{p.tagline}&rdquo;</span>}
          {p.brokerage && <span className="small muted">{p.brokerage}</span>}
          {p.logoUrl && <img src={p.logoUrl} alt={`${p.brokerage || p.fullName} logo`} style={{ maxHeight: 48, maxWidth: 160, objectFit: "contain" }} />}
          <div className="row" style={{ flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 4 }}>
            {p.phone && <a className="btn" href={`tel:${digits(p.phone)}`}>Call</a>}
            {p.phone && <a className="btn" href={`sms:${digits(p.phone)}`}>Text</a>}
            {p.email && <a className="btn" href={`mailto:${p.email}`}>Email</a>}
          </div>
        </section>

        {p.bio && <p className="card" style={{ margin: 0 }}>{p.bio}</p>}

        {p.websites.length > 0 && (
          <section className="stack">
            <h2 className="section-label">Websites</h2>
            <ul className="list">
              {p.websites.map((w) => (
                <li key={w.url}><a href={w.url} target="_blank" rel="noopener noreferrer nofollow">{w.label || w.url.replace(/^https?:\/\//, "")} ↗</a></li>
              ))}
            </ul>
          </section>
        )}

        {p.licenses.length > 0 && (
          <section className="stack">
            <h2 className="section-label">Licenses</h2>
            <ul className="list">
              {p.licenses.map((l) => (
                <li key={`${l.profession}-${l.state}`} className="between small">
                  <span><span className="strong">{PROFESSION_LABELS[l.profession]}</span> · {l.state}</span>
                  <span className="tabular muted">#{l.number} <span className="pill blue">Verified</span></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.reviews.length > 0 && (
          <section className="stack">
            <h2 className="section-label">
              Reviews · {"★".repeat(Math.round(p.reviews.reduce((a, x) => a + x.stars, 0) / p.reviews.length))} {(p.reviews.reduce((a, x) => a + x.stars, 0) / p.reviews.length).toFixed(1)}
            </h2>
            {p.reviews.slice(0, 6).map((x) => (
              <figure key={x.at} className="card" style={{ margin: 0, gap: 4 }}>
                <span style={{ color: "#e1a800" }} aria-label={`${x.stars} stars`}>{"★".repeat(x.stars)}</span>
                {x.body && <blockquote style={{ margin: 0 }}>{x.body}</blockquote>}
                <figcaption className="small muted">{x.name}</figcaption>
              </figure>
            ))}
          </section>
        )}

        <ConnectForm slug={p.slug} firstName={first} />
        <a className="btn block" href={`/homes/share?agent=${p.slug}`}>Already on REschedule? Make {first} your agent</a>

        <p className="tiny muted" style={{ textAlign: "center" }}>
          <img src="/wordmark-light.png" alt="REschedule" style={{ height: 16, verticalAlign: "middle" }} />
        </p>
      </main>
    </div>
  );
}
