import { Tag } from '../types';
import { createTag } from './tagService';

export const syncTags = async (userId: string, localTags: Tag[], cloudTags: Tag[]): Promise<Tag[]> => {
  const cloudIds = new Set(cloudTags.map(t => t.id));
  const toUpload = localTags.filter(t => !cloudIds.has(t.id));

  for (const tag of toUpload) {
    await createTag(userId, tag);
  }

  const mergedMap: Record<string, Tag> = {};
  [...cloudTags, ...localTags].forEach(t => { mergedMap[t.id] = t; });
  return Object.values(mergedMap);
};
