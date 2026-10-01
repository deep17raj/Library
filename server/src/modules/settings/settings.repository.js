import { execute, queryOne } from "../../db/transaction.js";
import { readJsonColumn } from "../../db/json.js";
import { DEFAULT_BRAND_COLOR } from "@app/shared/theme";

function toSettings(row) {
  if (!row) return null;
  const theme = readJsonColumn(row.theme, {});
  return {
    displayName: row.display_name,
    logoPath: row.logo_path,
    address: row.address,
    contactPhone: row.contact_phone,
    timezone: row.timezone,
    brandColor: theme.brandColor || DEFAULT_BRAND_COLOR,
    receiptPrefix: row.receipt_prefix,
    memberCodePrefix: row.member_code_prefix,
    billing: {
      billingAnchor: row.billing_anchor,
      firstPeriodBilling: row.first_period_billing,
      defaultCollection: row.default_collection,
      graceDays: row.grace_days,
      autoReleaseUnpaid: Boolean(row.auto_release_unpaid),
    },
    checkin: {
      slotCheckMode: row.slot_check_mode,
      slotEarlyMinutes: row.slot_early_minutes,
      allowOverdueCheckin: Boolean(row.allow_overdue_checkin),
    },
  };
}

export async function getSettings(db, tenantId) {
  return toSettings(
    await queryOne(db, "SELECT * FROM library_settings WHERE tenant_id = ?", [tenantId]),
  );
}

/** @param {import("@app/shared/validation").librarySettingsSchema["_output"]} values */
export async function updateProfile(db, tenantId, values) {
  await execute(
    db,
    `UPDATE library_settings
        SET display_name = ?, address = ?, contact_phone = ?, timezone = ?,
            theme = JSON_SET(COALESCE(theme, JSON_OBJECT()), '$.brandColor', ?),
            receipt_prefix = ?, member_code_prefix = ?
      WHERE tenant_id = ?`,
    [
      values.displayName,
      values.address,
      values.contactPhone,
      values.timezone,
      values.brandColor,
      values.receiptPrefix,
      values.memberCodePrefix,
      tenantId,
    ],
  );
}

export async function setLogoPath(db, tenantId, logoPath) {
  await execute(db, "UPDATE library_settings SET logo_path = ? WHERE tenant_id = ?", [
    logoPath,
    tenantId,
  ]);
}

/** @param {import("@app/shared/validation").billingSettingsSchema["_output"]} values */
export async function updateBilling(db, tenantId, values) {
  await execute(
    db,
    `UPDATE library_settings
        SET billing_anchor = ?, first_period_billing = ?, default_collection = ?, grace_days = ?,
            auto_release_unpaid = ?
      WHERE tenant_id = ?`,
    [
      values.billingAnchor,
      values.firstPeriodBilling,
      values.defaultCollection,
      values.graceDays,
      values.autoReleaseUnpaid ? 1 : 0,
      tenantId,
    ],
  );
}

/** @param {import("@app/shared/validation").checkinSettingsSchema["_output"]} values */
export async function updateCheckin(db, tenantId, values) {
  await execute(
    db,
    `UPDATE library_settings
        SET slot_check_mode = ?, slot_early_minutes = ?, allow_overdue_checkin = ?
      WHERE tenant_id = ?`,
    [values.slotCheckMode, values.slotEarlyMinutes, values.allowOverdueCheckin ? 1 : 0, tenantId],
  );
}
