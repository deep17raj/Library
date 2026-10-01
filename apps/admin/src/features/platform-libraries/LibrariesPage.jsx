import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card, EmptyState, PageHeader, Spinner } from "@app/shared/ui";
import { displayDateTime } from "@app/shared/time";
import { useLibraries } from "./api.js";
import { CreateLibraryDialog } from "./components/CreateLibraryDialog.jsx";
import { StatusBadge } from "./components/StatusBadge.jsx";

export function LibrariesPage() {
  const { data: libraries, isLoading, error } = useLibraries();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Libraries"
        description="Every library using the platform."
        actions={<Button onClick={() => setCreating(true)}>New library</Button>}
      />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Spinner />}
      {libraries?.length === 0 && (
        <EmptyState
          title="No libraries yet"
          description="Create the first library and its owner's login."
          action={<Button onClick={() => setCreating(true)}>New library</Button>}
        />
      )}
      {libraries?.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Library</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owners</th>
                <th className="px-4 py-3">Last staff sign-in</th>
              </tr>
            </thead>
            <tbody>
              {libraries.map((library) => (
                <tr key={library.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link to={library.id} className="font-medium text-brand-dark hover:underline">
                      {library.name}
                    </Link>
                    <p className="font-mono text-xs text-slate-500">/s/{library.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={library.status} />
                  </td>
                  <td className="px-4 py-3">{library.ownerCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {displayDateTime(library.lastLoginAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <CreateLibraryDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
