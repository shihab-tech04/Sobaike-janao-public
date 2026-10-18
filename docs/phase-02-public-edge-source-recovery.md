# Phase 02 — Public Edge contracts (recovered source checkpoint)

Read-only source recovery: 18 October 2026, from the active `sobaike-production`
Supabase project (`ahiaymyqfmyyrjkwgvhi`). These files are **not** a production
deployment, a historical migration, or permission to alter the hosted service.

| Local recovered file | Deployed function version | SHA-256 of recovered file |
| --- | --- | --- |
| `supabase/functions/public-write-gateway/index.ts` | 6 | `f374c576018f2e622189de0e8185f0ded122a4a1a916650ba17a2ecd9a7fdd2a` |
| `supabase/functions/public-evidence-upload/index.ts` | 1 | `0f4f76d5a4e66fbadefc1b1da7f28a3ac3561b12fde2718edbcf65484a5a73b8` |
| `supabase/functions/_shared/webp-sanitizer.js` | evidence-upload v1 dependency | `d34159a25f70998e34284b3396bf7cb4b90e1d3a64d00484f96b1f4e5b7221df` |

The recovered `public-write-gateway` accepts actions `complaint`, `response`,
`engagement`, `session`, and `evidence`; calls the privileged RPCs server-side;
and requires a source fingerprint and rate-limit check. It must never be replaced
by anonymous direct grants for `submit_public_complaint_v2`,
`submit_public_response_v2`, or evidence registration. The evidence upload
function accepts multipart uploads, validates WebP container/chunks and dimensions,
strips metadata, uses the private bucket, and registers sanitized evidence.

## Verified here

- `tests/recovered-edge-gateway.test.mjs` executes the recovered gateway handler
  with an in-memory Supabase service stub. It verifies origin preflight,
  missing-IP denial, action/route denial, exact complaint/response/session RPC
  routing, and server-rate-limiter call ordering.
- The same test executes the recovered sanitizer against synthetic RIFF/WebP
  structures, checks EXIF/XMP removal and rejects invalid/animated containers.
- Public test suite, TypeScript check, and Vite build run without UI edits.

## Still unverified / gated

- This suite mocks the service client. It is **not** a real local SQL + Edge
  Function HTTP acceptance test, and it does not certify P06/P08/P09/P10 or X02/X05.
- The deployed source allows the canonical site and the **legacy** Pages origin,
  but does not allow the newer `https://shihab-tech04.github.io` preview origin.
  Confirm browser-origin requests in disposable staging before authorizing a
  narrowly scoped origin change. Never silently widen the production allowlist.
- Database-backed rate limiting, actual WebP decoding, Auth boundaries, storage
  reads/denials, report insertion, evidence registration, and duplicate retries
  need a synthetic end-to-end runner. Do not use real reporter data.
- The separate Admin repository has a verified local-only SQL baseline replay;
  that is the fixture for subsequent Public↔SQL↔Admin staging, not a replacement
  for the 183 unavailable historical migration files.

The accepted 24-gap register and all 34 journey gates remain open until their
own evidence-backed integration and browser tests pass. No production Supabase
write, frontend UI change, or production deployment is authorized by this file.
