// 时区修复测试脚本
// 用于验证"今天"事件显示问题的修复效果

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qlnwwewhbgjffjevevij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbnd3ZXdoYmdqZmZqZXZldmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTc2NjQsImV4cCI6MjA5NDc0NzY2NH0.gbdc85N8Tj27I1n4WZvK4boiT6BlsCcd3TSkK1Xm4wI';

// 模拟事件数据
const testEvents = [
  {
    title: '测试事件 - 今天早上',
    startTime: '09:00',
    endTime: '10:00',
    category: 'work',
    date: new Date()  // 今天
  },
  {
    title: '测试事件 - 今天下午',
    startTime: '14:30',
    endTime: '15:30',
    category: 'personal',
    date: new Date()  // 今天
  },
  {
    title: '测试事件 - 明天',
    startTime: '10:00',
    endTime: '11:00',
    category: 'work',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 明天
  }
];

// 时区测试函数
function testTimezoneHandling() {
  console.log('=== 时区处理测试 ===');
  
  const now = new Date();
  console.log('当前时间:', now.toString());
  console.log('当前时间(ISO):', now.toISOString());
  console.log('当前时间(本地):', now.toLocaleString());
  
  // 测试日期比较函数
  testEvents.forEach((event, index) => {
    console.log(`\n事件 ${index + 1}: ${event.title}`);
    console.log('事件日期:', event.date.toString());
    console.log('事件日期(ISO):', event.date.toISOString());
    console.log('事件日期(本地):', event.date.toLocaleDateString());
    
    // 模拟 isSameDay 比较
    const today = new Date();
    const isSameDayCheck = 
      event.date.getFullYear() === today.getFullYear() &&
      event.date.getMonth() === today.getMonth() &&
      event.date.getDate() === today.getDate();
    
    console.log('是否为今天(安全比较):', isSameDayCheck);
    
    // 测试时区偏移
    const timezoneOffset = event.date.getTimezoneOffset();
    console.log('时区偏移(分钟):', timezoneOffset);
  });
}

// 模拟数据库时间转换
function testDatabaseTimeConversion() {
  console.log('\n=== 数据库时间转换测试 ===');
  
  testEvents.forEach((event, index) => {
    console.log(`\n事件 ${index + 1}: ${event.title}`);
    
    // 模拟存储到数据库 (转换为UTC ISO字符串)
    const toTime = (date, time) => {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      return d.toISOString();  // UTC时间
    };
    
    const dbStartTime = toTime(event.date, event.startTime);
    const dbEndTime = toTime(event.date, event.endTime);
    
    console.log('数据库存储的开始时间(UTC):', dbStartTime);
    console.log('数据库存储的结束时间(UTC):', dbEndTime);
    
    // 模拟从数据库读取
    const fromDB = (startTime, endTime) => {
      const start = new Date(startTime);  // UTC时间
      const end = new Date(endTime);
      
      // 标准化为本地日期
      const normalizeToLocalDate = (date) => {
        const localDate = new Date(date);
        const year = localDate.getFullYear();
        const month = localDate.getMonth();
        const day = localDate.getDate();
        return new Date(year, month, day);  // 本地时间午夜
      };
      
      return {
        date: normalizeToLocalDate(start),
        startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`
      };
    };
    
    const convertedEvent = fromDB(dbStartTime, dbEndTime);
    console.log('转换后的日期:', convertedEvent.date.toString());
    console.log('转换后的日期(本地):', convertedEvent.date.toLocaleDateString());
    console.log('转换后的开始时间:', convertedEvent.startTime);
    console.log('转换后的结束时间:', convertedEvent.endTime);
    
    // 验证是否为今天
    const today = new Date();
    const isToday = 
      convertedEvent.date.getFullYear() === today.getFullYear() &&
      convertedEvent.date.getMonth() === today.getMonth() &&
      convertedEvent.date.getDate() === today.getDate();
    
    console.log('转换后是否为今天:', isToday);
  });
}

// 运行测试
console.log('开始测试时区修复效果...\n');
testTimezoneHandling();
testDatabaseTimeConversion();

console.log('\n=== 测试完成 ===');
console.log('如果所有"是否为今天"的判断都正确，说明修复有效。');
console.log('请在北京时间下午创建事件进行最终验证。');