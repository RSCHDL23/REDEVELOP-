/** Sending a new client their agreement through the agent's e-signature software. */
import type { EsignProvider } from "@/lib/data/types";

export const ESIGN_PROVIDERS: { id: EsignProvider; label: string; url: string }[] = [
  { id: "docusign", label: "DocuSign", url: "https://www.docusign.com" },
  { id: "dotloop", label: "dotloop", url: "https://www.dotloop.com" },
  { id: "skyslope", label: "SkySlope DigiSign", url: "https://skyslope.com" },
  { id: "adobe", label: "Adobe Acrobat Sign", url: "https://www.adobe.com/sign.html" },
  { id: "authentisign", label: "Authentisign", url: "" },
  { id: "zipforms", label: "zipForm / Lone Wolf", url: "" },
  { id: "other", label: "Other", url: "" },
];

export function agreementFor(intent: string): string {
  if (intent === "Selling") return "listing agreement";
  if (intent === "Renting") return "tenant representation agreement";
  if (intent === "Buying" || intent === "Investing") return "buyer representation agreement";
  return "brokerage agreement";
}

export function agreementHeadsUp(o: { clientFirst: string; agreement: string; provider: string; agentName: string; agentPhone: string }): string {
  return `Hi ${o.clientFirst}! I'm sending your ${o.agreement} through ${o.provider} to sign electronically. It explains how I'll represent you and how I'm paid. Take a look, and call or text me with any questions before you sign. ${o.agentName} ${o.agentPhone}`;
}
