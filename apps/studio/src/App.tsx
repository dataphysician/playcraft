import React from "react";

import { createConfiguredStudioClient, serviceEndpointFromStudioRuntimeEnv } from "./local-client.js";
import { StudioApp } from "./studio-app.js";

export function App(): React.JSX.Element {
  const serviceEndpoint = serviceEndpointFromStudioRuntimeEnv(import.meta.env);
  const client = React.useMemo(() => createConfiguredStudioClient({ serviceEndpoint }), [serviceEndpoint]);

  return <StudioApp client={client} />;
}
