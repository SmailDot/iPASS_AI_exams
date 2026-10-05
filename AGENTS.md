# Agent collaboration rules

This repository contains a mobile-first, local-first iPAS subject-3 practice website. The earlier long-term design documents are not claims that every feature is implemented. Read README.md and docs/RELEASE_0.1.md for current scope.

1. Preserve Traditional Chinese terminology and explicit official-source versus original/engineering-supplement distinctions. Do not invent official source locations.
2. Do not commit personal answers, study reports, backups, credentials, private data or complete uploaded official PDFs.
3. A question has stable ID, revision, family, option IDs and a content hash. Score by option ID, never display letters.
4. Question variants must change relevant conditions or reasoning tasks, not just shuffle answers. The bank is finite; disclose shortages.
5. Required images are same-version local assets. Verify file bytes and browser decoding. Failed assets invalidate a question; never lower learning ability for a technical fault.
6. Code display, copy and reference tests use the same source. Run trusted repository code fixtures with pinned test dependencies; never execute imported code.
7. Preserve first attempts and snapshots. JSON imports require checksum/schema checks and explicit preview. Conflicting IDs are rejected, not silently overwritten.
8. Save failures must be visible. Keep recoverable in-memory work and prevent stale-tab overwrites. Never label an unsuccessful save as successful.
9. Keep domain rules independent of DOM/storage to support a future Android adapter. Current website is not an APK; no full offline promise without a tested offline implementation.
10. No invented pass probabilities or formal exam calibration. Separate new, repeated, assisted and invalid attempts.
11. Run npm run check, npm test, npm run test:code, npm run build and real browser tests. Record actual results and limitations. Never bypass managed-browser policies to test.
12. No deployment until required checks pass. Pages must actually be enabled and deployment successful before claiming a live website.
