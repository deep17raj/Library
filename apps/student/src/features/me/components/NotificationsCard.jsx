import { ICONS } from "@app/shared/icons";
import { Badge, Button, SectionCard, useToast } from "@app/shared/ui";
import { pushSupported } from "../../../app/push.js";
import { IOS_PUSH_MIN_VERSION, isIos, isStandalone, iosVersion } from "../../../app/pwa.js";
import { usePushDevices, useSetPush } from "../api.js";

/**
 * Why notifications can't be turned on yet, phrased as the next step to take. On iPhone
 * push needs iOS 16.4+ and the app installed to the home screen, so we say which one is
 * missing instead of a dead "not supported".
 */
function unavailableReason() {
  if (isIos()) {
    const version = iosVersion();
    if (version !== null && version < IOS_PUSH_MIN_VERSION) {
      return `Your iPhone needs iOS ${IOS_PUSH_MIN_VERSION} or newer for app notifications. We'll also remind you at the desk.`;
    }
    if (!isStandalone()) {
      return "Install the app first: tap the Share button, choose “Add to Home Screen”, then open it from your home screen and turn notifications on here.";
    }
  }
  return "This browser can’t show notifications. Install the app and open it from your home screen.";
}

/**
 * Notifications on this phone: fee reminders and library notices (sent from milestone
 * 8). Shows the student's other phones too, so they know where alerts go.
 */
export function NotificationsCard() {
  const toast = useToast();
  const { data } = usePushDevices();
  const setPush = useSetPush();
  const on = Boolean(data?.thisDeviceOn);

  const toggle = async () => {
    try {
      await setPush.mutateAsync(!on);
      toast(on ? "Notifications turned off on this phone" : "Notifications are on", {
        tone: "success",
      });
    } catch (error) {
      toast(error.message, { tone: "error" });
    }
  };

  return (
    <SectionCard
      icon={on ? ICONS.notifications : ICONS.notificationsOff}
      title="Notifications"
      description="Fee reminders and notices from the library."
    >
      {pushSupported() ? (
        <Button variant={on ? "secondary" : "primary"} busy={setPush.isPending} onClick={toggle}>
          {on ? "Turn off on this phone" : "Turn on notifications"}
        </Button>
      ) : (
        <p className="text-sm text-slate-500">{unavailableReason()}</p>
      )}
      {data?.devices.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {data.devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between">
              <span className="text-slate-700">{device.label}</span>
              {device.isThisDevice && <Badge tone="brand">This phone</Badge>}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
