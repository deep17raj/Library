import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "../../http/AppError.js";
import { bindDeps } from "../../lib/bindDeps.js";
import * as repo from "./mock-tests.repository.js";

const PDF_SUBDIR = "mock-tests";

/** Save uploaded PDF buffer to storage, return relative path. */
async function savePdf(storageDir, buffer) {
  const relativePath = `${PDF_SUBDIR}/${crypto.randomUUID()}.pdf`;
  const fullPath = path.join(storageDir, "private", relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return relativePath;
}

export function createMockTestsService({ db, storageDir, repo: r = repo }) {
  return bindDeps(
    { db, storageDir, repo: r },
    {
      listAll,
      listPublished,
      getById,
      create,
      setPublished,
      getPdfPath,
    },
  );
}

async function listAll(deps) {
  return deps.repo.listAll(deps.db);
}

async function listPublished(deps) {
  return deps.repo.listPublished(deps.db);
}

async function getById(deps, id) {
  const test = await deps.repo.findById(deps.db, id);
  if (!test) throw notFound("Mock test not found");
  return test;
}

async function create(deps, ctx, { title, description, pricePaise, pdfBuffer }) {
  const pdfPath = await savePdf(deps.storageDir, pdfBuffer);
  const id = await deps.repo.insertTest(deps.db, {
    title,
    description,
    pricePaise,
    pdfPath,
    createdBy: ctx.actor.id,
  });
  return deps.repo.findById(deps.db, id);
}

async function setPublished(deps, _ctx, id, published) {
  const test = await deps.repo.findById(deps.db, id);
  if (!test) throw notFound("Mock test not found");
  await deps.repo.setPublished(deps.db, id, published);
  return deps.repo.findById(deps.db, id);
}

/** Returns the absolute filesystem path for a test's PDF (for streaming). */
async function getPdfPath(deps, id) {
  const test = await deps.repo.findById(deps.db, id);
  if (!test || !test.pdfPath) throw notFound("PDF not found");
  return path.join(deps.storageDir, "private", test.pdfPath);
}
