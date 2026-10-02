"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Financing } from "@/lib/data/types";
import { calculatorLink, financingSummary } from "@/lib/core/financing";
import { clearFinancing, readFinancingDoc, saveFinancing, type ReadState, type SaveState } from "@/app/(app)/financing/actions";

const LOAN_TYPES = ["Conventional", "FHA", "VA", "USDA", "Jumbo", "NACA", "Other"];

/**
 * Upload a pre-approval letter (or proof of funds for cash buyers). The terms are
 * read from the file, shown for checking, and saved only after the person taps Save.
 * `target` is "me" (a buyer's own profile) or a client id (an agent's client).
 */
export function FinancingForm({ target, current, start = "preapproval", forClient }: {
  target: string; current: Financing | null; start?: "preapproval" | "proof_of_funds"; forClient?: string;
}) {
  const [kind, setKind] = useState<"preapproval" | "proof_of_funds">(current?.kind === "proof_of_funds" ? "proof_of_funds" : start);
  const [editing, setEditing] = useState(!current || current.kind === "estimate");
  const [readState, read, reading] = useActionState<ReadState, FormData>(readFinancingDoc, {});
  const [saveState, save, saving] = useActionState<SaveState, FormData>(saveFinancing, {});
  const [manual, setManual] = useState(false);
  const fileRef = useRef<HTMLFormElement>(null);

  useEffect(() => { if (saveState.ok) { setEditing(false); setManual(false); } }, [saveState]);

  if (current && current.kind !== "estimate" && !editing) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <span className="small"><span className="strong">{financingSummary(current)}</span>{current.expiresOn ? ` · ${current.kind === "proof_of_funds" ? "dated" : "good until"} ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${current.expiresOn}T00:00:00Z`))}` : ""}</span>
        {current.fileName && <span className="tiny muted">📎 {current.fileName} (private)</span>}
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {current.kind === "preapproval" && <Link className="btn dark" href={calculatorLink(current)}>Calculator with these terms</Link>}
          <button type="button" className="btn" onClick={() => setEditing(true)}>Update</button>
          <form action={clearFinancing}><input type="hidden" name="target" value={target} /><button className="btn">Remove</button></form>
        </div>
        {saveState.ok && <p className="notice small" role="status" style={{ margin: 0 }}>{saveState.ok}</p>}
      </div>
    );
  }

  const r = readState.read && readState.read.kind === kind ? readState.read : null;
  const showFields = !!r || manual;
  const val = (k: keyof Financing) => {
    const v = r ? (r as Record<string, unknown>)[k] : current && current.kind === kind ? current[k] : null;
    return v == null ? "" : String(v);
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="grid-2" role="group" aria-label="How they're paying">
        <button type="button" className={`btn block ${kind === "preapproval" ? "dark" : ""}`} aria-pressed={kind === "preapproval"} onClick={() => setKind("preapproval")}>Pre-approval</button>
        <button type="button" className={`btn block ${kind === "proof_of_funds" ? "dark" : ""}`} aria-pressed={kind === "proof_of_funds"} onClick={() => setKind("proof_of_funds")}>Cash: proof of funds</button>
      </div>

      <form ref={fileRef} action={read} className="stack" style={{ gap: 6 }}>
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="kind" value={kind} />
        <label className="small strong" htmlFor={`fin-file-${target}`}>
          {kind === "preapproval" ? `Upload ${forClient ? `${forClient}'s` : "your"} pre-approval letter` : `Upload ${forClient ? `${forClient}'s` : "your"} proof of funds (bank or brokerage statement)`}
        </label>
        <input
          id={`fin-file-${target}`} name="file" type="file" className="input" accept="application/pdf,image/jpeg,image/png,image/heic,text/plain"
          style={{ paddingTop: 10 }} onChange={() => fileRef.current?.requestSubmit()}
        />
        <span className="tiny muted">
          {reading ? "Reading the file…" : kind === "preapproval" ? "PDF letters fill in the terms for you. Photos are saved, but you'll type the terms." : "Kept private. Only you and your agent can see it."}
        </span>
        {readState.error && <p className="error" role="alert" style={{ margin: 0 }}>{readState.error}</p>}
      </form>

      {!showFields && <button type="button" className="btn" onClick={() => setManual(true)}>Type the {kind === "preapproval" ? "terms" : "amount"} instead</button>}

      {showFields && (
        <form action={save} className="stack" style={{ gap: 8 }} key={`${kind}-${r?.fileId ?? "manual"}`}>
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="fileName" value={r?.fileName ?? ""} />
          <input type="hidden" name="fileId" value={r?.fileId ?? ""} />
          {r && (
            <p className={`notice small ${readState.readable ? "" : "amber"}`} style={{ margin: 0 }}>
              {readState.readable ? "Here's what we read from the letter. Check every number, then save." : "We saved the file but couldn't read text from it. Type the terms below."}
            </p>
          )}
          {kind === "preapproval" ? (
            <div className="grid-2">
              <F t={target} label="Lender" name="lender" value={val("lender")} />
              <div className="field">
                <label className="small strong" htmlFor={`lt-${target}`}>Loan type</label>
                <select id={`lt-${target}`} name="loanType" className="input" defaultValue={val("loanType")}>
                  <option value="">Pick one</option>
                  {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <F t={target} label="Approved price" name="purchasePrice" value={val("purchasePrice")} money />
              <F t={target} label="Loan amount" name="loanAmount" value={val("loanAmount")} money />
              <F t={target} label="Down payment %" name="downPct" value={val("downPct")} />
              <F t={target} label="Interest rate %" name="ratePct" value={val("ratePct")} />
              <div className="field">
                <label className="small strong" htmlFor={`ty-${target}`}>Years</label>
                <select id={`ty-${target}`} name="termYears" className="input" defaultValue={val("termYears") || "30"}>
                  {[30, 20, 15].map((y) => <option key={y} value={y}>{y} years</option>)}
                </select>
              </div>
              <div className="field">
                <label className="small strong" htmlFor={`ex-${target}`}>Good until</label>
                <input id={`ex-${target}`} name="expiresOn" type="date" className="input" defaultValue={val("expiresOn")} />
              </div>
            </div>
          ) : (
            <div className="grid-2">
              <F t={target} label="Funds available" name="amount" value={val("amount")} money />
              <F t={target} label="Bank or brokerage" name="lender" value={val("lender")} />
              <div className="field">
                <label className="small strong" htmlFor={`pex-${target}`}>Statement date or good until</label>
                <input id={`pex-${target}`} name="expiresOn" type="date" className="input" defaultValue={val("expiresOn")} />
              </div>
            </div>
          )}
          {saveState.error && <p className="error" role="alert" style={{ margin: 0 }}>{saveState.error}</p>}
          <div className="grid-2">
            <button className="btn primary block" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" className="btn block" onClick={() => { setManual(false); if (current && current.kind !== "estimate") setEditing(false); }}>Cancel</button>
          </div>
        </form>
      )}
      {saveState.ok && <p className="notice small" role="status" style={{ margin: 0 }}>{saveState.ok}</p>}
    </div>
  );
}

function F({ t, label, name, value, money }: { t: string; label: string; name: string; value: string; money?: boolean }) {
  const id = `${name}-${t}`;
  return (
    <div className="field">
      <label className="small strong" htmlFor={id}>{label}</label>
      <input id={id} name={name} className="input" inputMode={money || name.endsWith("Pct") ? "decimal" : undefined} defaultValue={money && value ? Number(value).toLocaleString("en-US") : value} placeholder={money ? "$" : undefined} />
    </div>
  );
}
