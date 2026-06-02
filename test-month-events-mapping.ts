import { ViewMode, CalendarEvent } from './types';
import { generateCalendarData } from './utils/dateUtils';

const mk = (dateStr: string, start: string, end: string, category = 'x'): CalendarEvent => ({
  id: Math.random().toString(36).slice(2),
  title: 't',
  date: new Date(dateStr),
  startTime: start,
  endTime: end,
  category,
});

const currentDate = new Date('2025-11-18');
const selectedDate = new Date('2025-11-18');
const events: CalendarEvent[] = [
  mk('2025-11-18', '09:00', '10:00'),
  mk('2025-11-20', '11:00', '12:00'),
  mk('2025-11-30', '08:00', '09:00'),
];

const data = generateCalendarData(currentDate, selectedDate, ViewMode.Month, events);
const byDate = new Map<string, number>();
for (const d of data) {
  const k = `${d.date.getFullYear()}-${String(d.date.getMonth()+1).padStart(2,'0')}-${String(d.date.getDate()).padStart(2,'0')}`;
  byDate.set(k, d.events.length);
}

console.log('11-18 count', byDate.get('2025-11-18'));
console.log('11-20 count', byDate.get('2025-11-20'));
console.log('11-30 count', byDate.get('2025-11-30'));
