export interface AudioCue {
  kind: "success" | "error" | "reveal" | "complete";
  volume: number;
  duration: number;
}

export function audioCueForEvent(kind: "success" | "error" | "reveal" | "complete"): AudioCue {
  switch (kind) {
    case "success":
      return { kind, volume: 0.8, duration: 200 };
    case "error":
      return { kind, volume: 0.6, duration: 300 };
    case "reveal":
      return { kind, volume: 0.5, duration: 150 };
    case "complete":
      return { kind, volume: 1, duration: 400 };
  }
}
