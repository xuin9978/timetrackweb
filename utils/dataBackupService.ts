// 数据备份和恢复工具
// 用于确保用户的时间段数据记录在任何情况下都不会丢失

import { CalendarEvent } from '../types';

// 备份数据到本地存储
const backupEventsToLocalStorage = (userId: string, events: CalendarEvent[]): boolean => {
  try {
    const backupData = {
      userId,
      events,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    
    localStorage.setItem(`events_backup_${userId}`, JSON.stringify(backupData));
    return true;
  } catch (error) {
    console.error('备份事件到本地存储失败:', error);
    return false;
  }
};

// 从本地存储恢复数据
const restoreEventsFromLocalStorage = (userId: string): { events: CalendarEvent[]; timestamp: string } | null => {
  try {
    const backupData = localStorage.getItem(`events_backup_${userId}`);
    if (!backupData) {
      return null;
    }
    
    const parsedData = JSON.parse(backupData);
    if (!parsedData.events || !Array.isArray(parsedData.events)) {
      return null;
    }
    
    return {
      events: parsedData.events,
      timestamp: parsedData.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('从本地存储恢复事件失败:', error);
    return null;
  }
};

// 清理旧的备份数据
const cleanOldBackups = (userId: string): void => {
  try {
    // 只保留最近5个备份（如果有多个的话）
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(`events_backup_${userId}`))
      .sort()
      .reverse();
    
    // 只保留最近的备份
    if (backupKeys.length > 1) {
      const keysToRemove = backupKeys.slice(1);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('清理旧备份失败:', error);
  }
};

// 手动创建备份（带时间戳）
const createManualBackup = (userId: string, events: CalendarEvent[]): boolean => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      userId,
      events,
      timestamp,
      version: '1.0.0',
      manual: true
    };
    
    localStorage.setItem(`events_backup_${userId}_${timestamp}`, JSON.stringify(backupData));
    return true;
  } catch (error) {
    console.error('创建手动备份失败:', error);
    return false;
  }
};

// 获取所有可用备份
const getAllBackups = (userId: string): Array<{ timestamp: string; manual: boolean }> => {
  try {
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(`events_backup_${userId}`))
      .sort()
      .reverse();
    
    return backupKeys.map(key => {
      try {
        const backupData = JSON.parse(localStorage.getItem(key) || '{}');
        return {
          timestamp: backupData.timestamp || key.replace(`events_backup_${userId}_`, ''),
          manual: backupData.manual || false
        };
      } catch {
        return { timestamp: key, manual: false };
      }
    });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    return [];
  }
};

// 验证备份数据完整性
const validateBackupIntegrity = (backupData: any): boolean => {
  if (!backupData || typeof backupData !== 'object') {
    return false;
  }
  
  if (!backupData.events || !Array.isArray(backupData.events)) {
    return false;
  }
  
  // 检查每个事件是否有必要的字段
  for (const event of backupData.events) {
    if (!event.id || !event.title || !event.startTime || !event.endTime || !event.date) {
      return false;
    }
  }
  
  return true;
};

export {
  backupEventsToLocalStorage,
  restoreEventsFromLocalStorage,
  cleanOldBackups,
  createManualBackup,
  getAllBackups,
  validateBackupIntegrity
};