# Sobaike Janao off-site backup refresh — 2026-10-22

This backup-only branch requests a fresh independent full-history, checksum and restore export for BOTH repositories. Preserve all Git refs and the latest release source; keep this branch unmerged.

Required source identities to confirm in the refreshed artifact manifest:
- Public production main: `d9da9630a4a000ba8469cd336eb5077ac4edc931`
- Admin production main: `152b572051cc365fa61e2d8ddf372e50d8d25322`
- Admin PR #4 candidate: `d8c39c3b81e250efd7616ed7eee4be0fe3ceb1a6`

The Public production application is released from main. Admin PR #4 remains unmerged pending hosted Storage permission hardening. No DNS, Supabase, production or main branch changes are authorized by this backup-only commit.
