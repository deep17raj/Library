# audit

Append-only log of who changed what (`audit_log` table). Services call
`recordAudit(tx, byUser(actor, "library.suspend", "library", id, {...}))` inside the
same transaction as the change, so a change is never saved without its record.

There is no API yet; a viewer screen is planned with the insights milestone.
