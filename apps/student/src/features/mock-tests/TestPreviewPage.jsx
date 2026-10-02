import { useParams } from "react-router-dom";
import { formatRupees } from "@app/shared/money";
import { Button, PageHeader } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { pdfUrl, useMockTests } from "./api.js";

export function TestPreviewPage() {
  const { id } = useParams();
  const { data: tests = [], isLoading } = useMockTests();
  const test = tests.find((t) => t.id === id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">Loading…</div>
    );
  }

  if (!test) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Test not found.
      </div>
    );
  }

  const price = test.pricePaise > 0 ? formatRupees(test.pricePaise) : "Free";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={ICONS.mockTest}
        title={test.title}
        description={test.description || "Question paper"}
      />

      {/* PDF preview — top half visible, bottom half blurred */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-md ring-1 ring-slate-200">
        <iframe src={pdfUrl(id)} title={test.title} className="h-[60vh] w-full border-0" />
        {/* Blur overlay covers the bottom 55% of the iframe */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{
            height: "55%",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(248,250,252,0.7) 20%, rgba(248,250,252,0.97) 60%, #f8fafc 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{ height: "40%", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          aria-hidden="true"
        />
      </div>

      {/* Pay wall card */}
      <div className="rounded-2xl bg-white px-5 py-5 shadow-md ring-2 ring-violet-200 text-center flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <ICONS.mockTest className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Unlock the full paper</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {test.pricePaise > 0
              ? `Get full access for ${price}`
              : "This paper is free — payment coming soon"}
          </p>
        </div>
        <Button className="w-full" disabled>
          {test.pricePaise > 0 ? `Pay ${price}` : "Get free access"} — coming soon
        </Button>
        <p className="text-xs text-slate-400">Online payments will be enabled soon.</p>
      </div>
    </div>
  );
}
