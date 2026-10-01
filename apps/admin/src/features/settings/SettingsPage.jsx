import { Alert, PageHeader, Spinner } from "@app/shared/ui";
import { useLibrarySettings } from "./api.js";
import { ProfileForm } from "./components/ProfileForm.jsx";
import { LogoCard } from "./components/LogoCard.jsx";

export function SettingsPage() {
  const { data: settings, isLoading, error } = useLibrarySettings();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your library's name, contact details and branding."
      />
      {isLoading && <Spinner />}
      <Alert tone="error">{error?.message}</Alert>
      {settings && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ProfileForm settings={settings} />
          <LogoCard settings={settings} />
        </div>
      )}
    </>
  );
}
