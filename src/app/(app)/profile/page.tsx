import Link from "next/link";
import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { effectiveAccess, LICENSE_ROLES, PROFESSION_LABELS, rolesFor, type Feature, type Role } from "@/lib/core/access";
import { prettyDate } from "@/lib/data/dates";
import { Initials } from "@/components/ui";
import { ImageUpload } from "./ImageUpload";
import { ContactForm, DetailsForm, LicenseForm } from "./Forms";
import { MfaSetup } from "./MfaSetup";
import { removeLicense, removeWork } from "./actions";

export const metadata: Metadata = { title: "Profile" };

const FEATURE_NAME: Record<Feature, string> = {
  request_showings: "Request showings", approve_showings: "Approve showings", share_availability: "Share availability",
  showing_feedback: "Showing feedback", deal_dates: "Deal dates", deal_tasks: "Deal to-dos", documents: "Documents",
  messages: "Messages", contacts: "Contacts", relock: "RElock", loan_updates: "Loan updates", reshow: "REshow",
  offers: "Offers", leads: "Leads",
};

const ROLE_NAME: Partial<Record<Role, string>> = {
  buyers_agent: "Buyer's agent", listing_agent: "Listing agent", managing_broker: "Managing broker", lender: "Lender",
  appraiser: "Appraiser", inspector: "Inspector", attorney: "Attorney", contractor: "Contractor", insurance: "Insurance",
  property_manager: "Property manager", transaction_coordinator: "Transaction coordinator", buyer: "Buyer", seller: "Seller",
  landlord: "Landlord", tenant: "Tenant", renter: "Renter", title: "Title", surveyor: "Surveyor", photographer: "Photographer",
};

const CLIENT_ROLES: Role[] = ["buyer", "seller", "landlord", "tenant", "renter"];

const LICENSE_STATUS = {
  verified: { label: "Verified", tone: "blue" },
  checking: { label: "Checking", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
  rejected: { label: "Not verified", tone: "red" },
} as const;

export default async function ProfilePage() {
  const r = repo();
  const [me, licenses, pref, work] = await Promise.all([r.getMe(), r.listLicenses(), r.getContactPreference(), r.listPortfolio()]);
  const roles = rolesFor(licenses, me.selfRoles);
  const isPro = licenses.length > 0 || roles.some((x) => !CLIENT_ROLES.includes(x));
  const access = effectiveAccess(roles);
  const features = (Object.keys(FEATURE_NAME) as Feature[]).filter((f) => access[f]);

  return (
    <main className="page">
      <h1 className="page-title">Profile</h1>

      {/* How others see you */}
      <section className="card" style={{ alignItems: "center", textAlign: "center", gap: 8 }}>
        <Initials name={me.fullName} url={me.headshotUrl} size={88} />
        <ImageUpload kind="headshot" userId={me.id} demo={isDemoMode} label={isPro ? "Change headshot" : "Change profile photo"} className="btn" />
        <span className="strong" style={{ fontSize: 20 }}>{me.fullName || "Your name"}</span>
        {isPro && me.tagline && <span className="small" style={{ fontStyle: "italic" }}>&ldquo;{me.tagline}&rdquo;</span>}
        {isPro && me.brokerage && <span className="small muted">{me.brokerage}</span>}
        {roles.length > 0 && (
          <div className="chips" style={{ justifyContent: "center" }}>
            {roles.map((x) => <span key={x} className="pill">{ROLE_NAME[x] ?? x}</span>)}
          </div>
        )}
        {isPro && (
          <div className="row" style={{ marginTop: 4 }}>
            {me.logoUrl
              ? <img src={me.logoUrl} alt="Your logo" style={{ maxHeight: 44, maxWidth: 140, objectFit: "contain" }} />
              : <span className="tiny muted">No logo yet</span>}
            <ImageUpload kind="logo" userId={me.id} demo={isDemoMode} label={me.logoUrl ? "Change logo" : "Add logo"} className="btn" />
          </div>
        )}
      </section>

      <section className="stack">
        <h2 className="section-label">Your details</h2>
        <DetailsForm fullName={me.fullName} phone={me.phone} tagline={me.tagline} bio={me.bio} isPro={isPro} />
      </section>

      <section className="stack" id="licenses">
        <h2 className="section-label">Licenses</h2>
        <p className="small muted" style={{ margin: 0 }}>Add every license you hold, in every state. Each verified license turns on the tools for that profession.</p>
        {licenses.length > 0 && (
          <ul className="list">
            {licenses.map((l) => {
              const s = LICENSE_STATUS[l.status];
              return (
                <li key={l.id} className="stack" style={{ gap: 6 }}>
                  <div className="between" style={{ alignItems: "flex-start" }}>
                    <span className="stack" style={{ gap: 1 }}>
                      <span className="strong">{PROFESSION_LABELS[l.profession]} · {l.state}</span>
                      <span className="small muted tabular">#{l.number}{l.sponsor ? ` · ${l.sponsor}` : ""}</span>
                      {l.expiresOn && <span className="tiny muted">Expires {prettyDate(l.expiresOn, { month: "short", day: "numeric", year: "numeric" })}</span>}
                    </span>
                    <span className={`pill ${s.tone}`}>{s.label}</span>
                  </div>
                  <div className="between">
                    <span className="tiny muted">Unlocks: {LICENSE_ROLES[l.profession].map((x) => ROLE_NAME[x] ?? x).join(", ")}</span>
                    <form action={removeLicense}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn danger" style={{ minHeight: 36 }} aria-label={`Remove ${PROFESSION_LABELS[l.profession]} license in ${l.state}`}>Remove</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <LicenseForm />
        {features.length > 0 && (
          <div className="card" style={{ gap: 8 }}>
            <span className="small strong">Tools turned on for you</span>
            <div className="chips">
              {features.map((f) => <span key={f} className={`pill ${access[f] === "full" ? "blue" : ""}`}>{FEATURE_NAME[f]}{access[f] === "view" ? " (view)" : ""}</span>)}
            </div>
          </div>
        )}
      </section>

      {isPro && (
        <section className="stack">
          <h2 className="section-label">Your work</h2>
          <p className="small muted" style={{ margin: 0 }}>Photos of homes you sold, staged, inspected, built or fixed. Shown on your public profile.</p>
          <div className="grid-3">
            {work.map((w) => (
              <figure key={w.id} className="card" style={{ margin: 0, padding: 6, gap: 4 }}>
                <img src={w.url} alt={w.label || "Your work"} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }} />
                {w.label && <figcaption className="tiny">{w.label}</figcaption>}
                <form action={removeWork}><input type="hidden" name="id" value={w.id} /><button className="btn danger block" style={{ minHeight: 32, fontSize: 12 }}>Remove</button></form>
              </figure>
            ))}
            <div className="card" style={{ padding: 6, justifyContent: "center", alignItems: "center", minHeight: 120 }}>
              <ImageUpload kind="portfolio" userId={me.id} demo={isDemoMode} label="Add work photo" className="btn block" askLabel>+ Add photo</ImageUpload>
            </div>
          </div>
        </section>
      )}

      {isPro && (
        <section className="stack">
          <h2 className="section-label">Showing requests</h2>
          <ContactForm pref={pref} />
        </section>
      )}

      <section className="stack">
        <h2 className="section-label">Schedule</h2>
        <Link href="/availability" className="card between" style={{ flexDirection: "row", color: "var(--ink)" }}>
          <span className="stack" style={{ gap: 0 }}><span className="strong">Weekly hours</span><span className="tiny muted">When you can show homes or meet</span></span>
          <span aria-hidden="true">›</span>
        </Link>
      </section>

      <section className="stack">
        <h2 className="section-label">Security</h2>
        <div className="card">
          <MfaSetup demo={isDemoMode} />
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%", margin: "4px 0" }} />
          <Link href="/auth/reset" className="btn block">Change password</Link>
          <form action="/auth/signout" method="post"><button className="btn danger block">Sign out</button></form>
        </div>
        <p className="tiny muted" style={{ margin: 0 }}>Signed in as {me.email}</p>
      </section>
    </main>
  );
}
