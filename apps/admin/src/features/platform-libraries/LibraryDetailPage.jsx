import { Link, useParams } from "react-router-dom";
import { Alert, PageHeader, Spinner } from "@app/shared/ui";
import { useLibrary } from "./api.js";
import { LibrarySummaryCard } from "./components/LibrarySummaryCard.jsx";
import { AccountsCard } from "./components/AccountsCard.jsx";
import { ICONS } from "@app/shared/icons";

export function LibraryDetailPage() {
  const { id } = useParams();
  const { data: library, isLoading, error } = useLibrary(id);

  return (
    <>
      <Link to="/platform/libraries" className="text-sm text-brand-dark hover:underline">
        ← All libraries
      </Link>
      {isLoading && <Spinner />}
      <Alert tone="error">{error?.message}</Alert>
      {library && (
        <>
          <PageHeader
            icon={ICONS.libraries}
            title={library.name}
            description={`/s/${library.slug}`}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <LibrarySummaryCard library={library} />
            <AccountsCard library={library} />
          </div>
        </>
      )}
    </>
  );
}
