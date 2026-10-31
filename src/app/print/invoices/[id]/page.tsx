import { Logo } from "@/components/shell/logo";
import { formatDate, money } from "@/lib/format";
import { getPrintableInvoice } from "@/server/queries/invoices";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Invoice" };

/** A clean, paper-shaped invoice. Opens in its own tab; "Print" saves it as a PDF too. */
export default function PrintInvoicePage({ params }: PageProps<"/print/invoices/[id]">) {
  return (
    <div className="min-h-dvh bg-[#f5f5f7] py-10 text-[#1d1d1f] print:bg-white print:py-0">
      <Suspense fallback={null}>
        <PrintableInvoice params={params} />
      </Suspense>
    </div>
  );
}

async function PrintableInvoice({ params }: { params: PageProps<"/print/invoices/[id]">["params"] }) {
  const { id } = await params;
  const d = await getPrintableInvoice(id);
  const { inv, customer } = d;

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-[794px] justify-end px-4 print:hidden">
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[794px] bg-white px-14 py-14 shadow-[0_8px_40px_rgba(0,0,0,0.08)] print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div className="text-[17px] font-semibold tracking-tight">{d.company}</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] tracking-wide text-[#6e6e73] uppercase">{inv.status === "paid" ? "Paid invoice" : "Invoice"}</div>
            <div className="text-[22px] font-semibold tabular">{inv.number}</div>
          </div>
        </header>

        <section className="mt-12 grid grid-cols-2 gap-8 text-[14px]">
          <div>
            <div className="text-[12px] tracking-wide text-[#6e6e73] uppercase">Billed to</div>
            <div className="mt-1.5 font-medium">{customer.name}</div>
            <div className="text-[#6e6e73]">{customer.email}</div>
            {customer.address && <div className="text-[#6e6e73]">{customer.address}</div>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 justify-self-end text-right">
            <dt className="text-[#6e6e73]">Issued</dt>
            <dd className="tabular">{formatDate(inv.issueDate)}</dd>
            <dt className="text-[#6e6e73]">Due</dt>
            <dd className="tabular">{formatDate(inv.dueDate)}</dd>
            <dt className="text-[#6e6e73]">Period</dt>
            <dd className="tabular">
              {formatDate(inv.periodStart, { short: true })} – {formatDate(inv.periodEnd)}
            </dd>
            {d.subscriptionNumber && (
              <>
                <dt className="text-[#6e6e73]">Subscription</dt>
                <dd className="tabular">{d.subscriptionNumber}</dd>
              </>
            )}
          </dl>
        </section>

        <table className="mt-12 w-full text-[14px]">
          <thead>
            <tr className="border-b border-[#e5e5ea] text-[12px] tracking-wide text-[#6e6e73] uppercase">
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit price</th>
              <th className="py-2 text-right font-medium">Tax</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.lines
              .filter((l) => l.amount >= 0)
              .map((l) => (
                <tr key={l.id} className="border-b border-[#f0f0f2]">
                  <td className="py-3">{l.description}</td>
                  <td className="py-3 text-right tabular">{l.qty}</td>
                  <td className="py-3 text-right tabular">{money(l.unitPrice)}</td>
                  <td className="py-3 text-right tabular">{l.taxRateBps / 100}%</td>
                  <td className="py-3 text-right tabular">{money(l.amount)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <dl className="mt-6 ml-auto grid max-w-[300px] grid-cols-[1fr_auto] gap-y-2 text-[14px]">
          <dt className="text-[#6e6e73]">Subtotal</dt>
          <dd className="text-right tabular">{money(inv.subtotal)}</dd>
          {inv.discountTotal > 0 && (
            <>
              <dt className="text-[#6e6e73]">Discount</dt>
              <dd className="text-right tabular">−{money(inv.discountTotal)}</dd>
            </>
          )}
          <dt className="text-[#6e6e73]">Tax</dt>
          <dd className="text-right tabular">{money(inv.taxTotal)}</dd>
          <dt className="border-t border-[#e5e5ea] pt-3 font-semibold">Total</dt>
          <dd className="border-t border-[#e5e5ea] pt-3 text-right text-[18px] font-semibold tabular">{money(inv.total)}</dd>
          {inv.amountPaid > 0 && (
            <>
              <dt className="text-[#6e6e73]">Paid</dt>
              <dd className="text-right tabular">−{money(inv.amountPaid)}</dd>
              <dt className="font-semibold">Balance due</dt>
              <dd className="text-right font-semibold tabular">{money(d.balance)}</dd>
            </>
          )}
        </dl>

        <footer className="mt-16 border-t border-[#e5e5ea] pt-5 text-[12.5px] text-[#6e6e73]">
          Payment is due within {Math.round((Date.parse(inv.dueDate) - Date.parse(inv.issueDate)) / 86_400_000)} days of issue. Please quote{" "}
          {inv.number} with your payment.
        </footer>
      </article>
    </>
  );
}
