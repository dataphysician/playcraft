import React from "react";
import {
  StudioApp,
  serviceEndpointFromStudioRuntimeEnv,
  studioRuntimeEnvFromServiceEndpoint
} from "@playcraft/studio";
import type { GameBundle } from "@playcraft/contracts";

import {
  createMobileShellStudioClient,
  createMobileAudioCueListener,
  type MobileAudioCueListener
} from "./mobile-client.js";
import { OfflineGame } from "./OfflineGame.js";

export interface AppProps {
  audioCueListener?: MobileAudioCueListener;
  bundle?: GameBundle;
}

export function App({ audioCueListener, bundle }: AppProps = {}): React.JSX.Element {
  if (bundle) {
    const listener = audioCueListener ?? createMobileAudioCueListener();
    return React.createElement(OfflineGame, { bundle, onAudioCue: listener.onAudioCue });
  }

  const serviceEndpoint = serviceEndpointFromStudioRuntimeEnv(
    studioRuntimeEnvFromServiceEndpoint(import.meta.env.VITE_PLAYCRAFT_SERVICE_URL)
  );
  const client = React.useMemo(() => createMobileShellStudioClient(serviceEndpoint), [serviceEndpoint]);
  const listenerRef = React.useRef<MobileAudioCueListener | null>(null);
  if (listenerRef.current === null) {
    listenerRef.current = audioCueListener ?? createMobileAudioCueListener();
  }

  return React.createElement(StudioApp, { client, onAudioCue: listenerRef.current.onAudioCue });
}
