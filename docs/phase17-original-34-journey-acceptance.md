# Phase 17 — Original 34-journey acceptance register

**Status:** IN PROGRESS / NOT CERTIFIED. This is the September 22 journey inventory, with evidence-level distinctions—not an assertion that 34 end-to-end journeys passed.

**Authoritative inventory:** [September 22 Stakeholder + Developer Handoff](https://docs.google.com/document/d/1uwYEkH9LEQ-RDBSHc4AtZtmF1IafHW4aWpa8vlOxU-g/edit). Phase 17 requires 11 Public (P), 16 Admin (A), 7 cross-system (X) journeys. See [GitHub Admin acceptance controller #6](https://github.com/shihab-tech04/Sobaike-Janao-Admin/issues/6).

## Exact current production baseline

- Public `main`: `97d232970e3db3c032e005e6ebedff968b372e69`, `https://shobaikejanao.com`.
- Admin `main`: `60a63a3b8ef9255c87116d14e955f7158eb0cc1b`, `https://admin.shobaikejanao.com`.
- Replacement SQL: `eztqgqgpluoqwmprgeas`, ACTIVE_HEALTHY on 2026-10-24; historical database is not changed.
- Verified off-GitHub full source/history backup exists in [Google Drive](https://drive.google.com/file/d/1aen5h5lfgNJlOdd8NgSMmT-tuLMniUvW/view); do not treat it as automatically refreshed for future merges.

## Status definitions

- **Full E2E:** requires real entry→action→response→next→recovery, with screenshot or job evidence on approved isolated data. None of the rows below is yet certified as full E2E.
- **Existing partial evidence:** indicates only the named substeps ran. Hosted anonymous or isolated loopback evidence never substitutes for hosted signed-in MFA/Admin publication acceptance.
- **No destructive tests:** never modify 195 original citizen reports, private attachments or existing published CMS entries; use isolated synthetic fixtures with rollback and explicit production transaction approval.

## 34 original journeys

| ID | Original journey | Existing partial evidence / missing scope | Full E2E |
|---|---|---|---|
| P01 | First visit, responsibility notice and location choice | Hosted Public browser substeps passed | NOT CERTIFIED |
| P02 | Browse home, categories, topics and published feeds | Hosted Public browser substeps passed | NOT CERTIFIED |
| P03 | Search reports, locations, people and organizations | Hosted search/UI smoke only | NOT CERTIFIED |
| P04 | Explore reports with filters and map view | Hosted route + isolated map tests only | NOT CERTIFIED |
| P05 | Read report detail, source context and next actions | Hosted published-detail browser smoke only | NOT CERTIFIED |
| P06 | Submit a standard citizen report | Isolated Edge + synthetic Auth/moderation only | NOT CERTIFIED |
| P07 | Sensitive harassment / rape reporting path | Isolated configuration/tests; full user path not certified | NOT CERTIFIED |
| P08 | Attach, upload and register evidence | Isolated private Storage / Edge testing only | NOT CERTIFIED |
| P09 | Share additional citizen information about a published report | Isolated response workflow only | NOT CERTIFIED |
| P10 | Submit a subject / organization response or correction request | Isolated response workflow only | NOT CERTIFIED |
| P11 | Language, theme, text size and Bangla phonetic preferences | Hosted language/theme substeps only | NOT CERTIFIED |
| A01 | Administrator login, MFA gate and permission routing | Isolated real AAL2 + hosted signed-out boundary only | NOT CERTIFIED |
| A02 | Dashboard triage and operational drill-down | Unauthenticated boundary + isolated UI only | NOT CERTIFIED |
| A03 | Complaint queue, filtering and detail inspection | Isolated moderation testing only | NOT CERTIFIED |
| A04 | Complaint publish, unpublish and reject lifecycle | Isolated AAL2 end-to-end test only | NOT CERTIFIED |
| A05 | Evidence and privacy-sensitive complaint inspection | Isolated permissions / privacy tests only | NOT CERTIFIED |
| A06 | News Intake — scan/manual source to reviewed sourced report | Isolated News Intake review-only tests only | NOT CERTIFIED |
| A07 | Response queue and moderation | Isolated AAL2 response lifecycle only | NOT CERTIFIED |
| A08 | Category and subcategory lifecycle | Isolated taxonomy/form integration only | NOT CERTIFIED |
| A09 | Dynamic reporting form/schema lifecycle | Isolated form-builder parity tests only | NOT CERTIFIED |
| A10 | Banner content lifecycle | Isolated 7-banner browser fixtures only | NOT CERTIFIED |
| A11 | Administrative map monitoring | Not verified as signed-in hosted journey | NOT CERTIFIED |
| A12 | Location activity monitoring | Not verified as signed-in hosted journey | NOT CERTIFIED |
| A13 | Notification center | Isolated UI tests; hosted signed-in not verified | NOT CERTIFIED |
| A14 | Administrator user lifecycle | Isolated RBAC tests; hosted signed-in not verified | NOT CERTIFIED |
| A15 | Role and permission lifecycle | Isolated AAL2 role revocation passed; hosted signed-in not verified | NOT CERTIFIED |
| A16 | Activity log and audit review | Isolated audit tests; hosted signed-in not verified | NOT CERTIFIED |
| X01 | Taxonomy and dynamic form propagation | Isolated SQL–Admin–Public form parity only | NOT CERTIFIED |
| X02 | Citizen complaint intake to Admin moderation queue | Isolated Edge–SQL + AAL2 pipeline only | NOT CERTIFIED |
| X03 | Admin publication to Public feed, search, explore and detail | Isolated AAL2 publish/withdraw with Public list parity only | NOT CERTIFIED |
| X04 | Trusted news source to public sourced report | Isolated controlled-source review-only testing | NOT CERTIFIED |
| X05 | Public response intake to moderated public response | Isolated AAL2 response testing only | NOT CERTIFIED |
| X06 | Popularity ranking with stable taxonomy fallback | Hosted read-only rank parity candidate; full journey not certified | NOT CERTIFIED |
| X07 | Banner publish to Public progressive runtime | Published banner read parity; hosted Admin write-path not verified | NOT CERTIFIED |

## Independently checked 2026-10-24 (read-only SQL)

- `complaints`: 195 total, 169 published; one active Super Admin and one verified TOTP factor. Counts alone do not establish a fresh authenticated session.
- `bangladesh_divisions`: 8, `bangladesh_districts`: 64, `bangladesh_upazilas`: 601. Orphan district/upazila references: 0/0.
- Seven active categories, seven published banner rows, 28 published form schema versions; public configuration is intentionally 27 active form scopes because one published version references an inactive subcategory. **Do not alter that inactive content without separate approval.**
- Scheduled News Intake setting remains `enabled=false`, `interval_hours=36`; the cron dispatcher existing does not imply automatic publication is enabled.
- Category popularity: seven ranks, one for each category. The hourly cron `refresh-public-category-popularity-snapshot` had 39 successful runs and zero failures. The snapshot refresh SQL intentionally returns without writing while a snapshot is younger than 72 hours. A ~38-hour snapshot age is expected, not a scheduler failure.
- The [Phase 17 X06 hosted rank parity candidate](https://github.com/shihab-tech04/Sobaike-janao-public) checks ranks 1–7, active-category identity and nonnegative metrics against live anonymous RPC output. This test only adds safety checks; it does not force-refresh popularity or modify SQL.

## Evidence references

- [Hosted Public non-destructive browser run 39891049524](https://github.com/shihab-tech04/Sobaike-janao-public/actions/runs/39891049524) — first visit, browse, search, detail, responsive and language/theme substeps.
- [Hosted Admin signed-out post-release 39915366616](https://github.com/shihab-tech04/Sobaike-Janao-Admin/actions/runs/39915366616) — 22/22 protected route guards at 390px and 1280px; no privileged RPC calls.
- [Isolated Public Edge→SQL→AAL2 moderation run 39890684232](https://github.com/shihab-tech04/Sobaike-janao-public/actions/runs/39890684232) — synthetic withdrawal, feed hiding and privacy.
- [Isolated Admin AAL2 authorization/revocation run 39899114060](https://github.com/shihab-tech04/Sobaike-Janao-Admin/actions/runs/39899114060) — role-scoped moderation and denial.

## Remaining hard gates before 34/34

1. Authorized interactive Admin browser session, real Super Admin MFA/AAL2 step-up, role negative paths and audit evidence. Do not request or store user passwords/TOTP codes.
2. Controlled synthetic report in actual hosted Public composer followed by Admin queue, protected AAL2 moderation, Public DOM/SQL visibility, withdrawal and cleanup. Do not touch historical citizen data.
3. Signed-in CMS banner/form draft→publish→withdraw, News Intake duplicate hold/retry/reviewed publication, and the rest of the original journey coverage on isolated fixtures.
4. Reconcile all 24 historical gaps and full 34-journey results individually. Full release (Phase 18) remains HOLD until these acceptance gates are met or explicitly and safely deferred.

**No deployment implied by this document.** A passing CI/test-only PR cannot be represented as completed authenticated hosted Admin acceptance.
