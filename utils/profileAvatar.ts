export const isInlineAvatar = (value: unknown): value is string => (
  typeof value === 'string' && /^data:image\//i.test(value)
);

export const avatarForUserMetadata = (avatarUrl?: string | null) => (
  isInlineAvatar(avatarUrl) ? null : avatarUrl ?? null
);
