import React from "react";
import { StudioApp, serviceEndpointFromStudioRuntimeEnv } from "@playcraft/studio";

import { createMobileShellStudioClient } from "./mobile-client.js";

export function App(): React.JSX.Element {
  const serviceEndpoint = serviceEndpointFromStudioRuntimeEnv(import.meta.env);
  const client = React.useMemo(() => createMobileShellStudioClient(serviceEndpoint), [serviceEndpoint]);

  return <StudioApp client={client} />;
}
