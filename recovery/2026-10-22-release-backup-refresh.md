# Sobaike Janao off-site backup refresh — 2026-10-22

This backup-only branch runs a fresh independent full-history, checksum and restore export for BOTH repositories before any production merge. The previous off-GitHub backup was verified but captured an older Admin release head. Preserve the latest recovery branch heads and all historical references; keep this branch unmerged.

Required expected pre-export refs (validate again from artifact manifest):
- Public recovery PR #14: `8612cda866e37b896a4927b56062ec0a9d592072`
- Admin recovery PR #4: `52043ae3ca759a0167bba5baebcd0060383a17e5`

No DNS, Supabase, production or main branch changes are authorized by this backup-only commit.
