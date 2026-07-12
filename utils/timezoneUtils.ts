// 时区处理工具函数
// 专门用于解决"今天"事件显示问题的时区处理

import { startOfDay, endOfDay, format } from 'date-fns';

export const APP_TIME_ZONE = 'Asia/Shanghai';
export const CHINA_TIMEZONE_OFFSET_MINUTES = 8 * 60;

export const getChinaWallDate = (date: Date): Date => {
  const chinaTime = new Date(date.getTime() + CHINA_TIMEZONE_OFFSET_MINUTES * 60 * 1000);
  return new Date(chinaTime.getUTCFullYear(), chinaTime.getUTCMonth(), chinaTime.getUTCDate());
};

export const getChinaWallDateTime = (date: Date): Date => {
  const chinaTime = new Date(date.getTime() + CHINA_TIMEZONE_OFFSET_MINUTES * 60 * 1000);
  return new Date(
    chinaTime.getUTCFullYear(),
    chinaTime.getUTCMonth(),
    chinaTime.getUTCDate(),
    chinaTime.getUTCHours(),
    chinaTime.getUTCMinutes(),
    chinaTime.getUTCSeconds(),
    chinaTime.getUTCMilliseconds()
  );
};

export const formatChinaWallTime = (date: Date): string => {
  const chinaTime = new Date(date.getTime() + CHINA_TIMEZONE_OFFSET_MINUTES * 60 * 1000);
  return `${chinaTime.getUTCHours().toString().padStart(2, '0')}:${chinaTime.getUTCMinutes().toString().padStart(2, '0')}`;
};

export const formatChinaDateKey = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const chinaWallTimeToISOString = (date: Date, time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const utcMillis = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours - 8,
    minutes,
    0,
    0
  );
  return new Date(utcMillis).toISOString();
};

export const chinaWallDateToISOString = (date: Date): string => {
  const utcMillis = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours() - 8,
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  return new Date(utcMillis).toISOString();
};

export const startOfChinaDayISOString = (date: Date): string => {
  return chinaWallTimeToISOString(date, '00:00');
};

export const endOfChinaDayISOString = (date: Date): string => {
  const utcMillis = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    15,
    59,
    59,
    999
  );
  return new Date(utcMillis).toISOString();
};

/**
 * 标准化日期处理，确保时区一致性
 * 解决UTC时间与本地时间转换导致的日期偏移问题
 */
export const normalizeDateToLocal = (date: Date): Date => {
  const d = new Date(date);
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
  const today = getChinaWallDate(new Date());
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
  const chinaToday = getChinaWallDate(today);
  const start = startOfDay(chinaToday);
  const end = endOfDay(chinaToday);
  
  return {
    start: startOfChinaDayISOString(start),
    end: endOfChinaDayISOString(end),
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
  return getChinaWallDate(utcDate);
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
