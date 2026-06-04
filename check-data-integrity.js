// 数据完整性检查脚本
// 用于确认当前所有时间段数据的完整性

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env', override: false });

const norm = v => typeof v === 'string' ? v.trim().replace(/^['"`]|['"`]$/g, '') : undefined;
const SUPABASE_URL = norm(process.env.VITE_SUPABASE_URL);
const SUPABASE_KEY = norm(process.env.VITE_SUPABASE_ANON_KEY);

async function checkDataIntegrity() {
  console.log('=== 数据完整性检查开始 ===');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY');
    return { success: false };
  }
  
  try {
    // 创建Supabase客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // 获取所有事件数据
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, category, user_id')
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('❌ 获取事件数据失败:', error.message);
      return;
    }
    
    // 获取所有用户数据
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');
    
    if (usersError) {
      console.error('❌ 获取用户数据失败:', usersError.message);
      return;
    }
    
    // 数据统计
    console.log('✅ 数据检查完成');
    console.log('📊 数据统计:');
    console.log(`   - 总事件数: ${events.length}`);
    console.log(`   - 总用户数: ${users.length}`);
    
    // 检查每个用户的事件
    const userEventMap = new Map();
    events.forEach(event => {
      const count = userEventMap.get(event.user_id) || 0;
      userEventMap.set(event.user_id, count + 1);
    });
    
    console.log('📋 每个用户的事件数:');
    userEventMap.forEach((count, userId) => {
      const user = users.find(u => u.id === userId);
      console.log(`   - ${user?.email || userId}: ${count} 个事件`);
    });
    
    // 检查事件数据完整性
    const invalidEvents = events.filter(event => {
      return !event.title || !event.start_time || !event.end_time;
    });
    
    if (invalidEvents.length > 0) {
      console.warn('⚠️  发现无效事件:', invalidEvents.length, '个');
      invalidEvents.forEach(event => {
        console.warn(`   - 无效事件ID: ${event.id}, 标题: ${event.title}`);
      });
    } else {
      console.log('✅ 所有事件数据完整');
    }
    
    // 检查事件时间范围
    const today = new Date();
    const pastEvents = events.filter(event => new Date(event.start_time) < today);
    const futureEvents = events.filter(event => new Date(event.start_time) > today);
    
    console.log('📅 事件时间分布:');
    console.log(`   - 过去事件: ${pastEvents.length} 个`);
    console.log(`   - 未来事件: ${futureEvents.length} 个`);
    
    // 备份数据到本地
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        events: events,
        users: users
      };
      
      // 保存到文件
      import('fs').then(fs => {
        fs.writeFileSync('event_data_backup.json', JSON.stringify(backupData, null, 2));
        console.log('💾 数据已备份到 event_data_backup.json');
      });
    } catch (backupError) {
      console.warn('⚠️  本地备份失败:', backupError.message);
    }
    
    console.log('=== 数据完整性检查结束 ===');
    return { success: true, eventCount: events.length };
    
  } catch (error) {
    console.error('❌ 数据检查脚本执行失败:', error);
    return { success: false };
  }
}

// 执行检查
checkDataIntegrity();
