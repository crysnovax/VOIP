# Test plan

## Phone-only smoke test

Use one normal phone as caller and run CODY on a server/computer. The person does not need a laptop as the calling device.

1. Confirm the caller is allowlisted.
2. Call the CODY WhatsApp account.
3. Confirm `incomingCall` is observed.
4. Answer using the controlled test path.
5. Say `CODY test one.`
6. Confirm inbound PCM, ASR partial, committed text, and one response.
7. Interrupt while CODY speaks.
8. Remain silent and verify no response loop.
9. Hang up and verify all resources close.
10. Repeat after a process restart.

## Acceptance gates

- Lifecycle: 5 clean calls.
- Transport: caller hears known audio and server receives intelligible audio.
- ASR: 5 known sentences produce committed text.
- Fixed response: 10 turns without overlap.
- Reliability: restart and stale-call matrix passes.

## Result template

```text
Date/time:
Commit:
Baileys version:
CODY version:
Network:
Incoming detected: yes/no
Answered: yes/no
Connected: yes/no
Inbound PCM: yes/no
ASR partial: yes/no
ASR commit: yes/no
TTS generated: yes/no
Caller heard response: yes/no
Barge-in: yes/no
Clean hangup: yes/no
Error:
Next action:
```

Never attach audio, transcripts, auth files, or phone numbers to this repository unless the experiment explicitly requires it and the data has been sanitized.
