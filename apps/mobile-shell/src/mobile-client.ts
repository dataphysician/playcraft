import { createConfiguredStudioClient, type StudioClient } from "@playcraft/studio";

export function createMobileShellStudioClient(serviceEndpoint?: string): StudioClient {
  return createConfiguredStudioClient({
    defaultSessionId: "mobile.session",
    serviceEndpoint,
    timelineIdPrefix: "mobile.timeline"
  });
}
