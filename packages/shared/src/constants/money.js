/** How money was paid or spent. `online` is the payment gateway (mock tests, milestone 10). */
export const PAYMENT_MODES = Object.freeze(["cash", "upi", "card", "bank", "cheque", "other"]);

export const PAYMENT_MODE_LABELS = Object.freeze({
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank: "Bank transfer",
  cheque: "Cheque",
  online: "Online",
  other: "Other",
});

export const INVOICE_KINDS = Object.freeze(["seat_fee", "locker", "admission", "deposit", "other"]);

export const INVOICE_KIND_LABELS = Object.freeze({
  seat_fee: "Seat fee",
  locker: "Locker",
  admission: "Admission",
  deposit: "Security deposit",
  other: "Other charge",
});

export const EXPENSE_CATEGORIES = Object.freeze([
  "rent",
  "electricity",
  "internet",
  "salary",
  "cleaning",
  "maintenance",
  "supplies",
  "other",
]);

export const EXPENSE_CATEGORY_LABELS = Object.freeze({
  rent: "Rent",
  electricity: "Electricity",
  internet: "Internet",
  salary: "Salary",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  supplies: "Supplies",
  other: "Other",
});
