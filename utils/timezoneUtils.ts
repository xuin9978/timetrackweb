// 时区处理工具函数
// 专门用于解决"今天"事件显示问题的时区处理

import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * 标准化日期处理，确保时区一致性
 * 解决UTC时间与本地时间转换导致的日期偏移问题
 */
export const normalizeDateToLocal = (date: Date): Date => {
  const d = new Date(date);
  // 提取本地时间的年、月、日，重新构建日期对象
  // 这样可以避免UTC时间转换导致的日期偏移
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  return new Date(year, month, day);
};

/**
 * 安全的"今天"日期比较函数
 * 避免时区问题导致的比较错误
 */
export const isTodaySafe = (date: Date): boolean => {
  const today = new Date();
  const normalizedToday = normalizeDateToLocal(today);
  const normalizedDate = normalizeDateToLocal(date);
  
  return normalizedToday.getTime() === normalizedDate.getTime();
};

/**
 * 获取"今天"的时间范围（本地时间）
 * 用于数据库查询和事件筛选
 */
export const getTodayTimeRange = () => {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startLocal: start,
    endLocal: end
  };
};

/**
 * 将UTC时间转换为本地日期
 * 专门用于处理从Supabase读取的时间数据
 */
export const convertUTCToLocalDate = (utcDateString: string): Date => {
  const utcDate = new Date(utcDateString);
  return normalizeDateToLocal(utcDate);
};

/**
 * 安全的日期比较函数
 * 比较两个日期是否为同一天，避免时区问题
 */
export const isSameDaySafe = (date1: Date, date2: Date): boolean => {
  const normalized1 = normalizeDateToLocal(date1);
  const normalized2 = normalizeDateToLocal(date2);
  
  return normalized1.getTime() === normalized2.getTime();
};

/**
 * 调试时区信息的辅助函数
 */
export const debugTimezoneInfo = (date: Date, label: string = 'Date') => {
  console.log(`=== ${label} 时区调试信息 ===`);
  console.log('原始日期对象:', date);
  console.log('toString():', date.toString());
  console.log('toISOString():', date.toISOString());
  console.log('toLocaleDateString():', date.toLocaleDateString());
  console.log('toLocaleTimeString():', date.toLocaleTimeString());
  console.log('getFullYear():', date.getFullYear());
  console.log('getMonth():', date.getMonth());
  console.log('getDate():', date.getDate());
  console.log('getHours():', date.getHours());
  console.log('getTimezoneOffset():', date.getTimezoneOffset());
  console.log('标准化后日期:', normalizeDateToLocal(date));
  console.log('是否为今天:', isTodaySafe(date));
  console.log('=====================================');
};