# Playcraft Mobile Shell

This folder is a Tauri Mobile-facing scaffold for the Playcraft Studio webview.

The shell is intentionally local-first:

- Text input and Moonshine Streaming CPU transcript records enter through `@playcraft/service`.
- Game assembly, update, preview, and catalog actions are provided by local Playcraft builder tools.
- Asset swaps are expressed as typed asset-edit records so local sprite folders or future retrieval adapters can replace component art without changing the game rules.
- No native permissions are required for the current text/transcript demo.
- A future mobile build can replace the in-process local service with a server-backed service adapter without changing the Studio UI contract.
