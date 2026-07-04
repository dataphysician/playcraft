import React from "react";
import { StudioApp } from "@playcraft/studio";

import { createMobileShellStudioClient } from "./mobile-client.js";

export function App(): React.JSX.Element {
  const client = React.useMemo(() => createMobileShellStudioClient(), []);

  return <StudioApp client={client} />;
}
