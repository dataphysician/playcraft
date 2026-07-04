import { createConfiguredStudioClient, type StudioClient } from "@playcraft/studio";

export const MOBILE_SHELL_CLIENT_POLICY = {
  defaultSessionId: "mobile.session",
  defaultTimelineIdPrefix: "mobile.timeline"
} as const;

export function createMobileShellStudioClient(serviceEndpoint?: string): StudioClient {
  return createConfiguredStudioClient({
    defaultSessionId: MOBILE_SHELL_CLIENT_POLICY.defaultSessionId,
    serviceEndpoint,
    timelineIdPrefix: MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix
  });
}
