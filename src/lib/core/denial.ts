/** Reasons a listing side can give when denying a showing request. A reason is required. */
export const DENIAL_REASONS = [
  "Under contract",
  "Owner or tenant not available",
  "Showings paused",
  "Off the market",
  "Too short notice",
  "Other",
] as const;
