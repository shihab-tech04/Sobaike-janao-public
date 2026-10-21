import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const morePage = readFileSync(new URL('../src/pages/MorePage.tsx', import.meta.url), 'utf8');
const sevenCategories = [
  ['হয়রানি ও নির্যাতন', 'Harassment & Abuse'],
  ['অবৈধ অটো চার্জিং', 'Illegal Auto Charging'],
  ['চাঁদাবাজি ও জোরপূর্বক আদায়', 'Extortion & Coercion'],
  ['ইউটিলিটি ও বিদ্যুৎ সমস্যা', 'Utility & Load Shedding'],
  ['জননিরাপত্তা', 'Public Safety'],
  ['সড়ক ও যাতায়াত সমস্যা', 'Road & Transport Issues'],
  ['অবৈধ দখল', 'Illegal Occupation'],
];

test('About presents all seven backend-backed reporting categories in both languages', () => {
  const about = morePage.split('{/* Active Categories */}')[1]?.split('{/* ========================================================= */}')[0];
  assert.ok(about, 'About category section must exist');
  for (const [bn, en] of sevenCategories) {
    assert.ok(about.includes(bn), 'Missing Bangla About category: ' + bn);
    assert.ok(about.includes(en), 'Missing English About category: ' + en);
  }
});

test('FAQ no longer claims only four reportable categories', () => {
  assert.ok(morePage.includes('৭টি সক্রিয় ক্যাটাগরিতে'));
  assert.ok(morePage.includes('7 active categories'));
  assert.ok(!morePage.includes('4 active categories'));
  assert.ok(!morePage.includes('৪টি ক্যাটাগরিতে'));
});
