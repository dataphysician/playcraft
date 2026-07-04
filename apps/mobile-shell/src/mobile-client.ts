import { createLocalServiceTransport } from "@playcraft/service";
import { createStudioClientFromServiceTransport, type StudioClient } from "@playcraft/studio";

export function createMobileShellStudioClient(): StudioClient {
  return createStudioClientFromServiceTransport({
    defaultSessionId: "mobile.session",
    timelineIdPrefix: "mobile.timeline",
    transport: createLocalServiceTransport()
  });
}
