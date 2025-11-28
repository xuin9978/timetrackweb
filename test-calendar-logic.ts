
import { ViewMode } from './types';
import { generateCalendarData, isSameDay } from './utils/dateUtils';

// Mock state and handler
let currentDate = new Date('2023-11-01'); // November 2023
let selectedDate = new Date('2023-11-01');
let viewMode = ViewMode.Month;

const setCurrentDate = (date: Date) => { currentDate = date; };
const setSelectedDate = (date: Date) => { selectedDate = date; };
const setViewMode = (mode: ViewMode) => { viewMode = mode; };

// The function to test
const handleDateClick = (date: Date) => {
  setSelectedDate(date);
  if (viewMode === ViewMode.Month) {
    setCurrentDate(date);
    setViewMode(ViewMode.Day);
  }
};

// Test Case 1: Click a date in the current month
console.log('Test 1: Click 2023-11-15 (Current Month)');
const targetDate1 = new Date('2023-11-15');
handleDateClick(targetDate1);

if (
  isSameDay(selectedDate, targetDate1) &&
  isSameDay(currentDate, targetDate1) &&
  viewMode === ViewMode.Day
) {
  console.log('PASS: Jumped to Day view with correct date.');
} else {
  console.error('FAIL: State mismatch', { selectedDate, currentDate, viewMode });
}

// Reset
viewMode = ViewMode.Month;
currentDate = new Date('2023-11-01');

// Test Case 2: Click a date in the previous month (displayed in grid)
console.log('Test 2: Click 2023-10-31 (Prev Month)');
const targetDate2 = new Date('2023-10-31');
handleDateClick(targetDate2);

if (
  isSameDay(selectedDate, targetDate2) &&
  isSameDay(currentDate, targetDate2) &&
  viewMode === ViewMode.Day
) {
  console.log('PASS: Jumped to Day view with prev month date.');
} else {
  console.error('FAIL: State mismatch', { selectedDate, currentDate, viewMode });
}

// Reset
viewMode = ViewMode.Month;
currentDate = new Date('2023-11-01');

// Test Case 3: Leap Year check (2024-02-29)
console.log('Test 3: Leap Year 2024-02-29');
currentDate = new Date('2024-02-01');
const targetDate3 = new Date('2024-02-29');
handleDateClick(targetDate3);

if (
  isSameDay(selectedDate, targetDate3) &&
  isSameDay(currentDate, targetDate3) &&
  viewMode === ViewMode.Day
) {
  console.log('PASS: Jumped to Day view on Leap Day.');
} else {
  console.error('FAIL: State mismatch', { selectedDate, currentDate, viewMode });
}
