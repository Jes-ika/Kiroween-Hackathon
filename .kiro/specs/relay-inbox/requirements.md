# Spec: Relay Inbox (every device is a haunted post office)

## Purpose

Turn every Ghostwire device into a store-and-forward relay so messages can
hop through neighbors toward recipients out of earshot — the BBS mailbox
concept reborn without any server.

## Requirements (EARS)

- WHEN a message addressed to THIS device (or "ALL") arrives, THE SYSTEM SHALL
  display it in the séance log attributed to its original sender.

- WHEN a message addressed to another spirit arrives and its TTL is above 0,
  THE SYSTEM SHALL rebroadcast it exactly once with TTL decremented, after a
  randomized 0.4–1.6 s backoff (collision avoidance).

- WHEN a message addressed to another spirit arrives with TTL 0, THE SYSTEM
  SHALL NOT rebroadcast it and SHALL note that it faded here.

- WHEN a byte-identical payload arrives again (relay echo, deliberate ×3
  SOS), THE SYSTEM SHALL ignore it as an echo and increment the echo count.

- WHILE the app runs, THE SYSTEM SHALL show a running tally of messages sent,
  heard, echoes ignored, and whispers carried for others.

- WHEN an SOS preset is used, THE SYSTEM SHALL transmit it three times in
  one burst sequence for redundancy.
