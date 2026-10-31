/**
 * Bank statement reconciliation: read a CSV export and match each incoming payment to an open invoice.
 *
 * Confidence levels:
 *   0.99  invoice number in the reference, exact amount              → applied automatically
 *   0.90  customer name in the reference, exact amount, one invoice  → applied automatically
 *   0.80  invoice number in the reference, different amount (partial)→ review
 *   0.70  customer name, exact amount, several candidates            → review
 *   0.50  exact amount only, one invoice                             → review
 * Pure, so it's unit tested and could run anywhere.
 */

export type StatementLine = { date: string; amount: number; reference: string };
export type OpenInvoice = { id: string; number: string; customerName: string; balance: number };
export type Match = StatementLine & { invoiceId: string | null; confidence: number; reason: string; status: "auto" | "review" };

export const AUTO_THRESHOLD = 0.9;

// ─── CSV ─────────────────────────────────────────────────────────────────────

/** Splits CSV text into rows, handling quoted fields with commas and escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const HEADERS = {
  date: ["date", "txn date", "transaction date", "value date", "posting date"],
  amount: ["amount", "credit", "deposit", "credit amount", "amount (inr)", "cr"],
  reference: ["description", "narration", "reference", "details", "remarks", "particulars", "memo"],
};

function findColumn(header: string[], names: string[]) {
  const normal = header.map((h) => h.trim().toLowerCase());
  return normal.findIndex((h) => names.includes(h));
}

/** "7,070.56" or "₹ 1,23,456" → paise. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]|INR|Rs\.?/gi, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Accepts 2026-10-31, 31/10/2026, 31-10-2026 and 31 Oct 2026. Returns YYYY-MM-DD. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return null;
}

/** Reads a bank CSV into incoming payments. Debits and unreadable rows are skipped. */
export function parseStatement(text: string): { lines: StatementLine[]; error?: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { lines: [], error: "The file looks empty." };
  const [header, ...body] = rows;
  const col = { date: findColumn(header, HEADERS.date), amount: findColumn(header, HEADERS.amount), reference: findColumn(header, HEADERS.reference) };
  if (col.date < 0 || col.amount < 0 || col.reference < 0) {
    return { lines: [], error: "Couldn't find date, amount and description columns. Expected headers like Date, Amount, Description." };
  }
  const lines: StatementLine[] = [];
  for (const r of body) {
    const date = parseDate(r[col.date] ?? "");
    const amount = parseAmount(r[col.amount] ?? "");
    if (!date || amount === null || amount <= 0) continue;
    lines.push({ date, amount, reference: (r[col.reference] ?? "").trim() });
  }
  return { lines };
}

// ─── Matching ────────────────────────────────────────────────────────────────

const STOPWORDS = new Set(["and", "the", "llc", "inc", "ltd", "pvt", "group", "sons", "company", "co"]);

function nameTokens(name: string) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Invoice numbers in a reference, tolerant of missing dashes and spaces: "INV 2026 000123" → INV-2026-000123. */
export function findInvoiceNumbers(reference: string) {
  const compact = reference.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return [...compact.matchAll(/INV(\d{4})(\d{6})/g)].map((m) => `INV-${m[1]}-${m[2]}`);
}

function candidates(line: StatementLine, invoices: OpenInvoice[], byNumber: Map<string, OpenInvoice>, taken: Set<string>): Omit<Match, keyof StatementLine> {
  const free = (inv: OpenInvoice) => !taken.has(inv.id);

  for (const number of findInvoiceNumbers(line.reference)) {
    const inv = byNumber.get(number);
    if (inv && free(inv)) {
      return inv.balance === line.amount
        ? { invoiceId: inv.id, confidence: 0.99, reason: `Reference ${number}, exact amount`, status: "auto" }
        : { invoiceId: inv.id, confidence: 0.8, reason: `Reference ${number}, but the amount differs (partial?)`, status: "review" };
    }
  }

  const ref = line.reference.toLowerCase();
  const sameAmount = invoices.filter((i) => i.balance === line.amount && free(i));
  const byName = sameAmount.filter((i) => {
    const tokens = nameTokens(i.customerName);
    return tokens.length > 0 && tokens.filter((t) => ref.includes(t)).length / tokens.length >= 0.5;
  });
  if (byName.length === 1) return { invoiceId: byName[0].id, confidence: 0.9, reason: `Customer ${byName[0].customerName}, exact amount`, status: "auto" };
  if (byName.length > 1) return { invoiceId: byName[0].id, confidence: 0.7, reason: "Customer name and amount match several invoices", status: "review" };
  if (sameAmount.length === 1) return { invoiceId: sameAmount[0].id, confidence: 0.5, reason: "Only the amount matches", status: "review" };
  return { invoiceId: null, confidence: 0, reason: sameAmount.length ? "Amount matches several invoices" : "No matching invoice", status: "review" };
}

/** Matches each line to at most one invoice, and never two lines to the same invoice. */
export function matchStatement(lines: StatementLine[], invoices: OpenInvoice[]): Match[] {
  const byNumber = new Map(invoices.map((i) => [i.number, i]));
  const taken = new Set<string>();
  // Strongest evidence first: lines quoting an invoice number claim their invoice before fuzzy ones.
  const order = lines.map((l, i) => ({ l, i, strong: findInvoiceNumbers(l.reference).length > 0 })).sort((a, b) => Number(b.strong) - Number(a.strong));
  const result: Match[] = new Array(lines.length);
  for (const { l, i } of order) {
    const m = candidates(l, invoices, byNumber, taken);
    if (m.invoiceId) taken.add(m.invoiceId);
    result[i] = { ...l, ...m };
  }
  return result;
}
