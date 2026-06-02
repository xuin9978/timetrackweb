# 代码全面检查与测试任务

## 1. 静态分析阶段

- [ ] Task 1.1: 运行 TypeScript 编译器检查类型错误
  - 执行 `npx tsc --noEmit` 检查所有类型定义
  - 记录所有类型错误和警告

- [ ] Task 1.2: 运行 ESLint 检查代码规范
  - 检查 .eslintrc 或 eslint 配置
  - 执行 ESLint 检查所有源文件
  - 记录规范问题和严重警告

- [ ] Task 1.3: 检查 package.json 依赖完整性
  - 验证所有依赖是否正确安装
  - 检查是否有缺失的测试依赖

- [ ] Task 1.4: 静态代码审查关键模块
  - 审查 App.tsx 的 React hooks 使用
  - 审查 eventService.ts 的错误处理
  - 审查 dateUtils.ts 的日期计算逻辑

## 2. 单元测试阶段

- [ ] Task 2.1: 测试 dateUtils 工具函数
  - 测试 getVisibleDateRange 函数（Day/Week/Month视图）
  - 测试 splitEventAcrossDays 跨天分割逻辑
  - 测试 getMinutesFromTime 和 getDurationInMinutes
  - 测试 calculateEventLayouts 事件布局计算

- [ ] Task 2.2: 测试 timezoneUtils 时区处理
  - 测试 isSameDaySafe 函数
  - 测试 normalizeDateToLocal 函数

- [ ] Task 2.3: 测试 ICS 导入导出
  - 测试 exportToICS 生成正确的 ICS 文件
  - 测试 parseICS 正确解析 ICS 内容

- [ ] Task 2.4: 运行现有测试文件
  - 执行 test-calendar-logic.ts
  - 执行 test-visible-range-coverage.ts
  - 执行 test-month-events-mapping.ts
  - 执行 test-supabase-connection.js
  - 执行其他 test-*.js/ts 文件

## 3. 组件功能测试

- [ ] Task 3.1: 测试 Calendar 组件渲染
  - 验证月度视图正确显示周几
  - 验证日期正确高亮今天和选中日期
  - 验证事件正确显示在对应日期

- [ ] Task 3.2: 测试事件管理流程
  - 测试 handleAddEvent 添加新事件
  - 测试 handleUpdateEvent 更新事件
  - 测试 handleDeleteEvent 删除事件
  - 测试乐观更新和错误回滚

- [ ] Task 3.3: 测试标签系统
  - 测试标签筛选功能
  - 测试标签增删改操作
  - 测试标签排序保存

## 4. 边界条件测试

- [ ] Task 4.1: 空数据状态测试
  - 无事件时的日历显示
  - 无标签时的事件添加
  - 空搜索结果处理

- [ ] Task 4.2: 时区边界测试
  - 夏令时切换测试
  - 跨日界线事件测试
  - UTC vs 本地时间测试

- [ ] Task 4.3: 异常输入测试
  - 无效日期格式处理
  - 超长文本截断
  - 特殊字符处理

## 5. 测试报告生成

- [ ] Task 5.1: 汇总所有测试结果
  - 分类统计：关键Bug、警告、信息
  - 按模块分组问题
  - 提供复现步骤和错误信息

- [ ] Task 5.2: 生成详细Bug报告
  - Bug位置（文件:行号）
  - Bug类型分类
  - 严重程度评级
  - 建议修复方案

## 任务依赖关系

- Task 1.1 和 Task 1.2 可以并行执行
- Task 2.4 依赖 Task 1.3（依赖安装完成）
- Task 5 依赖所有测试任务完成
