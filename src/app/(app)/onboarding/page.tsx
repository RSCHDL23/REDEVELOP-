import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const me = await repo().getMe();
  return (
    <main className="page">
      <img src="/wordmark-light.png" alt="REschedule" style={{ height: 26, width: "auto", alignSelf: "flex-start" }} />
      <header className="stack" style={{ gap: 4 }}>
        <h1 className="page-title">Welcome! Let&apos;s set you up</h1>
        <p className="page-sub">Pick everything that fits. You can change this later in Profile.</p>
      </header>
      <OnboardingForm fullName={me.fullName} phone={me.phone} selfRoles={me.selfRoles} />
    </main>
  );
}
