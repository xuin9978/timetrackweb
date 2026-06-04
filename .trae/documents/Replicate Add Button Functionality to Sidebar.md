我将实现侧边栏"添加"按钮的"智能添加"功能（基于现有事件智能建议时间），使其行为与日程面板中的添加按钮完全一致。

**执行计划:**

1.  **重构逻辑到 `App.tsx`**:
    *   将智能添加逻辑（即 `handleAddEventPanel` 中根据选中日期的现有事件自动计算开始/结束时间的代码）从 `components/Calendar.tsx` 提取并移动到 `App.tsx`，命名为 `handleSmartAddEvent`。
    *   这样可以确保 `App.tsx` 拥有一个统一的"智能添加"函数，直接利用全局的 `events` 和 `selectedDate` 状态。

2.  **更新 `App.tsx`**:
    *   导入所需的日期工具函数 (`formatTime`, `getMinutesFromTime`, `isSameDay`)。
    *   将新的 `handleSmartAddEvent` 函数通过 `onAddEvent` 属性传递给 `Sidebar` 组件。
    *   通过一个新的 `onSmartAddEvent` 属性将 `handleSmartAddEvent` 传递给 `Calendar` 组件，以保持原有功能正常。

3.  **更新 `components/Calendar.tsx`**:
    *   在组件 Props 中接收 `onSmartAddEvent`。
    *   移除原有的本地 `handleAddEventPanel` 函数实现。
    *   将接收到的 `onSmartAddEvent` 传递给子组件 `EventPanel`。

4.  **更新 `components/Sidebar.tsx`**:
    *   在"添加"按钮的内部 `div` 样式中添加 `hover:rotate-90` 类，以完美复刻 `EventPanel` 中按钮的悬停旋转动画效果。

完成这些步骤后，侧边栏的黑色圆形按钮将拥有与日程面板按钮完全相同的代码功能：点击时会智能计算时间并打开新建窗口，悬停时会有旋转动画。