import React from "react";
import {
  StudioApp,
  serviceEndpointFromStudioRuntimeEnv,
  studioRuntimeEnvFromServiceEndpoint
} from "@playcraft/studio";

import {
  createMobileShellStudioClient,
  createMobileAudioCueListener,
  type MobileAudioCueListener
} from "./mobile-client.js";

export interface AppProps {
  audioCueListener?: MobileAudioCueListener;
}

export function App({ audioCueListener }: AppProps = {}): React.JSX.Element {
  const serviceEndpoint = serviceEndpointFromStudioRuntimeEnv(
    studioRuntimeEnvFromServiceEndpoint(import.meta.env.VITE_PLAYCRAFT_SERVICE_URL)
  );
  const client = React.useMemo(() => createMobileShellStudioClient(serviceEndpoint), [serviceEndpoint]);
  const listenerRef = React.useRef<MobileAudioCueListener | null>(null);
  if (listenerRef.current === null) {
    listenerRef.current = audioCueListener ?? createMobileAudioCueListener();
  }

  return <StudioApp client={client} onAudioCue={listenerRef.current.onAudioCue} />;
}
