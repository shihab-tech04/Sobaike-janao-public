import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/404.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Pages fallback must contain a redirect script');

function redirectFor(input) {
  const location = new URL(input);
  let redirectedTo;
  runInNewContext(script, {
    window: {
      location: {
        hostname: location.hostname,
        pathname: location.pathname,
        origin: location.origin,
        search: location.search,
        replace: (next) => { redirectedTo = next; },
      },
    },
  });
  return redirectedTo;
}

test('Pages project path redirects to the real repository project prefix', () => {
  assert.equal(redirectFor('https://shihab-tech04.github.io/Sobaike-janao-public/harassment?lang=bn'), 'https://shihab-tech04.github.io/Sobaike-janao-public/#/harassment?lang=bn');
});

test('Canonical Public domain deep links retain the domain root', () => {
  assert.equal(redirectFor('https://shobaikejanao.com/explore/dhaka?sort=recent'), 'https://shobaikejanao.com/#/explore/dhaka?sort=recent');
});

test('www Public domain deep links retain the domain root', () => {
  assert.equal(redirectFor('https://www.shobaikejanao.com/report'), 'https://www.shobaikejanao.com/#/report');
});
