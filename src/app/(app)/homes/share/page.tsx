import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { firstUrl } from "@/lib/core/listingLinks";
import { ShareForm } from "./ShareForm";

export const metadata: Metadata = { title: "Send a home to my agent" };

/**
 * Buyers send homes they find on Zillow, Redfin or Realtor.com to their agent.
 * Opens from the phone's Share menu (installed app on Android) or by pasting a link.
 */
export default async function ShareHomePage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string; title?: string; agent?: string }> }) {
  const sp = await searchParams;
  const r = repo();
  if (sp.agent && /^[a-z0-9-]{3,60}$/i.test(sp.agent)) await r.setMyAgent(sp.agent);
  const me = await r.getMe();
  const agent = isDemoMode ? { name: me.fullName, slug: me.slug } : me.myAgent;
  const shared = sp.url || firstUrl(`${sp.text ?? ""} ${sp.title ?? ""}`) || "";
  const first = agent?.name.split(" ")[0] ?? "your agent";

  return (
    <main className="page">
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Send a home to {first}</h1>
        <p className="page-sub">Found a home you like on Zillow, Redfin or Realtor.com? Send it here and {first} can set up a showing.</p>
      </header>
      {isDemoMode && <p className="notice small">Preview: this is what your buyers see. In demo mode, homes you send land in your own Clients tab.</p>}

      {agent ? (
        <ShareForm initialUrl={shared} agentFirst={first} />
      ) : (
        <p className="card">You haven&apos;t chosen an agent yet. Ask your agent for their REschedule link, open it, and tap &ldquo;Make them my agent&rdquo;.</p>
      )}

      <section className="card small" style={{ gap: 6 }}>
        <span className="strong">How to send a home</span>
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Open the home in the Zillow, Redfin or Realtor.com app or website.</li>
          <li>Tap <span className="strong">Share</span>, then <span className="strong">Copy link</span>.</li>
          <li>Come back here and paste it. On Android, once REschedule is added to your home screen, it also shows up right in the Share menu.</li>
        </ol>
        <div className="grid-3" style={{ marginTop: 6 }}>
          <a className="btn block" href="https://www.zillow.com/" target="_blank" rel="noreferrer">Zillow</a>
          <a className="btn block" href="https://www.redfin.com/" target="_blank" rel="noreferrer">Redfin</a>
          <a className="btn block" href="https://www.realtor.com/" target="_blank" rel="noreferrer">Realtor.com</a>
        </div>
        <span className="tiny muted">REschedule only uses the link you share. It doesn&apos;t sign in to or copy anything from those sites.</span>
      </section>
    </main>
  );
}
