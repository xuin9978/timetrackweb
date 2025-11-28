## 症结
- .ics 导入可能在 `currentUser` 尚未初始化时发生，事件被写入 `calendar_events_guest`。
- 登录恢复只读取 `calendar_events_{userId}`，未合并 `guest`，重登后看不到。

## 改动点（仅前端）
1. 在 `App.tsx` 登录后的数据加载 effect（约 301-321 行）：
- 读取两套本地事件：`userKey = calendar_events_{userId}` 与 `guestKey = calendar_events_guest`。
- 将两者 `date` 标准化为 `Date`。
- 以现有 `isDup` 去重，计算相对云端 `fetchedEvents` 的 `missing`。
- 尝试云端补齐：`createEvents(userId, missing)`，失败则继续本地展示。
- 合并最终事件：`final = fetchedEvents + created + remainingMissing`。
- `setEvents(final)`、以 `final` 的 `category` 补全 `visibleTags`。
- 将 `final` 写回 `userKey` 并 `localStorage.removeItem(guestKey)` 完成迁移。

## 验证
- 登录→导入 .ics→退出→重登，导入事件仍显示；在云端可用时，会自动补齐并在 Supabase 后台可见。

## 影响范围
- 仅更新登录合并逻辑，保持现有 CRUD 与导入 UI 不变。