# Free-first stack

## Development

Use the existing Node/CODY environment, GitHub private repositories, local builds, FFmpeg, and open-source Baileys/tinyasr components. A phone is the human test device; the bot still needs a server or computer to run the Node/WebRTC stack.

## AI services

Start with deterministic replies and local/open-source ASR/TTS where practical. Free-tier APIs may be used for experiments, but record quotas, latency, privacy terms, and whether the provider can change or remove the free tier. Do not design the core system around an unpaid quota.

## Hosting

The cheapest proof is an existing computer or free temporary environment that can keep the process alive long enough for a test. Always-on free hosting is not guaranteed. Do not promise 24/7 availability until a real deployment survives disconnects and restarts.

## License and privacy

Review tinyasr's GPLv3-or-later license and all model licenses before distribution. Treat phone audio, transcripts, WhatsApp authentication, and TTS/LLM provider requests as sensitive data.
