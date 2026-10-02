import Link from "next/link";
import type { Client, HomeShare } from "@/lib/data/types";
import { SITE_NAMES } from "@/lib/core/listingLinks";
import { Empty } from "@/components/ui";
import { markSeen } from "../homes/share/actions";

/** Homes clients sent from Zillow, Redfin or Realtor.com, ready to turn into showing requests. */
export function SharedHomes({ shares, clients }: { shares: HomeShare[]; clients: Client[] }) {
  if (!shares.length) return <Empty>No homes from clients yet. Clients send them from Zillow, Redfin or Realtor.com with your home-sharing link (Profile → My link).</Empty>;
  return (
    <section className="stack" id="shared">
          {shares.slice(0, 30).map((h) => {
        const client = clients.find((c) => h.clientName.startsWith(c.name));
        return (
          <article key={h.id} className={`card ${h.seen ? "" : "accent"}`}>
            <div className="between" style={{ alignItems: "flex-start" }}>
              <span className="stack" style={{ gap: 1 }}>
                <span className="strong">{h.address || "Home link"}</span>
                <span className="small muted">From {h.clientName} · {SITE_NAMES[h.source]}{h.wantsTour ? " · wants to see it" : ""}</span>
              </span>
              {!h.seen && <span className="pill blue">New</span>}
            </div>
            {h.note && <span className="small">&ldquo;{h.note}&rdquo;</span>}
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              <a className="btn" href={h.url} target="_blank" rel="noreferrer">Open on {SITE_NAMES[h.source]}</a>
              <Link className="btn primary" href={`/showings/new?address=${encodeURIComponent(h.address)}${client ? `&client=${client.id}` : ""}`}>Request showing</Link>
              {!h.seen && <form action={markSeen}><input type="hidden" name="id" value={h.id} /><button className="btn">Mark seen</button></form>}
            </div>
          </article>
        );
      })}
    </section>
  );
}
