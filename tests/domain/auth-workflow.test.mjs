import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import { createMockAuthAdapter, AUTH_STORAGE_KEYS, DEMO_CREDENTIALS, DEMO_USER } from '../../src/auth/mock-adapter.ts';
import { createApiAuthAdapter } from '../../src/auth/api-adapter.ts';
import { AuthError, getAuthErrorMessage } from '../../src/auth/types.ts';
import { safeReturnTo, validateSignIn, validateSignUp } from '../../src/auth/validation.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const registration = { name: 'Alex Morgan', email: 'alex@example.com', password: 'Testing123!', rememberMe: false };
const make = (local = new MemoryStorage(), tab = new MemoryStorage()) => ({
  local, tab,
  adapter: createMockAuthAdapter({ localStorage: local, sessionStorage: tab, crypto: webcrypto }),
});
const isCode = code => error => error instanceof AuthError && error.code === code;

test('registration normalizes identity, hashes passwords, and survives adapter reloads', async () => {
  const { adapter, local, tab } = make();
  assert.equal(await adapter.getSession(), null);
  const session = await adapter.signUp({ ...registration, name: '  Alex Morgan  ', email: '  ALEX@example.com  ' });
  assert.equal(session.user.name, registration.name);
  assert.equal(session.user.email, registration.email);
  assert.ok(session.user.id);
  const saved = local.getItem(AUTH_STORAGE_KEYS.accounts);
  assert.ok(!saved.includes(registration.password), 'raw password is never persisted');
  const account = JSON.parse(saved).accounts[0];
  assert.match(account.salt, /^[a-f0-9]{32}$/);
  assert.match(account.passwordHash, /^[a-f0-9]{64}$/);
  const reloaded = make(local, tab).adapter;
  assert.deepEqual(await reloaded.getSession(), session);
  await reloaded.signOut();
  assert.equal(await reloaded.getSession(), null);
  assert.deepEqual(await reloaded.signIn({ email: 'ALEX@example.com', password: registration.password, rememberMe: false }), session);
});

test('separate accounts receive unique salts even when they use the same password', async () => {
  const { adapter, local } = make();
  await adapter.signUp(registration);
  await adapter.signUp({ ...registration, name: 'Jamie Rivera', email: 'jamie@example.com' });
  const [first, second] = JSON.parse(local.getItem(AUTH_STORAGE_KEYS.accounts)).accounts;
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.passwordHash, second.passwordHash);
});

test('incorrect credentials and duplicate emails fail without replacing the current session', async () => {
  const { adapter } = make();
  const original = await adapter.signUp(registration);
  await assert.rejects(adapter.signIn({ email: registration.email, password: 'Wrong123!', rememberMe: false }), isCode('invalid-credentials'));
  await assert.rejects(adapter.signIn({ email: 'missing@example.com', password: registration.password, rememberMe: false }), isCode('invalid-credentials'));
  await assert.rejects(adapter.signUp({ ...registration, email: ' ALEX@example.com ' }), isCode('email-taken'));
  await assert.rejects(adapter.signUp({ ...registration, email: DEMO_CREDENTIALS.email }), isCode('email-taken'));
  assert.deepEqual(await adapter.getSession(), original);
});

test('remember me uses local storage; tab sessions do not restore in a new tab', async () => {
  const { adapter, local, tab } = make();
  const session = await adapter.signUp(registration);
  assert.equal(local.getItem(AUTH_STORAGE_KEYS.rememberedSession), null);
  assert.ok(tab.getItem(AUTH_STORAGE_KEYS.session));
  assert.equal(await make(local).adapter.getSession(), null);
  await adapter.signIn({ ...registration, rememberMe: true });
  assert.equal(tab.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.deepEqual(await make(local).adapter.getSession(), session);
  await adapter.signIn({ ...registration, rememberMe: false });
  assert.equal(local.getItem(AUTH_STORAGE_KEYS.rememberedSession), null);
  assert.equal(await make(local).adapter.getSession(), null);
  await adapter.signOut();
  assert.equal(tab.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.equal(local.getItem(AUTH_STORAGE_KEYS.rememberedSession), null);
  assert.ok(local.getItem(AUTH_STORAGE_KEYS.accounts), 'logout preserves registrations');
});

test('demo credentials establish the stable user with tab or remembered sessions', async () => {
  const { adapter, local, tab } = make();
  assert.deepEqual(await adapter.signIn({ ...DEMO_CREDENTIALS, rememberMe: false }), { user: DEMO_USER });
  assert.deepEqual(await make(local, tab).adapter.getSession(), { user: DEMO_USER });
  await adapter.signOut();
  assert.deepEqual(await adapter.signIn({ ...DEMO_CREDENTIALS, rememberMe: true }), { user: DEMO_USER });
  assert.deepEqual(await make(local).adapter.getSession(), { user: DEMO_USER });
  assert.equal(local.getItem(AUTH_STORAGE_KEYS.accounts), null, 'demo does not create a local registration');
});

test('malformed or unknown sessions log out without trusting their embedded identity', async () => {
  const { adapter, local, tab } = make();
  for (const invalid of ['broken json', JSON.stringify({ version: 1, userId: 'unknown', user: DEMO_USER }), JSON.stringify({ version: 2, userId: DEMO_USER.id })]) {
    local.setItem(AUTH_STORAGE_KEYS.rememberedSession, invalid);
    tab.setItem(AUTH_STORAGE_KEYS.session, invalid);
    assert.equal(await adapter.getSession(), null);
    assert.equal(local.getItem(AUTH_STORAGE_KEYS.rememberedSession), null);
    assert.equal(tab.getItem(AUTH_STORAGE_KEYS.session), null);
  }
});

test('corrupt account storage reports a controlled error and retains data for diagnosis', async () => {
  const { adapter, local, tab } = make();
  local.setItem(AUTH_STORAGE_KEYS.accounts, 'broken json');
  tab.setItem(AUTH_STORAGE_KEYS.session, JSON.stringify({ version: 1, userId: 'registered-user' }));
  await assert.rejects(adapter.getSession(), isCode('corrupt-storage'));
  await assert.rejects(adapter.signUp(registration), isCode('corrupt-storage'));
  await assert.rejects(adapter.signIn({ ...registration, rememberMe: false }), isCode('corrupt-storage'));
  assert.equal(local.getItem(AUTH_STORAGE_KEYS.accounts), 'broken json');
});

test('unavailable browser storage never reports a successful login or registration', async () => {
  const readBlocked = { getItem() { throw new Error('Blocked'); }, setItem() {}, removeItem() {} };
  await assert.rejects(make(readBlocked).adapter.getSession(), isCode('storage-unavailable'));
  const writeBlocked = { getItem() { return null; }, setItem() { throw new Error('Quota'); }, removeItem() {} };
  const blocked = make(writeBlocked).adapter;
  await assert.rejects(blocked.signIn({ ...DEMO_CREDENTIALS, rememberMe: true }), isCode('storage-unavailable'));
  await assert.rejects(blocked.signUp(registration), isCode('storage-unavailable'));
  const { local } = make();
  const tabBlocked = { getItem() { return null; }, setItem() { throw new Error('Blocked'); }, removeItem() {} };
  await assert.rejects(make(local, tabBlocked).adapter.signUp(registration), isCode('storage-unavailable'));
  assert.equal(local.getItem(AUTH_STORAGE_KEYS.accounts), null, 'failed signup session rolls back registration');
});

test('logout attempts both stores and reports failure if either cannot clear', async () => {
  const tab = new MemoryStorage();
  tab.setItem(AUTH_STORAGE_KEYS.session, JSON.stringify({ version: 1, userId: DEMO_USER.id }));
  const blocked = { getItem() { return null; }, setItem() {}, removeItem() { throw new Error('Blocked'); } };
  await assert.rejects(make(blocked, tab).adapter.signOut(), isCode('storage-unavailable'));
  assert.equal(tab.getItem(AUTH_STORAGE_KEYS.session), null);
});

test('validation rejects incomplete signup fields and preserves login compatibility', () => {
  assert.deepEqual(validateSignUp(registration), {});
  assert.deepEqual(validateSignIn({ email: 'alex@example.com', password: 'a', rememberMe: false }), {});
  const errors = validateSignUp({ name: ' ', email: 'bad', password: 'short', rememberMe: false });
  assert.ok(errors.name && errors.email && errors.password);
  assert.ok(validateSignUp({ ...registration, password: 'letters-only' }).password);
  assert.ok(validateSignUp({ ...registration, password: '123456789' }).password);
  assert.equal(getAuthErrorMessage(new Error('internal detail')), 'Something went wrong. Please try again.');
});

test('return destinations retain workspace filters while rejecting unsafe or unknown URLs', () => {
  for (const route of ['/', '/transactions', '/review', '/reports', '/demo']) assert.equal(safeReturnTo(route), route);
  assert.equal(safeReturnTo('/transactions?type=expense#record-1'), '/transactions?type=expense#record-1');
  for (const unsafe of [null, '', 'https://evil.test/', '//evil.test/', '/\\evil.test/', '/login', '/signup', '/unknown', '/%2f%2fevil.test', '/review\n', '/review%00', 'javascript:alert(1)']) {
    assert.equal(safeReturnTo(unsafe), '/', `rejects ${unsafe}`);
  }
});

test('API adapter uses cookie credentials, normalized requests, and the documented JSON shape', async () => {
  const requests = [];
  const session = { user: { id: 'server-user', name: registration.name, email: registration.email } };
  const adapter = createApiAuthAdapter(async (url, options) => {
    requests.push({ url, options });
    return url.endsWith('/logout') ? new Response(null, { status: 204 }) : Response.json(session);
  });
  assert.deepEqual(await adapter.getSession(), session);
  assert.deepEqual(await adapter.signIn({ ...registration, email: ' ALEX@example.com ', rememberMe: true }), session);
  assert.deepEqual(await adapter.signUp({ ...registration, name: ' Alex Morgan ', email: ' ALEX@example.com ' }), session);
  await adapter.signOut();
  assert.deepEqual(requests.map(request => request.url), ['/api/auth/session', '/api/auth/login', '/api/auth/signup', '/api/auth/logout']);
  for (const { options } of requests) {
    assert.equal(options.credentials, 'include');
    assert.equal(options.cache, 'no-store');
  }
  assert.equal(requests[0].options.method, 'GET');
  assert.deepEqual(JSON.parse(requests[1].options.body), { ...registration, email: registration.email, rememberMe: true });
  assert.deepEqual(JSON.parse(requests[2].options.body), registration);
});

test('API adapter recognizes signed-out sessions and handles network, credential, and malformed response errors', async () => {
  for (const response of [new Response(null, { status: 401 }), Response.json(null)]) {
    assert.equal(await createApiAuthAdapter(async () => response).getSession(), null);
  }
  const failure = createApiAuthAdapter(async () => { throw new Error('Connection detail'); });
  await assert.rejects(failure.signIn({ ...registration, rememberMe: false }), isCode('network'));
  for (const [status, code] of [[401, 'invalid-credentials'], [409, 'email-taken'], [429, 'unavailable'], [500, 'unavailable']]) {
    await assert.rejects(createApiAuthAdapter(async () => new Response(null, { status })).signIn({ ...registration, rememberMe: false }), isCode(code));
  }
  for (const value of [{}, { user: { id: 'x' } }, { user: { id: 12, name: 'Alex', email: 'alex@example.com' } }]) {
    await assert.rejects(createApiAuthAdapter(async () => Response.json(value)).getSession(), isCode('invalid-response'));
  }
  await assert.rejects(createApiAuthAdapter(async () => new Response('bad json')).getSession(), isCode('invalid-response'));
});
