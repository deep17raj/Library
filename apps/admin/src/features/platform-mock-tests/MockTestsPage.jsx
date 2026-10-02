import { useRef, useState } from "react";
import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  SectionCard,
  Skeleton,
  useToast,
} from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useMockTests, useTogglePublish, useUploadMockTest } from "./api.js";

const PDF_MAX_BYTES = 20 * 1024 * 1024;

export function MockTestsPage() {
  const { data: tests = [], isLoading, error } = useMockTests();
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <PageHeader
        icon={ICONS.mockTest}
        title="Mock tests"
        description="Upload question papers as PDFs. Students can preview and purchase."
        actions={
          <Button icon={ICONS.add} onClick={() => setShowForm((v) => !v)}>
            Upload paper
          </Button>
        }
      />
      <Alert tone="error">{error?.message}</Alert>
      {showForm && <UploadForm onDone={() => setShowForm(false)} />}
      {isLoading && <Skeleton rows={3} />}
      {!isLoading && tests.length === 0 && !showForm && (
        <EmptyState
          icon={ICONS.mockTest}
          title="No mock tests yet"
          description="Upload your first question paper to make it available to students."
          action={
            <Button icon={ICONS.add} onClick={() => setShowForm(true)}>
              Upload paper
            </Button>
          }
        />
      )}
      {tests.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          {tests.map((t) => (
            <TestRow key={t.id} test={t} />
          ))}
        </div>
      )}
    </>
  );
}

function UploadForm({ onDone }) {
  const upload = useUploadMockTest();
  const toast = useToast();
  const fileRef = useRef(null);
  const [fields, setFields] = useState({ title: "", description: "", price: "" });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > PDF_MAX_BYTES) {
      setFileError("PDF must be under 20 MB");
      return;
    }
    if (f.type !== "application/pdf") {
      setFileError("Only PDF files are accepted");
      return;
    }
    setFileError("");
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setFileError("Choose a PDF to upload");
      return;
    }
    if (!fields.title.trim()) return;
    try {
      await upload.mutateAsync({
        title: fields.title.trim(),
        description: fields.description.trim(),
        pricePaise: Math.round(parseFloat(fields.price || "0") * 100),
        file,
      });
      toast("Mock test uploaded", { tone: "success" });
      onDone();
    } catch (err) {
      toast(err.message, { tone: "error" });
    }
  };

  return (
    <SectionCard title="Upload a question paper" className="mb-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            required
            value={fields.title}
            onChange={set("title")}
            placeholder="e.g. UPSC Prelims 2024 — Set A"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={fields.description}
            onChange={set("description")}
            placeholder="120 questions, 2 hours, full syllabus"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="sm:max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-700">Price (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={fields.price}
            onChange={set("price")}
            placeholder="99"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">PDF file</label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              {file ? "Change file" : "Choose PDF"}
            </Button>
            {file && <span className="text-sm text-slate-600 truncate max-w-xs">{file.name}</span>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFile}
          />
          {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          <p className="mt-1 text-xs text-slate-400">PDF only, up to 20 MB.</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" busy={upload.isPending}>
            Upload
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function TestRow({ test }) {
  const toggle = useTogglePublish();
  const toast = useToast();

  const onToggle = async () => {
    try {
      await toggle.mutateAsync({ id: test.id, published: !test.isPublished });
      toast(test.isPublished ? "Unpublished" : "Published to students", { tone: "success" });
    } catch (err) {
      toast(err.message, { tone: "error" });
    }
  };

  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <ICONS.mockTest className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">{test.title}</span>
          <Badge tone={test.isPublished ? "green" : "slate"}>
            {test.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        {test.description && <p className="mt-0.5 text-sm text-slate-500">{test.description}</p>}
        <div className="mt-1 flex gap-3 text-xs text-slate-400">
          <span>{test.pricePaise === 0 ? "Free" : formatRupees(test.pricePaise)}</span>
          {test.publishedAt && <span>Published {displayDate(test.publishedAt.slice(0, 10))}</span>}
        </div>
      </div>
      <Button
        size="sm"
        variant={test.isPublished ? "ghost" : "secondary"}
        busy={toggle.isPending}
        onClick={onToggle}
      >
        {test.isPublished ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}
