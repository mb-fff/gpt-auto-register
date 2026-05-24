import assert from 'node:assert/strict';
import { normalizeRetryAttempts } from './retry-attempts';

assert.equal(normalizeRetryAttempts(undefined), 3);
assert.equal(normalizeRetryAttempts(5), 5);
assert.equal(normalizeRetryAttempts('4'), 4);
assert.equal(normalizeRetryAttempts(0), 1);
assert.equal(normalizeRetryAttempts(99), 10);
