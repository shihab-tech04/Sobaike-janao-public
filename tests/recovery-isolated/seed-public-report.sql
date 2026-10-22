-- Synthetic only: this subtype exists solely in a disposable local database.
-- It is deliberately not part of either repository's historical migrations.
-- The captured baseline intentionally excludes all runtime secret values.
-- Generate a fresh HMAC key inside the disposable database for the original
-- public rate-limiter's fail-closed requirement; never copy a hosted secret.
INSERT INTO private.security_runtime_secrets (key, secret)
VALUES ('public_abuse_hmac', extensions.gen_random_bytes(32));

-- Taxonomy is supplied by phase04-hosted-publication-fixture.sql; reports
-- below use a real published form ID but entirely synthetic report contents.
