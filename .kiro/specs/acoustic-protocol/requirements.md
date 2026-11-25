# Spec: GW-1 Acoustic Protocol (resurrect the 1962 modem, safely)

## Purpose

Define the wire format and decoding behavior for text-over-air between
untrusted consumer devices with unknown clocks, unknown microphones, and
hostile noise.

## Requirements (EARS)

- WHEN a user sends a message, THE SYSTEM SHALL modulate it into a GW-1 burst
  (preamble, sync, LEN, payload, CRC-16) and play it through the output
  device within 2 seconds of the send action.

- WHEN a burst is present in an input stream (mic or in-page séance loop),
  THE SYSTEM SHALL demodulate and emit only CRC-valid payloads.

- WHEN a frame fails its CRC-16 check, THE SYSTEM SHALL discard it silently
  and SHALL NOT render any text derived from it.

- WHEN the transmitting and receiving devices disagree on sample rate by up
  to 10% (48 kHz vs 44.1 kHz), THE SYSTEM SHALL recover the bit clock from
  the preamble's transition spacing and decode the frame.

- WHEN ambient noise reduces SNR to 10 dB or worse, THE SYSTEM SHALL still
  decode the frame, or discard it — it SHALL NOT output corrupted text.

- WHEN the same payload is received more than once (deliberate repetition or
  relay echo), THE SYSTEM SHALL deliver it once and count the echoes.

- WHEN no carrier is present, THE SYSTEM SHALL decode nothing (no
  hallucinations from silence).

- WHEN a payload exceeds 128 bytes, THE SYSTEM SHALL refuse to transmit and
  tell the user, instead of silently truncating.

- WHILE the app is open, THE SYSTEM SHALL expose a self-test that proves the
  encode→decode path end-to-end without requiring any audio hardware.
