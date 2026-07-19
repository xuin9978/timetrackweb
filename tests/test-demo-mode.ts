import assert from 'node:assert/strict';
import {
  DEMO_USER,
  DEMO_EVENTS,
  DEMO_TAGS,
  DEMO_DIARY_ENTRIES,
  getDemoStorageKey,
  isDemoUser,
} from '../utils/demoMode';

assert.equal(isDemoUser(DEMO_USER), true, 'DEMO_USER should be recognized as demo');
assert.equal(isDemoUser({ id: 'real-user-id' }), false, 'real users must not be treated as demo users');
assert.ok(DEMO_TAGS.length >= 4, 'demo mode should include enough tags to demonstrate filtering');
assert.ok(DEMO_EVENTS.length >= 5, 'demo mode should include enough events to demonstrate calendar views');
assert.ok(DEMO_DIARY_ENTRIES.length >= 2, 'demo mode should include diary context for the Agent demo');
assert.equal(getDemoStorageKey('events'), 'liquid_calendar_demo_events');
assert.notEqual(getDemoStorageKey('events'), 'events_cache_demo-user');

console.log('Demo mode checks passed');
