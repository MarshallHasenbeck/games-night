# Online play plan (draft, 2026-11-03)

Goal: each person plays on their own device, same game, with hidden hands staying hidden. Palace first.

## Option A: WebRTC (direct device-to-device)
- Devices still need a "matchmaker" to find each other (signaling). That means a small server anyway.
- About 1 in 6 connections fail behind home/phone networks unless a relay (TURN server) is added, which costs money.
- More moving parts to debug (reconnects, backgrounded phones).

## Option B: Supabase Realtime (recommended)
- Not WebRTC. Devices talk through Supabase's message channel (WebSockets). Works on every network, no relay needed.
- Free tier covers family game nights. Needs a NEW Supabase project for Game Night (don't mix with GetToIt).
- Same user experience: make a room, share a 4-letter code, friends join.

## How a game works online (either option)
1. One device is the **host** and holds the real game state (the engine in `src/lib/palace.ts` already is a pure state machine).
2. Other devices send their moves ("play card 12") to the host. Host checks the move, applies it, and sends each player ONLY what they may see (own hand, everyone's face-up cards, card counts).
3. Existing animations replay from the state changes, so little UI rework.

Caveat: the host's device technically holds all cards. Fine for friends/family; a stricter server-side referee is a bigger build.

## Build steps
1. Create Game Night Supabase project (staging habit: no real data, nothing sensitive stored).
2. Room screen: create/join by code, player names, seats.
3. Network layer: host/guest message passing, reconnect, "waiting for player" states. No accounts needed.
4. Palace: per-player view of state, remote turn handling, replace the pass-device screens.
5. Test with two real phones (and a dropped connection).
6. Roll to other games one at a time (Play Nine, Yahtzee, Mancala, Chess are easy; Battleship needs hidden boards, same method).

## Decisions needed
- OK to use Supabase Realtime instead of true WebRTC?
- Player names only, or accounts? (Recommend names only.)
- Palace first, then which game?
