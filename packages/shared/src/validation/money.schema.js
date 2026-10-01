import { z } from "zod";
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from "../constants/money.js";
import { dateKeyField, idField, paiseField, rupeesField } from "./common.js";

// Payments, charges, discounts, refunds, expenses and billing settings. Each API
// schema takes paise; each *FormSchema takes typed rupees and outputs the API shape.

const modeField = z.enum(/** @type {[string, ...string[]]} */ ([...PAYMENT_MODES]), {
  message: "Choose how it was paid",
});
const positivePaise = paiseField.refine((paise) => paise > 0, "Enter an amount above ₹0");
const positiveRupees = rupeesField.refine((paise) => paise > 0, "Enter an amount above ₹0");
const text = (max) => z.string().trim().max(max, "Too long");
const reasonField = z.string().trim().min(3, "Say why, in a few words").max(200, "Too long");

/** "" (left empty) → 0 paise; otherwise rupees → paise. */
export const optionalRupeesField = z
  .union([z.literal(""), rupeesField])
  .transform((value) => (value === "" ? 0 : value));

// ── Payments ───────────────────────────────────────────────────────────
const paymentShape = {
  memberId: idField,
  mode: modeField,
  reference: text(80).default(""),
  note: text(300).default(""),
  invoiceIds: z.array(idField).max(50).default([]),
  receivedOn: dateKeyField.optional(),
};

export const collectPaymentSchema = z.object({ ...paymentShape, amountPaise: positivePaise });

export const collectPaymentFormSchema = z
  .object({ ...paymentShape, amount: positiveRupees })
  .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount }));

export const voidSchema = z.object({ reason: reasonField });

export const paymentListQuerySchema = z.object({
  from: dateKeyField,
  to: dateKeyField,
  mode: z.enum(/** @type {[string, ...string[]]} */ ([...PAYMENT_MODES])).optional(),
});

// ── Charges, discounts, deposit refunds ────────────────────────────────
const chargeShape = {
  memberId: idField,
  description: z.string().trim().min(2, "Describe the charge").max(160),
  dueOn: dateKeyField.optional(),
};

export const chargeSchema = z.object({ ...chargeShape, amountPaise: positivePaise });
export const chargeFormSchema = z
  .object({ ...chargeShape, amount: positiveRupees })
  .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount }));

export const discountSchema = z.object({ discountPaise: paiseField, reason: reasonField });
export const discountFormSchema = z
  .object({ discount: optionalRupeesField, reason: reasonField })
  .transform(({ discount, reason }) => ({ discountPaise: discount, reason }));

const refundShape = {
  mode: modeField,
  note: text(300).default(""),
  refundedOn: dateKeyField.optional(),
};
export const depositRefundSchema = z.object({ ...refundShape, amountPaise: positivePaise });
export const depositRefundFormSchema = z
  .object({ ...refundShape, amount: positiveRupees })
  .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount }));

// ── Expenses ───────────────────────────────────────────────────────────
const expenseShape = {
  category: z.enum(/** @type {[string, ...string[]]} */ ([...EXPENSE_CATEGORIES])),
  title: z.string().trim().min(2, "What was it for?").max(160),
  spentOn: dateKeyField,
  mode: modeField,
};

export const expenseSchema = z.object({ ...expenseShape, amountPaise: positivePaise });
export const expenseFormSchema = z
  .object({ ...expenseShape, amount: positiveRupees })
  .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount }));

export const dateRangeQuerySchema = z
  .object({ from: dateKeyField, to: dateKeyField })
  .refine((range) => range.from <= range.to, { path: ["to"], message: "End must be after start" });

// ── Billing rules (Settings) ───────────────────────────────────────────
export const billingSettingsSchema = z.object({
  billingAnchor: z.enum(["join_date", "month_start"]),
  firstPeriodBilling: z.enum(["full", "prorated"]),
  defaultCollection: z.enum(["advance", "arrears"]),
  graceDays: z.coerce.number().int().min(0, "0 or more").max(90, "At most 90 days"),
  autoReleaseUnpaid: z.boolean(),
});
