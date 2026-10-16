import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [apiClient, visitorSession, gateway, publicEvidence, productionSmoke] = await Promise.all([
  readFile(new URL('../src/services/apiClient.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/visitorSessionService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/publicWriteGateway.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/publicEvidenceService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../.github/workflows/production-smoke.yml', import.meta.url), 'utf8'),
]);

test('complaints and responses use the current public-write gateway contract', () => {
  assert.match(apiClient, /action: 'complaint'/);
  assert.match(apiClient, /submissionRpc: 'submit_public_complaint_v2'/);
  assert.match(apiClient, /clientSubmissionId,/);
  assert.match(apiClient, /reporterContext,/);
  assert.match(apiClient, /action: 'response'/);
  assert.match(apiClient, /responseType: 'citizen_information'/);
  assert.match(apiClient, /responseType: 'subject_response'/);
  assert.match(apiClient, /visitorId: VisitorSessionService\.getVisitorId\(\)/);
  assert.match(apiClient, /sessionId: VisitorSessionService\.getSessionId\(\)/);
});

test('evidence goes through the server sanitizer and session writes stay coordinate-free', () => {
  assert.match(gateway, /'public-evidence-upload'/);
  assert.match(gateway, /body\.append\('file', file, file\.name\)/);
  assert.match(apiClient, /uploadPublicEvidence\(clientSubmissionId, file\)/);
  assert.match(visitorSession, /action: 'session'/);
  assert.match(visitorSession, /p_latitude: null/);
  assert.match(visitorSession, /p_longitude: null/);
  assert.match(visitorSession, /p_accuracy_meters: null/);
});

test('protected anonymous RPC and direct private-bucket upload paths are absent', () => {
  const protectedWrites = [
    'submit_public_response',
    'submit_public_complaint_v2',
    'register_public_complaint_evidence',
    'record_public_visit_session',
  ];

  for (const rpc of protectedWrites) {
    const directRpcCall = new RegExp(`\\.rpc\\s*\\(\\s*['\"]${rpc}['\"]`);
    assert.doesNotMatch(apiClient, directRpcCall, `apiClient must not call ${rpc} directly`);
    assert.doesNotMatch(visitorSession, directRpcCall, `visitorSession must not call ${rpc} directly`);
  }

  assert.doesNotMatch(apiClient, /supabase\s*\.\s*storage/, 'evidence uploads must use the server sanitizer');
});

test('production smoke probes only the current published-evidence helper names', () => {
  assert.match(productionSmoke, /can_upload_public_evidence/);
  assert.match(productionSmoke, /is_public_published_evidence/);
  assert.doesNotMatch(productionSmoke, /can_upload_public_complaint_evidence/);
  assert.doesNotMatch(productionSmoke, /is_published_complaint_evidence/);
});

test('published evidence lookups stay within the backend 100-report RPC limit', () => {
  assert.match(publicEvidence, /const RPC_REPORT_ID_BATCH_SIZE = 100/);
  assert.match(publicEvidence, /for \(let batchStart = 0; batchStart < cleanIds\.length; batchStart \+= RPC_REPORT_ID_BATCH_SIZE\)/);
  assert.match(publicEvidence, /p_report_ids: reportIdBatch/);
});
