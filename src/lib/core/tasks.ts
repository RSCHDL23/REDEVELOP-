/**
 * The deal to-do template. When a deal is created, REschedule builds its to-do
 * list from the side (buyer/seller/both), loan type, HOA and the milestone
 * dates. The agent can uncheck any before saving and add their own later.
 */
import { addBusinessDays, addDays, type ISODate } from "./deadlines";

export interface TemplateTask { title: string; assignee: string; due: ISODate | null }

type Ms = { kind: string; due: ISODate }[];

export function dealTodoTemplate(o: {
  side: "buyer" | "seller" | "both";
  loanType: string;
  hasHoa: boolean;
  acceptance: ISODate;
  milestones: Ms;
  earnestHolder?: string;
}): TemplateTask[] {
  const at = (kind: string, shift = 0) => {
    const m = o.milestones.find((x) => x.kind === kind);
    return m ? addDays(m.due, shift) : null;
  };
  const cash = o.loanType.toLowerCase() === "cash";
  const buyer: (TemplateTask | false)[] = [
    { title: "Send the signed contract to buyer, lender and both attorneys", assignee: "You", due: o.acceptance },
    { title: `Deliver earnest money${o.earnestHolder ? ` to ${o.earnestHolder}` : ""} and get a receipt`, assignee: "Buyer", due: at("earnest_money") },
    { title: "Schedule the home inspection", assignee: "You", due: addBusinessDays(o.acceptance, 1) },
    { title: "Attend the inspection", assignee: "You", due: at("inspection", -2) },
    { title: "Send the inspection report to the buyer's attorney", assignee: "You", due: at("inspection", -1) },
    { title: "Confirm attorney review is closed", assignee: "Buyer's attorney", due: at("attorney_review") },
    !cash && { title: "Lender orders the appraisal", assignee: "Lender", due: at("attorney_review", 2) },
    o.hasHoa && { title: "Get HOA documents to the buyer's attorney", assignee: "Listing agent", due: at("hoa_docs", -3) },
    { title: "Buyer gets homeowner's insurance in place", assignee: "Buyer", due: at("closing", -14) },
    !cash && { title: "Confirm clear to close", assignee: "Lender", due: at("closing", -5) },
    { title: "Call the title company to confirm wire instructions (never trust emailed changes)", assignee: "Buyer", due: at("closing", -3) },
    { title: "Buyer schedules utilities and movers", assignee: "Buyer", due: at("closing", -7) },
    { title: "Schedule the final walkthrough", assignee: "You", due: at("walkthrough", -2) },
    { title: "Confirm closing time and place with everyone", assignee: "You", due: at("closing", -2) },
  ];
  const seller: (TemplateTask | false)[] = [
    { title: "Send the signed contract to seller and both attorneys", assignee: "You", due: o.acceptance },
    { title: "Confirm the earnest money was received", assignee: "You", due: at("earnest_money", 1) },
    { title: "Set up inspection access with the seller", assignee: "You", due: addBusinessDays(o.acceptance, 1) },
    { title: "Review inspection requests with the seller and attorney", assignee: "You", due: at("inspection") },
    o.hasHoa && { title: "Order the HOA documents and paid assessment letter", assignee: "Seller", due: addBusinessDays(o.acceptance, 2) },
    !cash && { title: "Set up appraisal access", assignee: "You", due: at("attorney_review", 3) },
    { title: "Seller's attorney orders the mortgage payoff letter", assignee: "Seller's attorney", due: at("attorney_review", 5) },
    { title: "Order the survey", assignee: "Seller's attorney", due: at("closing", -21) },
    { title: "Seller schedules movers and utility shut-off for closing day", assignee: "Seller", due: at("closing", -7) },
    { title: "Confirm the final walkthrough time with the buyer's agent", assignee: "You", due: at("walkthrough", -1) },
    { title: "Gather keys, garage remotes, codes and manuals", assignee: "Seller", due: at("closing", -1) },
  ];
  const list = o.side === "buyer" ? buyer : o.side === "seller" ? seller : [...buyer, ...seller.slice(2)];
  return list.filter((t): t is TemplateTask => !!t).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}
