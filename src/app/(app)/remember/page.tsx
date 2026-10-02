import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { prettyDate, todayISO } from "@/lib/data/dates";
import { anniversaryMessage, upcomingAnniversaries } from "@/lib/core/remember";
import { greetingName } from "@/lib/core/closing";
import { appOrigin } from "@/lib/server/origin";
import { BackLink, Empty } from "@/components/ui";
import { AnniversaryCard } from "./AnniversaryCard";
import { saveRememberSettings, setClientAnniversary, toggleRemember } from "./actions";

export const metadata: Metadata = { title: "REmember" };

export default async function RememberPage() {
  const r = repo();
  const [me, clients, deals, listings] = await Promise.all([r.getMe(), r.listClients(), r.listDeals(), r.listListings()]);
  const today = todayISO();
  const origin = await appOrigin();
  const upcoming = upcomingAnniversaries(clients, today, 60);
  const withDates = clients.filter((c) => c.closedOn);
  const pastNoDate = clients.filter((c) => c.stage === "past" && !c.closedOn);

  return (
    <main className="page">
      <BackLink href="/clients" label="Clients" />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">REmember</h1>
        <p className="page-sub">Home anniversaries for your past clients: a message to them and a post about them, every year on their closing date.</p>
      </header>

      <form action={saveRememberSettings} className="card">
        <label className="row" style={{ cursor: "pointer" }}>
          <input type="checkbox" name="auto" defaultChecked={me.rememberAuto} style={{ width: 22, height: 22 }} />
          <span className="stack" style={{ gap: 0 }}><span className="strong">Send automatically</span><span className="tiny muted">On each anniversary morning</span></span>
        </label>
        <div className="row">
          <label htmlFor="channel" className="small strong">Send by</label>
          <select id="channel" name="channel" className="input" defaultValue={me.rememberChannel} style={{ flex: 1 }}>
            <option value="text">Text</option>
            <option value="email">Email</option>
          </select>
          <button className="btn dark">Save</button>
        </div>
        <span className="tiny muted">Hands-free sending starts once a texting/email service (like Twilio or Resend) is connected. Until then, each anniversary shows up on your Today screen that morning, ready to send in one tap.</span>
      </form>

      <section className="stack">
        <h2 className="section-label">Next 60 days</h2>
        {upcoming.length === 0 && <Empty>No anniversaries coming up. Closing a deal adds the client automatically.</Empty>}
        {upcoming.map((a) => {
          const deal = deals.find((d) => d.clientId === a.client.id);
          const listing = deal ? listings.find((l) => l.address.toLowerCase() === deal.address.toLowerCase()) : undefined;
          return (
            <AnniversaryCard
              key={a.client.id}
              name={a.client.name}
              when={a.daysAway === 0 ? "Today!" : a.daysAway === 1 ? "Tomorrow" : `${prettyDate(a.date)} · in ${a.daysAway} days`}
              years={a.years}
              phone={a.client.phone}
              email={a.client.email}
              message={anniversaryMessage({ clientFirst: greetingName(a.client.name), years: a.years, agentName: me.fullName, agentPhone: me.phone })}
              post={{
                address: deal?.address ?? "Home sweet home", city: deal?.city ?? "", photoUrl: listing?.photoUrl ?? null, agentName: me.fullName,
                brokerage: me.brokerage, phone: me.phone, logoUrl: me.logoUrl, shareUrl: `${origin}/p/${me.slug}`, clientName: greetingName(a.client.name),
              }}
            />
          );
        })}
      </section>

      <section className="stack">
        <h2 className="section-label">Closing dates</h2>
        <ul className="list">
          {[...withDates, ...pastNoDate].map((c) => (
            <li key={c.id} className="stack" style={{ gap: 6 }}>
              <span className="strong">{c.name}</span>
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                <form action={setClientAnniversary} className="row" style={{ gap: 6, flex: 1 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="date" name="closedOn" className="input" defaultValue={c.closedOn ?? ""} aria-label={`${c.name} closing date`} style={{ minHeight: 40, flex: 1 }} />
                  <button className="btn" style={{ minHeight: 40 }}>Save</button>
                </form>
                <form action={toggleRemember} className="row small" style={{ gap: 4 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="remember" value={c.remember ? "" : "on"} />
                  <button className="chip" aria-pressed={c.remember}>{c.remember ? "On" : "Off"}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <span className="tiny muted">Past clients without a closing date are listed so you can add one.</span>
      </section>
    </main>
  );
}
