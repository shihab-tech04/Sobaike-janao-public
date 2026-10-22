import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

test('custom Vite publisher never succeeds merely because the legacy Pages run is temporarily absent', () => {
  assert.match(workflow, /for attempt in \{1\.\.120\}; do/);
  assert.ok(workflow.includes('if [ "$status" = "completed" ]; then'),
    'publisher must explicitly report completed');
  assert.doesNotMatch(workflow, /if \[ "\$status" = "none" \].*exit 0/s,
    'Never publish while competing legacy Pages job may still be queued');
  assert.ok(workflow.includes('Legacy Pages publisher did not finish in time.'));
  assert.match(workflow, /exit 1\s+?- name: Deploy to GitHub Pages/s,
    'Bounded waiting must fail closed, not publish unexpectedly');
});
