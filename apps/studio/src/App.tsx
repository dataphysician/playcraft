import React from "react";

import { createLocalStudioClient } from "./local-client.js";
import { StudioApp } from "./studio-app.js";

export function App(): React.JSX.Element {
  const client = React.useMemo(() => createLocalStudioClient(), []);

  return <StudioApp client={client} />;
}
