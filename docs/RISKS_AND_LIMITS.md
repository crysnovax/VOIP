# Risks and limits

| Risk | Why it matters | Mitigation |
|---|---|---|
| WhatsApp/WebRTC changes | Calls may stop working after protocol or asset changes | Pin tested versions; keep smoke tests |
| Session/auth exposure | Anyone with auth state may control the account | Never commit it; restrict filesystem access |
| Wrong PCM format | ASR or caller audio becomes noise | Log and validate sample rate/channels/frame size |
| ASR partials trigger replies | Duplicate or premature speech | Respond only to committed/end-of-turn events |
| TTS latency | Caller experiences silence or overlap | Fixed fallback; bounded queue; interruption |
| Free quota disappears | A free proof becomes paid in production | Keep provider adapters replaceable; prefer local |
| Android-native runtime | Node/native WebRTC may not work on phone | Run bot on a server; use phone only as caller |
| Video complexity | Camera, codec, bandwidth, and consent add new failures | Delay until audio passes |
| Legal/privacy obligations | Voice processing and recording may require consent | Disable recording by default; review local law |
| GPL/model licenses | Distribution obligations may apply | Record licenses before release |

## What cannot be promised now

We cannot promise free permanent hosting, perfect latency, permanent WhatsApp compatibility, reliable Android-native execution, unlimited TTS/LLM usage, or production-grade uptime. We can promise a disciplined path to test each claim.
