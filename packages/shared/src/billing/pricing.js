// What a subscription costs per billing period: the plan's price plus the seat
// category's surcharge (decision D6). Surcharges are quoted per month; a day plan
// pays them pro rata on a 30-day month.

const DAYS_PER_BILLING_MONTH = 30;

/**
 * @param {number} monthlySurchargePaise
 * @param {{ periodUnit: "month" | "day", periodCount: number }} plan
 */
export function surchargeForPeriod(monthlySurchargePaise, { periodUnit, periodCount }) {
  const monthly = Math.max(0, Math.round(Number(monthlySurchargePaise) || 0));
  if (periodUnit === "month") return monthly * periodCount;
  return Math.round((monthly * periodCount) / DAYS_PER_BILLING_MONTH);
}

/**
 * @param {{ pricePaise: number, periodUnit: "month" | "day", periodCount: number }} plan
 * @param {number} monthlySurchargePaise 0 when the seat/hall has no category
 * @returns {{ pricePaise: number, surchargePaise: number }} pricePaise includes the surcharge
 */
export function subscriptionPrice(plan, monthlySurchargePaise) {
  const surchargePaise = surchargeForPeriod(monthlySurchargePaise, plan);
  return { pricePaise: plan.pricePaise + surchargePaise, surchargePaise };
}
