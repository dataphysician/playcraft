// BAML client configurations. The local client targets the on-device Ollama
// instance running the LFM2.5-VL-450M-Extract model (wired from the
// Moonshine Streaming CPU config). The paid client targets the hosted OpenRouter
// router for the user-triggered "Paid Online Assembly" action.
//
// Both clients are configured via environment variables:
//   PLAYCRAFT_OLLAMA_URL (default: http://127.0.0.1:11434)
//   PLAYCRAFT_OLLAMA_MODEL (default: lfm2.5-vl-450m-extract)
//   PLAYCRAFT_OPENROUTER_API_KEY (required for paid)
//   PLAYCRAFT_OPENROUTER_MODEL (default: liquid/lfm-2.5-450m)

client<llm> LocalOllamaLfmExtract {
  provider ollama
  options {
    base_url env.PLAYCRAFT_OLLAMA_URL "http://127.0.0.1:11434"
    model env.PLAYCRAFT_OLLAMA_MODEL "lfm2.5-vl-450m-extract"
  }
}

client<llm> PaidOpenRouterLfm {
  provider openai-generic
  options {
    base_url "https://openrouter.ai/api/v1"
    api_key env.PLAYCRAFT_OPENROUTER_API_KEY
    model env.PLAYCRAFT_OPENROUTER_MODEL "liquid/lfm-2.5-450m"
  }
}
