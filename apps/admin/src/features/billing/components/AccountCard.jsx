import { useState } from "react";
import { Link } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import { Alert, Badge, Button, IconButton, SectionCard, Skeleton } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useCan } from "../../../app/permissions.js";
import { useAccount, useVoidInvoice, useVoidPayment } from "../api.js";
import { invoiceStatus } from "@app/shared/billing";
import { CollectPaymentDialog } from "./CollectPaymentDialog.jsx";
import { ChargeDialog, DiscountDialog, RefundDialog, VoidDialog } from "./MoneyDialogs.jsx";
import { AccountSummary } from "./AccountSummary.jsx";

/** The member's money on their page: summary, charges, receipts (UI-GUIDE §10 Member page). */
export function AccountCard({ member, today, autoCollect = false }) {
  const { data: account, isLoading, error } = useAccount(member.id);
  const canCollect = useCan(PERMISSIONS.PAYMENTS_COLLECT);
  const canVoid = useCan(PERMISSIONS.PAYMENTS_VOID);
  // Arriving from Dues → "Collect" opens the payment dialog straight away.
  const [dialog, setDialog] = useState(autoCollect ? { kind: "collect" } : null); // { kind, item }
  const close = () => setDialog(null);
  const open = (kind, item) => () => setDialog({ kind, item });

  return (
    <SectionCard
      icon={ICONS.payment}
      title="Fees & payments"
      description="What this student owes and has paid."
      actions={
        canCollect &&
        account && (
          <>
            <Button variant="secondary" size="sm" icon={ICONS.charge} onClick={open("charge")}>
              Add charge
            </Button>
            <Button size="sm" icon={ICONS.payment} onClick={open("collect")}>
              Collect payment
            </Button>
          </>
        )
      }
    >
      {isLoading && <Skeleton rows={2} />}
      <Alert tone="error">{error?.message}</Alert>
      {account && (
        <div className="flex flex-col gap-5">
          <AccountSummary account={account} />
          <InvoiceList
            account={account}
            today={today}
            canVoid={canVoid}
            onAction={(kind, invoice) => setDialog({ kind, item: invoice })}
          />
          <PaymentList
            payments={account.payments}
            canVoid={canVoid}
            onVoid={(payment) => setDialog({ kind: "voidPayment", item: payment })}
          />
        </div>
      )}
      <AccountDialogs dialog={dialog} member={member} account={account} close={close} />
    </SectionCard>
  );
}

function InvoiceList({ account, today, canVoid, onAction }) {
  if (account.invoices.length === 0)
    return <p className="text-sm text-slate-500">No charges yet.</p>;
  const refundedOf = (id) =>
    account.refunds.filter((r) => r.invoiceId === id).reduce((s, r) => s + r.amountPaise, 0);
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-700">Charges</h3>
      <ul className="divide-y divide-slate-100 text-sm">
        {account.invoices.map((invoice) => {
          const status = invoiceStatus(invoice, today);
          const refunded = refundedOf(invoice.id);
          return (
            <li key={invoice.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-800">{invoice.description}</p>
                <p className="text-xs text-slate-500">
                  Due {displayDate(invoice.dueOn)}
                  {invoice.discountPaise > 0 &&
                    ` · ${formatRupees(invoice.discountPaise)} off (${invoice.discountReason})`}
                  {refunded > 0 && ` · ${formatRupees(refunded)} refunded`}
                </p>
              </div>
              <span className="tabular-nums text-slate-900">
                {formatRupees(invoice.amountPaise)}
              </span>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
              {canVoid && invoice.status !== "void" && (
                <span className="flex">
                  {invoice.kind === "deposit" && invoice.paidPaise > refunded && (
                    <IconButton
                      icon={ICONS.refund}
                      label="Refund deposit"
                      onClick={() => onAction("refund", { ...invoice, refunded })}
                    />
                  )}
                  {invoice.balancePaise > 0 && (
                    <IconButton
                      icon={ICONS.discount}
                      label="Give a discount"
                      onClick={() => onAction("discount", invoice)}
                    />
                  )}
                  {invoice.paidPaise === 0 && (
                    <IconButton
                      icon={ICONS.void}
                      variant="danger-ghost"
                      label="Void charge"
                      onClick={() => onAction("voidInvoice", invoice)}
                    />
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PaymentList({ payments, canVoid, onVoid }) {
  if (payments.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-700">Receipts</h3>
      <ul className="divide-y divide-slate-100 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 py-2.5">
            <Link
              to={`/payments/${p.id}/receipt`}
              className="flex-1 text-brand-dark hover:underline"
            >
              #{p.receiptNo} · {displayDate(p.receivedOn)}
            </Link>
            <span
              className={
                p.status === "void"
                  ? "tabular-nums text-slate-400 line-through"
                  : "tabular-nums text-emerald-700"
              }
            >
              {formatRupees(p.amountPaise)}
            </span>
            {p.status === "void" ? (
              <Badge tone="slate">Void</Badge>
            ) : (
              canVoid && (
                <IconButton
                  icon={ICONS.void}
                  variant="danger-ghost"
                  label="Void receipt"
                  onClick={() => onVoid(p)}
                />
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountDialogs({ dialog, member, account, close }) {
  const voidPayment = useVoidPayment();
  const voidInvoice = useVoidInvoice();
  if (!dialog || !account) return null;
  const { kind, item } = dialog;
  if (kind === "collect")
    return <CollectPaymentDialog member={member} account={account} onClose={close} />;
  if (kind === "charge") return <ChargeDialog member={member} onClose={close} />;
  if (kind === "discount") return <DiscountDialog invoice={item} onClose={close} />;
  if (kind === "refund")
    return <RefundDialog invoice={item} refundedPaise={item.refunded} onClose={close} />;
  if (kind === "voidInvoice") {
    return (
      <VoidDialog
        title="Void this charge"
        consequence={`${item.description} will no longer be owed. It stays on record as void.`}
        confirmLabel="Void charge"
        busy={voidInvoice.isPending}
        onVoid={(v) => voidInvoice.mutateAsync({ id: item.id, ...v })}
        onClose={close}
      />
    );
  }
  return (
    <VoidDialog
      title={`Void receipt #${item.receiptNo}`}
      consequence={`${formatRupees(item.amountPaise)} will be taken off this student's payments; what it paid becomes due again. The receipt stays on record as void.`}
      confirmLabel="Void receipt"
      busy={voidPayment.isPending}
      onVoid={(v) => voidPayment.mutateAsync({ id: item.id, ...v })}
      onClose={close}
    />
  );
}
