import React from "react";

import { createConfiguredStudioClient } from "./local-client.js";
import { StudioApp } from "./studio-app.js";

export function App(): React.JSX.Element {
  const serviceEndpoint = import.meta.env.VITE_PLAYCRAFT_SERVICE_URL;
  const client = React.useMemo(() => createConfiguredStudioClient({ serviceEndpoint }), [serviceEndpoint]);

  return <StudioApp client={client} />;
}
