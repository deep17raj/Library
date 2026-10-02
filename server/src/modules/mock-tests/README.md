# mock-tests

Platform-level mock test papers. Super admins upload PDFs; students preview and purchase.

- `listAll` / `listPublished` — for platform admin and students respectively
- `create` — stores the PDF in `storageDir/private/mock-tests/` and inserts the row
- `setPublished` — toggle visibility to students
- `getPdfPath` — returns the absolute path for streaming the PDF to authenticated students

Routes:
- `GET /api/platform/mock-tests` — list all (super admin)
- `POST /api/platform/mock-tests` — upload PDF + metadata (super admin)
- `POST /api/platform/mock-tests/:id/publish` / `/unpublish` — toggle (super admin)
- `GET /api/s/:slug/tests` — list published tests (authenticated students)
- `GET /api/s/:slug/tests/:id/pdf` — stream PDF (authenticated students)
