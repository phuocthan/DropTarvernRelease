# Player API discussion kit — 17 November 2026

**Proposal for A + Than review. Synthetic examples only; not an agreed API, a playable game, a live wallet, or delivered production math.** Than owns the agreed TypeScript/PixiJS HTML5 client and complete source delivery. Exact versions, build tools and the reusable internal structure are proposed within that agreed stack. This kit does not ask A/B to build another client.

Read [API semantics and mapping](API.md), then [case coverage and assumptions](CASES.md). The JSON examples are complete *offline test scripts*: each script contains successive public response snapshots, expected totals and a recovery example. The entire script must never be exposed as a real player's round response. The server-side projection prototype emits only the approved prefix for that response.

## Run without installing dependencies

Python 3.12+ standard library only. From this directory:

```sh
python3 -B preview.py --profile synthetic-contract --port 49331
```

Open `http://127.0.0.1:49331/catalog.json`; follow a case file such as `/cases/tavern-chests.json`. Ctrl+C stops this preview. It binds only to loopback, verifies example hashes and serves only allowlisted JSON. It does not accept spin requests, issue credentials, store real rounds or make a network wallet call. An external API is a separate integration milestone.

Your renderer can feed `snapshots` in order through its data adapter. Check the unchanged request/round identity, increasing revision, visible event prefix and expected final money. Replaying/skip/turbo should preserve that input. The local preview is for inspecting examples, not a substitute for persistent RGS recovery testing.

The supplied 5×5 browser mock uses a separate legacy synthetic vocabulary. Map the agreed public API to your client adapter; no backend source or wallet implementation is needed in this repository.

## Proposed discussion points for joint review

1. Map your existing session/spin/error/recovery fields to [API.md](API.md); keep compatible fields and list actual conflicts.
2. Confirm row-major coordinates, line/symbol IDs, amount strings, event types and which UI actions need a persisted disclosure advance. Field names remain negotiable; server money/identity authority is required.
3. Agree prefix/reveal behavior, including skip and reload, without new outcome selection or wallet writes. The prototype cursor is trusted server input; it is not an authenticated HTTP endpoint yet.
4. Keep the existing sample/API timing coordination with the coordinator; this seed introduces no new deadline or request.

No confidential generator, weights, real account data, keys, wallet code or third-party art is included. The package contains only hand-authored examples, this documentation and the read-only preview. Final rules, prices, RTP, currencies, disclosure policy and final model-to-client mapping are still pending agreement.
