# 代码全面检查与测试清单

## 1. 静态分析检查点

- [ ] TypeScript 编译检查通过（无类型错误）
- [ ] ESLint 检查通过（或仅有可忽略的警告）
- [ ] 所有依赖正确安装
- [ ] package.json scripts 配置正确

## 2. 单元测试检查点

### dateUtils 工具函数
- [ ] getVisibleDateRange Day视图返回正确范围
- [ ] getVisibleDateRange Week视图返回正确范围
- [ ] getVisibleDateRange Month视图返回正确范围
- [ ] splitEventAcrossDays 正确分割跨天事件
- [ ] splitEventAcrossDays 处理午夜到次日的事件
- [ ] getMinutesFromTime 正确解析时间字符串
- [ ] getDurationInMinutes 正确计算时长
- [ ] getDurationInMinutes 处理跨天时长
- [ ] calculateEventLayouts 正确处理无重叠事件
- [ ] calculateEventLayouts 正确处理完全重叠事件
- [ ] calculateEventLayouts 正确处理部分重叠事件
- [ ] calculateEventLayouts 正确处理嵌套事件

### timezoneUtils 时区处理
- [ ] isSameDaySafe 正确判断同一天（相同时区）
- [ ] isSameDaySafe 正确判断同一天（不同时区）
- [ ] normalizeDateToLocal 正确标准化日期

### ICS 导入导出
- [ ] exportToICS 生成格式正确的 ICS 文件
- [ ] exportToICS 正确处理中文标题
- [ ] parseICS 正确解析标准 ICS 文件
- [ ] parseICS 正确处理中文标题

### 现有测试文件
- [ ] test-calendar-logic.ts 执行成功
- [ ] test-visible-range-coverage.ts 执行成功
- [ ] test-month-events-mapping.ts 执行成功
- [ ] test-supabase-connection.js 执行成功（或正确处理连接失败）

## 3. 组件功能检查点

### Calendar 组件
- [ ] 日历正确渲染当前月份的日期
- [ ] 正确高亮显示今天
- [ ] 正确高亮显示选中的日期
- [ ] 正确显示事件在对应日期格中
- [ ] 标签筛选正确隐藏/显示事件

### 事件管理
- [ ] 添加事件后立即显示（乐观更新）
- [ ] 保存失败后正确回滚
- [ ] 更新事件后UI正确更新
- [ ] 删除事件后正确从UI移除

### 标签系统
- [ ] 添加新标签后立即显示
- [ ] 编辑标签后正确更新
- [ ] 删除标签后正确移除（事件重新分类）
- [ ] 标签排序保存成功

## 4. 边界条件检查点

### 空数据状态
- [ ] 无事件时日历正常显示
- [ ] 无标签时添加事件使用默认分类
- [ ] 空搜索结果显示正确提示

### 时区边界
- [ ] 跨天事件正确显示
- [ ] 时区切换后日期计算正确

### 异常输入
- [ ] 无效日期输入有错误提示
- [ ] 超长标题正确截断显示
- [ ] 特殊字符正确转义

## 5. 测试结果检查点

- [ ] 所有关键Bug已记录
- [ ] Bug报告包含位置信息（文件:行号）
- [ ] Bug报告包含复现步骤
- [ ] Bug按严重程度分类
