import React from "react";
import { LiveGame, type AudioCue, type LiveGameInteraction } from "@playcraft/studio";

import { bundleAssetReplacementsForLiveGame, loadGameBundle } from "./bundle-loader.js";
import type { GameBundle } from "@playcraft/contracts";

export interface OfflineGameProps {
  bundle: GameBundle;
  onAudioCue?: (cue: AudioCue) => void;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}

export function OfflineGame({ bundle, onAudioCue, onInteraction }: OfflineGameProps): React.JSX.Element {
  const loaded = React.useMemo(() => loadGameBundle(bundle), [bundle]);
  const replacements = React.useMemo(
    () => bundleAssetReplacementsForLiveGame(bundle),
    [bundle]
  );

  return React.createElement(LiveGame, {
    profile: loaded.profile,
    assetReplacements: replacements,
    onAudioCue,
    onInteraction
  });
}
