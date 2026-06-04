import { CalendarEvent, ViewMode } from './types';
import {
  calculateEventLayouts,
  getEventBlockPresentation,
  splitEventAcrossDays,
} from './utils/dateUtils';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const mkEvent = (id: string, startTime: string, endTime: string): CalendarEvent => ({
  id,
  title: id,
  category: 'test',
  date: new Date('2026-06-03'),
  startTime,
  endTime,
});

const shortPresentation = getEventBlockPresentation({
  duration: 29,
  viewMode: ViewMode.Day,
});
assert(!shortPresentation.showTimeRange, '短于 30 分钟的日程不应显示完整时间段');

const dayPresentation = getEventBlockPresentation({
  duration: 40,
  viewMode: ViewMode.Day,
});
assert(dayPresentation.showTimeRange, '30 分钟及以上日程应显示完整时间段');
assert(dayPresentation.layoutDirection === 'column', '日视图长事件应使用分行布局');

const weekPresentation = getEventBlockPresentation({
  duration: 40,
  viewMode: ViewMode.Week,
});
assert(weekPresentation.showTimeRange, '周视图 30 分钟及以上日程应显示完整时间段');
assert(weekPresentation.layoutDirection === 'row', '周视图应使用紧凑布局');

const split = splitEventAcrossDays({
  title: '跨天',
  category: 'test',
  date: new Date('2026-06-03'),
  startTime: '23:00',
  endTime: '01:00',
});
assert(split.length === 2, '跨天事件应拆成两个片段');
assert(Boolean(split[0].continuesToNextDay), '第一段应标记继续到次日');
assert(Boolean(split[1].continuesFromPreviousDay), '第二段应标记来自前一日');

const layouts = calculateEventLayouts([
  mkEvent('a', '09:00', '10:00'),
  mkEvent('b', '09:30', '10:30'),
  mkEvent('c', '10:00', '11:00'),
]);
assert(layouts.get('a')?.totalColumns === 2, '链式重叠应计算为两列');
assert(layouts.get('b')?.column === 1, '中间重叠事件应进入第二列');
assert(layouts.get('c')?.column === 0, '相邻结束后的事件应复用可用列');

const sameStartLayouts = calculateEventLayouts([
  mkEvent('same-a', '06:00', '06:45'),
  mkEvent('same-b', '06:00', '07:30'),
]);
assert(sameStartLayouts.get('same-a')?.totalColumns === 2, '同起点不同结束应稳定分成两列');
assert(sameStartLayouts.get('same-b')?.totalColumns === 2, '同起点长事件也应保留同一冲突组列数');
assert(sameStartLayouts.get('same-a')?.left !== sameStartLayouts.get('same-b')?.left, '同起点事件不应互相覆盖');

const nestedLayouts = calculateEventLayouts([
  mkEvent('container', '06:00', '08:00'),
  mkEvent('nested', '06:30', '07:00'),
]);
assert(nestedLayouts.get('container')?.totalColumns === 2, '包含关系也应按苹果日历式分栏');
assert(nestedLayouts.get('nested')?.indent === 0, '包含关系不应再使用缩进嵌套');

const adjacentLayouts = calculateEventLayouts([
  mkEvent('early', '06:00', '06:45'),
  mkEvent('later', '06:45', '07:30'),
]);
assert(adjacentLayouts.get('early')?.totalColumns === 1, '相邻事件不应算作重叠');
assert(adjacentLayouts.get('later')?.totalColumns === 1, '相邻事件应保持完整宽度');

console.log('PASS: time segment presentation and layout checks');
