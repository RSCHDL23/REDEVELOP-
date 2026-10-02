/** Templates agents send to new clients. Agents can edit before sending. */
export function buyerDosAndDonts(o: { clientFirst: string; agentName: string; agentPhone: string }): string {
  return [
    `Hi ${o.clientFirst}! I'm excited to help you find your home. A few do's and don'ts from now until closing keep your loan on track:`,
    "",
    "DO",
    "✓ Keep paying every bill on time",
    "✓ Keep your job steady, and tell your lender before any change",
    "✓ Save pay stubs, bank statements and tax returns; your lender will ask",
    "✓ Answer your lender's requests quickly",
    "✓ Budget for closing costs, inspection, appraisal and moving",
    "✓ Call to confirm wiring instructions with the title company at a number you already know",
    "",
    "DON'T",
    "✗ Open new credit cards or apply for loans (car, furniture, store cards)",
    "✗ Make big purchases on credit before closing",
    "✗ Change jobs or become self-employed without talking to your lender",
    "✗ Deposit large amounts you can't document, or move money between accounts without a paper trail",
    "✗ Co-sign for anyone, close old credit cards or skip payments",
    "✗ Trust emailed changes to wiring instructions; it's a common scam",
    "",
    `Questions anytime: ${o.agentName} ${o.agentPhone}`,
  ].join("\n");
}

export function sellerDosAndDonts(o: { clientFirst: string; agentName: string; agentPhone: string }): string {
  return [
    `Hi ${o.clientFirst}! Thanks for trusting me with your sale. A few do's and don'ts while we're on the market:`,
    "",
    "DO",
    "✓ Keep the home clean, bright and ready to show",
    "✓ Fill out the seller disclosures honestly and completely",
    "✓ Secure valuables, medications and important papers before showings",
    "✓ Keep paying the mortgage, taxes, HOA dues and insurance until closing",
    "✓ Tell me about any repairs or changes to the home",
    "",
    "DON'T",
    "✗ Be home during showings (buyers relax and stay longer when you're out)",
    "✗ Talk price or terms with buyers or their agents directly",
    "✗ Remove fixtures or anything included in the sale",
    "✗ Cancel homeowner's insurance before the sale records",
    "",
    `Questions anytime: ${o.agentName} ${o.agentPhone}`,
  ].join("\n");
}
