import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError } from "../../http/AppError.js";
import { asyncHandler } from "../../http/asyncHandler.js";

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }, // 20 MB
  fileFilter(req, file, accept) {
    if (file.mimetype === "application/pdf") return accept(null, true);
    const msg = "Only PDF files are accepted";
    return accept(new AppError(422, ERROR_CODES.VALIDATION_FAILED, msg, { pdf: msg }));
  },
}).single("pdf");

/** POST /api/platform/mock-tests — super-admin only; caller sets requireSuperAdmin middleware */
export function createMockTestsPlatformRouter({ mockTestsService: svc }) {
  const router = Router();

  router.get(
    "/mock-tests",
    asyncHandler(async (req, res) => res.json(await svc.listAll())),
  );

  router.post(
    "/mock-tests",
    pdfUpload,
    asyncHandler(async (req, res) => {
      if (!req.file) {
        const msg = "Choose a PDF to upload";
        throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, msg, { pdf: msg });
      }
      const pricePaise = parseInt(req.body.pricePaise ?? "0", 10) || 0;
      const test = await svc.create(
        { actor: { id: req.user.id } },
        {
          title: req.body.title?.trim() ?? "Untitled",
          description: req.body.description?.trim() ?? "",
          pricePaise,
          pdfBuffer: req.file.buffer,
        },
      );
      res.status(201).json(test);
    }),
  );

  router.post(
    "/mock-tests/:id/publish",
    asyncHandler(async (req, res) => {
      const test = await svc.setPublished({ actor: req.user }, req.params.id, true);
      res.json(test);
    }),
  );

  router.post(
    "/mock-tests/:id/unpublish",
    asyncHandler(async (req, res) => {
      const test = await svc.setPublished({ actor: req.user }, req.params.id, false);
      res.json(test);
    }),
  );

  return router;
}

/** GET /api/s/:slug/tests — published tests visible to authenticated students */
export function createMockTestsStudentRouter({ mockTestsService: svc }) {
  const router = Router();

  router.get(
    "/tests",
    asyncHandler(async (_req, res) => res.json(await svc.listPublished())),
  );

  router.get(
    "/tests/:id/pdf",
    asyncHandler(async (req, res) => {
      const pdfPath = await svc.getPdfPath(req.params.id);
      if (!fs.existsSync(pdfPath)) throw new AppError(404, ERROR_CODES.NOT_FOUND, "PDF not found");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      fs.createReadStream(pdfPath).pipe(res);
    }),
  );

  return router;
}
