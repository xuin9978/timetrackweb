我将修改侧边栏的用户按钮逻辑，同时优化移动端（PWA/iPhone 15 Pro Max）的自适应布局。

**执行计划:**

1. **更新** **`components/Sidebar.tsx`**:

   * 在 `SidebarProps` 接口中新增属性：`onOpenAccount: () => void;`。

   * **修改用户按钮逻辑**：移除 `{!isLoggedIn && ...}` 包裹，使其始终显示。

     * 点击逻辑：如果未登录(`!isLoggedIn`)则调用 `onOpenAuth`，如果已登录(`isLoggedIn`)则调用 `onOpenAccount`。

   * 这确保了在手机端底栏（PWA模式）也能通过点击用户图标来管理账号（查看信息/退出）。

2. **更新** **`App.tsx`**:

   * **传入** **`onOpenAccount`**：将 `() => setIsAccountOpen(true)` 传递给 `Sidebar` 组件。

   * **移除悬浮按钮**：移除桌面版右上角的 `currentUser.email` 悬浮按钮，改用 Sidebar 统一管理，保持界面一致性。

   * **移动端视图优化**：检查 `ViewMode` 初始化逻辑。虽然已有 PWA 检测逻辑将视图设为 `Day`（日视图），但为了确保 iPhone 15 Pro Max 等大屏手机体验，我将确认 `App.tsx` 中的 PWA 检测逻辑（第 70-87 行）是否准确覆盖了 iOS Safari 环境。

这样修改后：

* **网页版**：Sidebar 左侧始终显示用户图标，点击可登录或管理账号。

* **PWA/手机版**：底部导航栏显示 5 个按钮（闹钟、历史、添加、日历、用户），点击用户图标可进行账号操作，且默认进入日视图，完美适配 iPhone 15 Pro Max 屏幕。

