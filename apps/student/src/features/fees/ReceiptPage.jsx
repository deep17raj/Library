import { Link, useParams } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { Alert, Button, ReceiptView, Spinner } from "@app/shared/ui";
import { useMyReceipt } from "./api.js";

/** One of my receipts, exactly as the desk prints it; Print / "Save as PDF" from here. */
export function ReceiptPage() {
  const { id } = useParams();
  const { data: receipt, isLoading, error } = useMyReceipt(id);
  if (isLoading) return <Spinner />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/fees" className="text-sm font-medium text-brand-dark">
          ← Fees
        </Link>
        <Button variant="secondary" icon={ICONS.print} onClick={() => window.print()}>
          Print / PDF
        </Button>
      </div>
      <ReceiptView receipt={receipt} />
    </div>
  );
}
