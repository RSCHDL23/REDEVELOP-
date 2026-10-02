import "server-only";
import { readLetter, type LetterTerms } from "@/lib/core/preapproval";

/**
 * Pulls the text out of an uploaded pre-approval letter or bank statement and
 * reads the terms. PDFs and text files can be read; photos can't yet (that needs
 * OCR), so those come back empty for the person to type in.
 */
export async function readLetterFile(bytes: Uint8Array, mime: string): Promise<{ terms: LetterTerms; text: string; readable: boolean }> {
  let text = "";
  try {
    if (mime === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (mime.startsWith("text/")) {
      text = new TextDecoder().decode(bytes);
    }
  } catch {
    text = "";
  }
  text = text.slice(0, 50000);
  return { terms: text ? readLetter(text) : {}, text, readable: text.trim().length > 20 };
}

/** Largest dollar amount on a bank statement or proof-of-funds letter (a starting guess). */
export function largestAmount(text: string): number | null {
  const amounts = [...text.matchAll(/\$\s?([\d,]{4,}(?:\.\d{2})?)/g)].map((m) => Number(m[1].replace(/,/g, ""))).filter((n) => n >= 1000 && n < 100000000);
  return amounts.length ? Math.round(Math.max(...amounts)) : null;
}
