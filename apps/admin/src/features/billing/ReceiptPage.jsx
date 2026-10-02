import { Link, useParams } from "react-router-dom";
import { Alert, Button, ReceiptView, Spinner } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useReceipt } from "./api.js";

/**
 * Printable receipt. The app's sidebar and these buttons are hidden when printing
 * (`no-print`); the receipt itself is the shared ReceiptView (same as the student app).
 */
export function ReceiptPage() {
  const { id } = useParams();
  const { data: receipt, isLoading, error } = useReceipt(id);
  if (isLoading) return <Spinner />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  const { payment } = receipt;

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
      <ReceiptView receipt={receipt} />
    </div>
  );
}
