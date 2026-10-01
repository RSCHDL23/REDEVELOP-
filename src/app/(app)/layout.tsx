import { connection } from "next/server";
import { BottomNav } from "@/components/BottomNav";
import { isDemoMode } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Every signed-in screen shows live data, so never pre-build them.
  await connection();
  return (
    <div className="shell">
      {isDemoMode && <div className="demo-banner">Demo mode · sample data · connect Supabase to go live</div>}
      {children}
      <BottomNav />
    </div>
  );
}
