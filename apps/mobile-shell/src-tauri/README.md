# Playcraft Mobile Shell

This folder is a Tauri Mobile-facing scaffold for the Playcraft Studio webview.

The shell is intentionally local-first:

- Text input and Moonshine Streaming CPU transcript records enter through `@playcraft/service`.
- Game assembly, update, preview, and catalog actions are provided by local Playcraft builder tools.
- Asset swaps are expressed as typed asset-edit records so local sprite folders or future retrieval adapters can replace component art without changing the game rules.
- Local speech adapters can pass validated `MoonshineTranscriptRecord` objects through the Studio client; the shell does not need native microphone permissions for the current text/transcript path.
- By default the shell uses an in-process local service. Set `VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft` to call the local HTTP service started by `pnpm serve:service`.
- No filesystem, shell, or microphone permissions are required for the current text/transcript demo.
- A future mobile build can replace the loopback local service with a server-backed service adapter without changing the Studio UI contract.
