import crypto from "node:crypto";
import { execute, queryAll, queryOne } from "../../db/transaction.js";

function toTest(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    pricePaise: row.price_paise,
    pdfPath: row.pdf_path,
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
  };
}

export async function listAll(db) {
  const rows = await queryAll(db, "SELECT * FROM mock_tests ORDER BY created_at DESC");
  return rows.map(toTest);
}

export async function listPublished(db) {
  const rows = await queryAll(
    db,
    "SELECT * FROM mock_tests WHERE is_published = 1 ORDER BY published_at DESC",
  );
  return rows.map(toTest);
}

export async function findById(db, id) {
  return toTest(await queryOne(db, "SELECT * FROM mock_tests WHERE id = ?", [id]));
}

export async function insertTest(db, { title, description, pricePaise, pdfPath, createdBy }) {
  const id = crypto.randomUUID();
  await execute(
    db,
    `INSERT INTO mock_tests (id, title, description, price_paise, pdf_path, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, description ?? "", pricePaise, pdfPath, createdBy ?? null],
  );
  return id;
}

export async function updateTest(db, id, { title, description, pricePaise }) {
  await execute(
    db,
    "UPDATE mock_tests SET title = ?, description = ?, price_paise = ? WHERE id = ?",
    [title, description ?? "", pricePaise, id],
  );
}

export async function setPublished(db, id, published) {
  await execute(
    db,
    `UPDATE mock_tests SET is_published = ?, published_at = IF(?, UTC_TIMESTAMP(), published_at)
     WHERE id = ?`,
    [published ? 1 : 0, published ? 1 : 0, id],
  );
}

export async function deletePdfPath(db, id, pdfPath) {
  await execute(db, "UPDATE mock_tests SET pdf_path = '' WHERE id = ? AND pdf_path = ?", [
    id,
    pdfPath,
  ]);
}
