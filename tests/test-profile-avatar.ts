import assert from 'node:assert/strict';
import { avatarForUserMetadata, isInlineAvatar } from '../utils/profileAvatar';

const inlineAvatar = 'data:image/png;base64,AAAA';
assert.equal(isInlineAvatar(inlineAvatar), true);
assert.equal(
  avatarForUserMetadata(inlineAvatar),
  null,
  'Inline image data must not be stored in auth user metadata',
);
assert.equal(
  avatarForUserMetadata('https://images.example.com/avatar.png'),
  'https://images.example.com/avatar.png',
  'Normal remote avatar URLs may remain in user metadata',
);

console.log('Profile avatar tests passed');
