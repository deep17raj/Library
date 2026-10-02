import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { queryClient } from "../../app/queryClient.js";
import {
  currentSubscription,
  disablePush,
  enablePush,
  endpointHash,
  pushSupported,
} from "../../app/push.js";

const DEVICES_KEY = ["push-devices"];

/**
 * My devices with notifications on, and whether this phone is one of them:
 * `{ devices, thisDeviceOn }`.
 */
export function usePushDevices() {
  return useQuery({
    queryKey: DEVICES_KEY,
    queryFn: async () => {
      const { devices } = await api.get("/push/devices");
      const subscription = pushSupported() ? await currentSubscription() : null;
      const mine = subscription ? await endpointHash(subscription.endpoint) : null;
      return {
        devices: devices.map((d) => ({ ...d, isThisDevice: d.endpointHash === mine })),
        thisDeviceOn: Boolean(mine && devices.some((d) => d.endpointHash === mine)),
      };
    },
  });
}

/** Turn notifications on (`true`) or off (`false`) for this phone. */
export function useSetPush() {
  return useMutation({
    mutationFn: (on) => (on ? enablePush() : disablePush()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY }),
  });
}
