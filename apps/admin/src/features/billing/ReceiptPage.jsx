import { Link, useParams } from "react-router-dom";
import { PAYMENT_MODE_LABELS } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { displayDate, displayDateTime } from "@app/shared/time";
import { Alert, Button, Spinner } from "@app/shared/ui";
import { ICONS } from "../../app/icons.js";
import { useReceipt } from "./api.js";

/**
 * Printable receipt (A5 / thermal friendly). The app's sidebar and buttons are hidden
 * when printing (`no-print`). A void receipt says so across the page.
 */
export function ReceiptPage() {
  const { id } = useParams();
  const { data: receipt, isLoading, error } = useReceipt(id);
  if (isLoading) return <Spinner />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  const { payment, allocations, creditPaise, library } = receipt;
  const voided = payment.status === "void";

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          to={`/members/${payment.memberId}`}
          className="text-sm text-brand-dark hover:underline"
        >
          ← {payment.memberName}
        </Link>
        <Button icon={ICONS.print} onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <article className="relative overflow-hidden rounded-2xl bg-white p-6 text-sm shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        {voided && (
          <p className="pointer-events-none absolute inset-0 flex rotate-[-20deg] items-center justify-center text-6xl font-bold text-red-500/20">
            VOID
          </p>
        )}
        <header className="mb-4 flex items-start gap-3 border-b border-dashed border-slate-300 pb-4">
          {library.logoUrl && (
            <img src={library.logoUrl} alt="" className="h-12 w-12 object-contain" />
          )}
          <div>
            <h1 className="text-base font-semibold">{library.name}</h1>
            {library.address && <p className="text-xs text-slate-500">{library.address}</p>}
            {library.phone && <p className="text-xs text-slate-500">Phone {library.phone}</p>}
          </div>
        </header>
        <div className="mb-4 flex justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Receipt</p>
            <p className="font-semibold">{payment.receiptLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
            <p>{displayDate(payment.receivedOn)}</p>
          </div>
        </div>
        <p className="mb-3">
          Received from <strong>{payment.memberName}</strong> ({payment.memberCode})
        </p>
        <table className="mb-3 w-full">
          <tbody>
            {allocations.map((a) => (
              <tr key={a.invoiceId} className="border-b border-slate-100">
                <td className="py-1.5 pr-2">{a.description}</td>
                <td className="py-1.5 text-right tabular-nums">{formatRupees(a.amountPaise)}</td>
              </tr>
            ))}
            {creditPaise > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-2">Advance (credit for next fees)</td>
                <td className="py-1.5 text-right tabular-nums">{formatRupees(creditPaise)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2 font-semibold">Total</td>
              <td className="pt-2 text-right text-base font-semibold tabular-nums">
                {formatRupees(payment.amountPaise)}
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="text-slate-600">
          Paid by {PAYMENT_MODE_LABELS[payment.mode]}
          {payment.reference && ` · Ref ${payment.reference}`}
        </p>
        {payment.collectedBy && <p className="text-slate-600">Received by {payment.collectedBy}</p>}
        {voided && (
          <p className="mt-3 text-red-700">
            Voided {displayDateTime(payment.voidedAt)}: {payment.voidReason}
          </p>
        )}
        <p className="mt-5 border-t border-dashed border-slate-300 pt-3 text-center text-xs text-slate-500">
          Thank you. Please keep this receipt.
        </p>
      </article>
    </div>
  );
}
