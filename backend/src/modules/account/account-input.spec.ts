import assert from 'node:assert/strict';
import { normalizeAccountInput } from './account-input';

const normalized = normalizeAccountInput({
  email: 'user@example.com',
  password: 'Secret123!',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  proxy: 'http://127.0.0.1:8080',
});

assert.equal(normalized.email, 'user@example.com');
assert.equal(normalized.proxy, 'http://127.0.0.1:8080');
assert.equal(normalized.accessToken, 'access-token');
assert.equal(normalized.refreshToken, 'refresh-token');
assert.equal(normalized.status, 'success');
assert.equal(normalized.profileId.startsWith('local-'), true);
