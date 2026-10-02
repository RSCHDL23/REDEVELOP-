"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, type SendState } from "../actions";

export function Composer({ to, name }: { to: string; name: string }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendMessage, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.sent) form.current?.reset();
    window.scrollTo({ top: document.body.scrollHeight });
  }, [state]);
  return (
    <form ref={form} action={action} className="composer">
      <input type="hidden" name="to" value={to} />
      <label htmlFor="body" className="sr-only">Message {name}</label>
      <textarea id="body" name="body" className="input" rows={2} maxLength={2000} placeholder={`Message ${name.split(" ")[0]}`} required
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.current?.requestSubmit(); } }} />
      <button className="btn primary" disabled={pending} aria-label="Send">{pending ? "…" : "Send"}</button>
      {state.error && <p className="error small" role="alert" style={{ margin: 0, gridColumn: "1 / -1" }}>{state.error}</p>}
    </form>
  );
}
