import { ViewMode } from '../types';
import { getVisibleDateRange, generateCalendarData } from '../utils/dateUtils';

const currentDate = new Date('2025-11-18');
const selectedDate = new Date('2025-11-18');

const modes = [ViewMode.Month, ViewMode.Week, ViewMode.Day];
for (const vm of modes) {
  const { startDate, endDate } = getVisibleDateRange(currentDate, vm, selectedDate);
  const days = generateCalendarData(currentDate, selectedDate, vm, []);
  const labels = days.map(d => d.date.toISOString().slice(0,10));
  console.log(`[Coverage] ${vm} range`, startDate.toISOString(), endDate.toISOString());
  console.log(`[Coverage] ${vm} days`, labels[0], '...', labels[labels.length - 1], `count=${labels.length}`);
  const targetDays = ['2025-11-18','2025-11-30'];
  const hasStart = labels.includes(targetDays[0]);
  const hasEnd = labels.includes(targetDays[1]);
  console.log(`[Coverage] includes 11.18? ${hasStart} includes 11.30? ${hasEnd}`);
}

console.log('Done');
