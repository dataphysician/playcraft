import React from "react";
import {
  StudioApp,
  serviceEndpointFromStudioRuntimeEnv,
  studioRuntimeEnvFromServiceEndpoint
} from "@playcraft/studio";

import { createMobileShellStudioClient } from "./mobile-client.js";

export function App(): React.JSX.Element {
  const serviceEndpoint = serviceEndpointFromStudioRuntimeEnv(
    studioRuntimeEnvFromServiceEndpoint(import.meta.env.VITE_PLAYCRAFT_SERVICE_URL)
  );
  const client = React.useMemo(() => createMobileShellStudioClient(serviceEndpoint), [serviceEndpoint]);

  return <StudioApp client={client} />;
}
