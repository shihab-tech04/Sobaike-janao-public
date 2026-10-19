import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { sanitizeEvidenceWebP } from '../supabase/functions/_shared/webp-sanitizer.js';

const GATEWAY_SOURCE = new URL('../supabase/functions/public-write-gateway/index.ts', import.meta.url);

async function makeGateway(onRpc) {
  const source = await readFile(GATEWAY_SOURCE, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'public-write-gateway/index.ts',
  }).outputText;

  let handler;
  const calls = [];
  const service = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'service_assert_public_write_rate') {
        return { data: { allowed: true }, error: null };
      }
      return onRpc?.(name, args) ?? { data: { accepted: true }, error: null };
    },
  };
  const context = {
    require: (specifier) => {
      if (specifier.startsWith('jsr:@supabase/functions-js/')) return {};
      if (specifier === 'npm:@supabase/supabase-js@2.112.4') {
        return { createClient: () => service };
      }
      throw new Error(`Unexpected runtime import: ${specifier}`);
    },
    exports: {},
    Deno: {
      env: { get: (name) => ({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'local-test-only-key' })[name] },
      serve: (fn) => { handler = fn; },
    },
    Request,
    Response,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    crypto: webcrypto,
    console: { error() {}, warn() {} },
  };

  runInNewContext(transpiled, context, { filename: 'public-write-gateway/index.ts' });
  assert.equal(typeof handler, 'function', 'the recovered Edge entrypoint must register a handler');
  const send = async (body, headers = {}) => {
    const req = new Request('http://127.0.0.1:54321/functions/v1/public-write-gateway', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173', 'cf-connecting-ip': '192.0.2.44', ...headers },
      body: JSON.stringify(body),
    });
    const res = await handler(req);
    return { status: res.status, headers: res.headers, body: await res.json() };
  };
  return { handler, send, calls };
}

test('the recovered gateway validates origin and source identity before rate-limited writes', async () => {
  const { handler, send, calls } = await makeGateway();

  const denied = await handler(new Request('http://localhost/functions/v1/public-write-gateway', {
    method: 'OPTIONS', headers: { origin: 'https://unapproved.example' },
  }));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);

  const accepted = await handler(new Request('http://localhost/functions/v1/public-write-gateway', {
    method: 'OPTIONS', headers: { origin: 'https://shobaikejanao.com' },
  }));
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get('access-control-allow-origin'), 'https://shobaikejanao.com');

  const recovery = await handler(new Request('http://localhost/functions/v1/public-write-gateway', {
    method: 'OPTIONS', headers: { origin: 'https://shihab-tech04.github.io' },
  }));
  assert.equal(recovery.status, 200);
  assert.equal(recovery.headers.get('access-control-allow-origin'), 'https://shihab-tech04.github.io');

  const withoutIp = await send({ action: 'session', payload: {} }, { 'cf-connecting-ip': '' });
  assert.equal(withoutIp.status, 503);
  assert.equal(withoutIp.body.code, 'SOURCE_UNAVAILABLE');
  assert.equal(calls.length, 0);

  const invalid = await send({ action: 'unknown' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, 'INVALID_ACTION');
  assert.equal(calls.length, 0);
});

test('Public recovery origin is allowed only on the controlled Public Edge functions', async () => {
  for (const slug of ['public-write-gateway', 'public-evidence-upload', 'public-ip-location']) {
    const source = await readFile(new URL(`../supabase/functions/${slug}/index.ts`, import.meta.url), 'utf8');
    assert.match(source, /"https:\/\/shihab-tech04\.github\.io"/);
    assert.doesNotMatch(source, /"Access-Control-Allow-Origin"\s*:\s*"\*"/);
  }
});

test('the recovered complaint action uses the protected RPC and exact submission arguments', async () => {
  const { send, calls } = await makeGateway();
  const payload = { subcategory_id: 'synthetic-category' };
  const reporterContext = { latitude: 23.8, longitude: 90.4, accuracy_meters: 20 };
  const result = await send({
    action: 'complaint', submissionRpc: 'submit_public_complaint_v2',
    payload, clientSubmissionId: 'synthetic-id-001', reporterContext,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(calls.map((x) => x.name), ['service_assert_public_write_rate', 'submit_public_complaint_v2']);
  assert.equal(calls[0].args.p_action, 'complaint');
  assert.match(calls[0].args.p_source_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(calls[1].args.p_client_submission_id, 'synthetic-id-001');
  assert.equal(calls[1].args.p_payload.subcategory_id, payload.subcategory_id);
  assert.equal(calls[1].args.p_reporter_context.latitude, reporterContext.latitude);
  assert.equal(calls[1].args.p_reporter_context.longitude, reporterContext.longitude);
  assert.equal(calls[1].args.p_reporter_context.accuracy_meters, reporterContext.accuracy_meters);

  const wrong = await send({ action: 'complaint', submissionRpc: 'admin_publish_complaint', payload, clientSubmissionId: 'synthetic-id-002', reporterContext });
  assert.equal(wrong.body.code, 'INVALID_SUBMISSION_ROUTE');
  assert.equal(calls.filter((call) => call.name === 'admin_publish_complaint').length, 0);
});

test('the recovered response/session actions retain the server RPC contract and fail closed on errors', async () => {
  const { send, calls } = await makeGateway((name) => name === 'submit_public_response_v2'
    ? { data: null, error: { code: 'REPORT_NOT_FOUND', message: 'REPORT_NOT_FOUND' } }
    : { data: { accepted: true }, error: null });

  const response = await send({
    action: 'response', reportId: 'synthetic-report', responseType: 'citizen_information',
    payload: { description: 'Synthetic response' }, visitorId: 'visitor-1', sessionId: 'session-1',
  });
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'REPORT_NOT_FOUND');
  assert.equal(calls[1].name, 'submit_public_response_v2');
  assert.equal(calls[1].args.p_report_id, 'synthetic-report');
  assert.equal(calls[1].args.p_response_type, 'citizen_information');

  const session = await send({ action: 'session', payload: { p_visitor_id: 'visitor-1', p_latitude: null, p_longitude: null } });
  assert.equal(session.body.success, true);
  assert.equal(calls.at(-1).name, 'record_public_visit_session');
  assert.equal(calls.at(-1).args.p_latitude, null);
  assert.equal(calls.at(-1).args.p_longitude, null);
});

function chunk(type, bytes) {
  const buffer = Buffer.alloc(8 + bytes.length + (bytes.length % 2));
  buffer.write(type, 0, 4, 'ascii');
  buffer.writeUInt32LE(bytes.length, 4);
  Buffer.from(bytes).copy(buffer, 8);
  return buffer;
}

function syntheticWebP(extraChunks = []) {
  // VP8L header has 1 × 1 dimensions. This tests RIFF structure/sanitization,
  // not full image decoding, which requires the actual runtime image library.
  const image = chunk('VP8L', Uint8Array.from([0x2f, 0, 0, 0, 0]));
  const body = Buffer.concat([Buffer.from('WEBP'), ...extraChunks, image]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

test('the recovered WebP sanitizer strips EXIF/GPS/XMP/ICC and rejects hostile containers', () => {
  const dirty = syntheticWebP([
    chunk('EXIF', Buffer.from('GPSLatitude:23.76, GPSLongitude:90.39')),
    chunk('XMP ', Buffer.from('untrusted-image-metadata')),
    chunk('ICCP', Buffer.from('color-profile-private-data')),
    chunk('BAD!', Buffer.from('unknown-metadata-chunk')),
  ]);
  const sanitized = sanitizeEvidenceWebP(dirty);
  assert.deepEqual(sanitized.removedChunks, ['EXIF', 'XMP', 'ICCP', 'BAD!']);
  assert.equal(sanitized.width, 1);
  assert.equal(sanitized.height, 1);
  assert.equal(Buffer.from(sanitized.bytes).includes(Buffer.from('GPSLatitude')), false);
  assert.equal(Buffer.from(sanitized.bytes).includes(Buffer.from('untrusted-image-metadata')), false);
  assert.equal(Buffer.from(sanitized.bytes).includes(Buffer.from('color-profile-private-data')), false);
  assert.equal(Buffer.from(sanitized.bytes).includes(Buffer.from('unknown-metadata-chunk')), false);
  assert.equal(sanitized.bytes.length < dirty.length, true);

  assert.throws(() => sanitizeEvidenceWebP(Buffer.from('not-a-webp')), /INVALID_WEBP_CONTAINER/);
  assert.throws(() => sanitizeEvidenceWebP(syntheticWebP([chunk('ANIM', Buffer.alloc(6))])), /ANIMATED_WEBP_NOT_ALLOWED/);
  assert.throws(() => sanitizeEvidenceWebP(syntheticWebP([chunk('ANMF', Buffer.alloc(6))])), /ANIMATED_WEBP_NOT_ALLOWED/);
  assert.throws(() => sanitizeEvidenceWebP(syntheticWebP([chunk('VP8L', Uint8Array.of(0x2f,0,0,0,0))])), /MULTIPLE_WEBP_BITSTREAMS_NOT_ALLOWED/);
  assert.throws(() => sanitizeEvidenceWebP(syntheticWebP(), { maxDimension: 0.5 }), /WEBP_DIMENSIONS_OUT_OF_RANGE/);
  const invalidLength = Buffer.from(syntheticWebP());
  invalidLength.writeUInt32LE(0, 4);
  assert.throws(() => sanitizeEvidenceWebP(invalidLength), /INVALID_WEBP_RIFF_SIZE/);
});
