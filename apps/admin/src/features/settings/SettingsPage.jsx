import { Alert, PageHeader, Skeleton } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useLibrarySettings } from "./api.js";
import { BillingRulesCard } from "./components/BillingRulesCard.jsx";
import { CheckinRulesCard } from "./components/CheckinRulesCard.jsx";
import { StudentAppCard } from "../student-app/components/StudentAppCard.jsx";
import { LogoCard } from "./components/LogoCard.jsx";
import { ProfileForm } from "./components/ProfileForm.jsx";

export function SettingsPage() {
  const { data: settings, isLoading, error } = useLibrarySettings();
  return (
    <>
      <PageHeader
        icon={ICONS.settings}
        title="Settings"
        description="Your library's details, branding, billing and check-in rules, and the student app."
      />
      {isLoading && <Skeleton rows={3} />}
      <Alert tone="error">{error?.message}</Alert>
      {settings && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <ProfileForm settings={settings} />
            <LogoCard settings={settings} />
          </div>
          <BillingRulesCard settings={settings} />
          <CheckinRulesCard settings={settings} />
          <StudentAppCard />
        </div>
      )}
    </>
  );
}
