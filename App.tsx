
import React, { useState, useMemo, useCallback } from 'react';
import Calendar from './components/Calendar';
import Alarm from './components/Alarm';
import History from './components/History';
import Diary from './components/Diary';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import AddEventModal from './components/AddEventModal';
import LogSessionModal from './components/LogSessionModal';
import CreateTagModal from './components/CreateTagModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { supabase } from './utils/supabaseClient';
import AccountModal from './components/AccountModal';
import { getVisibleDateRange, splitEventAcrossDays, isSameDay, formatTime, getMinutesFromTime, INITIAL_EVENTS, INITIAL_TAGS } from './utils/dateUtils';
import { fetchEvents, createEvents, updateEvent as updateEventDB, deleteEvent as deleteEventDB, replaceAllEvents, clearEventCategory, restoreEventCategory } from './utils/eventService';
import { backupEventsToLocalStorage, restoreEventsFromLocalStorage, cleanOldBackups } from './utils/dataBackupService';
import { fetchTags as fetchTagsDB, createTag as createTagDB, updateTag as updateTagDB, deleteTag as deleteTagDB, updateTagOrder } from './utils/tagService';
import { avatarForUserMetadata, isInlineAvatar } from './utils/profileAvatar';
import {
  DEMO_DIARY_ENTRIES,
  DEMO_USER,
  isDemoUser,
  loadDemoEvents,
  loadDemoTags,
  saveDemoEvents,
  saveDemoTags,
} from './utils/demoMode';

import { CalendarEvent, Tag, ModalConfig, AlarmState, AlarmMode, LogSessionModalConfig, ViewMode } from './types';

type ToastTone = 'success' | 'error' | 'info';
type SyncStatus = 'synced' | 'offline-cache' | 'sync-error' | 'session-expired';
type ActiveModule = 'calendar' | 'alarm' | 'history' | 'diary' | 'chat';

interface SidebarProfile {
  name: string;
  tagline: string;
  avatarUrl?: string | null;
}

interface ToastState {
  id: number;
  tone: ToastTone;
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const retry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> => {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (err?.name === 'AbortError' || /AbortError|aborted/i.test(msg) || (err?.name === 'AbortError')) throw err;
      attempt++;
      if (attempt > retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt - 1)));
    }
  }
};

const getSaveErrorMessage = (error: unknown, fallback: string) => {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (/Failed to fetch|NetworkError|ERR_CONNECTION|Network request failed/i.test(msg)) {
    return '网络连接异常，云端保存没有完成。';
  }
  return msg || fallback;
};

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('calendar');
  const [isMobileCalendarDetailsOpen, setIsMobileCalendarDetailsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);
  const [, setSyncStatus] = useState<SyncStatus>('synced');




  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Shared State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagPage, setTagPage] = useState(1);
  const [hasMoreTags, setHasMoreTags] = useState(true);
  const [visibleTags, setVisibleTags] = useState<string[]>([]);

  // Persistence Effects（按用户隔离） moved below currentUser declaration
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [localProfileAvatar, setLocalProfileAvatar] = useState<string | null>(null);
  const activeUserIsDemo = isDemoMode || isDemoUser(currentUser);

  React.useEffect(() => {
    if (!currentUser?.id) {
      setLocalProfileAvatar(null);
      return;
    }

    const storageKey = `profile_avatar_${currentUser.id}`;
    const metadataAvatar = currentUser.user_metadata?.avatar_url;
    if (isInlineAvatar(metadataAvatar)) {
      try {
        localStorage.setItem(storageKey, metadataAvatar);
        setLocalProfileAvatar(metadataAvatar);
      } catch {
        setLocalProfileAvatar(null);
      }
      if (activeUserIsDemo) return;
      supabase?.auth.refreshSession().then(({ data }) => {
        if (data.session?.user) setCurrentUser(data.session.user);
      });
      return;
    }

    try {
      setLocalProfileAvatar(localStorage.getItem(storageKey));
    } catch {
      setLocalProfileAvatar(null);
    }
  }, [currentUser, activeUserIsDemo]);

  // Load initial mock data when not logged in
  React.useEffect(() => {
    if (activeUserIsDemo) {
      const demoTags = loadDemoTags();
      setEvents(loadDemoEvents());
      setTags(demoTags);
      setVisibleTags(demoTags.map(t => t.id));
      setHasMoreTags(false);
      setSyncStatus('offline-cache');
      return;
    }

    if (!currentUser) {
      setEvents(INITIAL_EVENTS);
      setTags(INITIAL_TAGS);
      setVisibleTags(INITIAL_TAGS.map(t => t.id));
    }
  }, [currentUser, activeUserIsDemo]);

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((nextToast: Omit<ToastState, 'id'>, duration = 5000) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ ...nextToast, id: Date.now() });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, duration);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const handleModuleSwitch = useCallback((module: ActiveModule) => {
    setActiveModule(module);
    if (module !== 'calendar') {
      setIsMobileCalendarDetailsOpen(false);
    }
  }, []);

  const sidebarProfile = useMemo<SidebarProfile>(() => {
    const metadata = currentUser?.user_metadata ?? {};
    const name =
      typeof metadata.display_name === 'string' && metadata.display_name.trim()
        ? metadata.display_name.trim()
        : typeof metadata.full_name === 'string' && metadata.full_name.trim()
          ? metadata.full_name.trim()
          : typeof metadata.name === 'string' && metadata.name.trim()
            ? metadata.name.trim()
            : '用户';
    const tagline =
      typeof metadata.tagline === 'string' && metadata.tagline.trim()
        ? metadata.tagline.trim()
        : '添加一句个人签名';
    const remoteAvatarUrl =
      typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()
        ? metadata.avatar_url.trim()
        : typeof metadata.picture === 'string' && metadata.picture.trim()
          ? metadata.picture.trim()
          : null;
    const avatarUrl = localProfileAvatar ?? remoteAvatarUrl;

    return { name, tagline, avatarUrl };
  }, [currentUser, localProfileAvatar]);

  const handleSidebarProfileSave = useCallback(async (profile: SidebarProfile) => {
    if (activeUserIsDemo) {
      showToast({ tone: 'success', message: 'Demo 资料已在本地预览', detail: '不会同步到 Supabase。' }, 3000);
      return;
    }

    if (!supabase || !currentUser) {
      showToast({ tone: 'info', message: '已在当前页面预览', detail: '登录后可同步到你的账号。' }, 3000);
      return;
    }

    const storageKey = `profile_avatar_${currentUser.id}`;
    if (isInlineAvatar(profile.avatarUrl)) {
      localStorage.setItem(storageKey, profile.avatarUrl);
      setLocalProfileAvatar(profile.avatarUrl);
    } else if (!profile.avatarUrl) {
      localStorage.removeItem(storageKey);
      setLocalProfileAvatar(null);
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: profile.name,
        name: profile.name,
        tagline: profile.tagline,
        avatar_url: avatarForUserMetadata(profile.avatarUrl),
      },
    });

    if (error) {
      showToast({ tone: 'error', message: '个人资料保存失败', detail: error.message });
      return;
    }

    setCurrentUser(data.user ?? currentUser);
    showToast({ tone: 'success', message: '个人资料已同步', detail: '已保存到当前 Supabase 账号。' }, 3000);
  }, [currentUser, activeUserIsDemo, showToast]);

  // Set default view mode to Day when in PWA mode
  React.useEffect(() => {
    const isPwa = () => {
      // Check display mode media query
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      
      // Check navigator.standalone for older iOS
      if (typeof (navigator as any).standalone === 'boolean') {
        return (navigator as any).standalone;
      }
      
      return false;
    };

    if (isPwa()) {
      setViewMode(ViewMode.Day);
    }
  }, []);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Alarm State
  const [alarmState, setAlarmState] = useState<AlarmState>({
    status: 'idle',
    mode: 'stopwatch',
    startTime: 0,
    accumulatedTime: 0,
    totalDuration: 0
  });

  // Modal States
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    mode: 'create'
  });
  const [logSessionModalConfig, setLogSessionModalConfig] = useState<LogSessionModalConfig>({ isOpen: false });
  const [isCreateTagModalOpen, setIsCreateTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);

  const openModal = useCallback(async (start = '09:00', end = '10:00', date = new Date(), event?: CalendarEvent) => {
    setModalConfig({
      isOpen: true,
      mode: event ? 'edit' : 'create',
      initialData: { start, end, date, event }
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const openLogSessionModal = useCallback((startTime: string, endTime: string, startDate?: Date, endDate?: Date) => {
    setLogSessionModalConfig({ isOpen: true, startTime, endTime, startDate, endDate });
  }, []);

  const closeLogSessionModal = useCallback(() => {
    setLogSessionModalConfig({ isOpen: false });
  }, []);

  const openCreateTagModal = useCallback(() => {
    setEditingTag(undefined);
    setIsCreateTagModalOpen(true);
  }, []);

  const openEditTagModal = useCallback((tag: Tag) => {
    setEditingTag(tag);
    setIsCreateTagModalOpen(true);
  }, []);

  const closeCreateTagModal = useCallback(() => {
    setIsCreateTagModalOpen(false);
    setEditingTag(undefined);
  }, []);

  const refreshEvents = useCallback(async () => {
    if (activeUserIsDemo) {
      setEvents(loadDemoEvents());
      return;
    }
    if (!currentUser) return;
    const { startDate, endDate } = getVisibleDateRange(currentDate, viewMode, selectedDate);
    const refreshed = await fetchEvents(currentUser.id, startDate, endDate, undefined, { loadAll: true });
    setEvents(refreshed);

    // Update visible tags with new categories found in refreshed events
    const cats = Array.from(new Set(refreshed.map(e => e.category)));
    setVisibleTags(prev => {
      const newCats = cats.filter(c => !prev.includes(c));
      return newCats.length ? [...prev, ...newCats] : prev;
    });


  }, [currentUser, activeUserIsDemo, currentDate, viewMode, selectedDate]);

  const handleAddEvent = useCallback(async (newEventData: Omit<CalendarEvent, 'id'>): Promise<boolean> => {
    if (activeUserIsDemo) {
      const eventSegments = splitEventAcrossDays(newEventData);
      const createdEvents = eventSegments.map(seg => ({ ...seg, id: `demo-${crypto.randomUUID()}` }));
      setEvents(prev => {
        const next = [...prev, ...createdEvents];
        saveDemoEvents(next);
        return next;
      });
      if (newEventData.category) {
        setVisibleTags(prev => prev.includes(newEventData.category) ? prev : [...prev, newEventData.category]);
      }
      showToast({
        tone: 'success',
        message: `Demo 已创建 ${createdEvents.length} 个日程`,
        detail: '数据仅保存在当前浏览器本地。',
        actionLabel: '撤销',
        onAction: () => {
          dismissToast();
          setEvents(prev => {
            const ids = new Set(createdEvents.map(event => event.id));
            const next = prev.filter(event => !ids.has(event.id));
            saveDemoEvents(next);
            return next;
          });
        }
      });
      return true;
    }

    if (!supabase) {
      showToast({ tone: 'error', message: '未配置 Supabase，当前无法保存日程。' });
      return false;
    }

    if (!currentUser) {
      setIsAuthOpen(true);
      showToast({ tone: 'info', message: '请先登录', detail: '登录后创建的时间段才会保存。' });
      return false;
    }

    const eventSegments = splitEventAcrossDays(newEventData);

    const newCategory = newEventData.category;
    if (newCategory) {
      setVisibleTags(prev => prev.includes(newCategory) ? prev : [...prev, newCategory]);
    }

    // Optimistic update: immediately add to UI with temporary IDs
    const optimisticEvents = eventSegments.map(seg => ({ ...seg, id: `temp-${crypto.randomUUID()}` }));
    setEvents(prev => [...prev, ...optimisticEvents]);

    try {
      // Background save to database
      const created = await createEvents(currentUser.id, eventSegments);
      if (!created || created.length === 0) {
        // Revert optimistic update on failure
        setEvents(prev => prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id)));
        setSyncStatus('sync-error');
        showToast({ tone: 'error', message: '保存失败，已回滚。', detail: '请稍后重试。' });
        return false;
      }

      const createdWithMetadata = created.map((createdEvent, index) => ({
        ...createdEvent,
        seriesId: eventSegments[index]?.seriesId,
        segmentIndex: eventSegments[index]?.segmentIndex,
        segmentCount: eventSegments[index]?.segmentCount,
        continuesFromPreviousDay: eventSegments[index]?.continuesFromPreviousDay,
        continuesToNextDay: eventSegments[index]?.continuesToNextDay,
      }));

      // Replace temporary IDs with real IDs from database
      setEvents(prev => {
        const filtered = prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id));
        return [...filtered, ...createdWithMetadata];
      });
      setSyncStatus('synced');
      showToast({
        tone: 'success',
        message: `已创建 ${createdWithMetadata.length} 个日程`,
        actionLabel: '撤销',
        onAction: () => {
          dismissToast();
          const targetSeriesIds = new Set(createdWithMetadata.map(event => event.seriesId).filter(Boolean));
          const targetIds = new Set(createdWithMetadata.map(event => event.id));
          setEvents(prev => prev.filter(e => !(targetIds.has(e.id) || (e.seriesId && targetSeriesIds.has(e.seriesId)))));
          createdWithMetadata.forEach(createdEvent => {
            deleteEventDB(currentUser.id, createdEvent.id).catch(error => {
              console.error('撤销创建失败:', error);
              setSyncStatus('sync-error');
              showToast({ tone: 'error', message: '撤销失败', detail: '云端删除没有完成，请稍后重试。' });
            });
          });
        }
      });
      return true;
    } catch (e: any) {
      // 处理JWT过期错误
      if (e.message === 'JWT expired' || e.message?.includes('JWT expired')) {
        try {
          // 尝试自动刷新会话
          await supabase.auth.refreshSession();
          
          // 刷新成功后重新保存事件
            const created = await createEvents(currentUser.id, eventSegments);
            if (created && created.length > 0) {
              const createdWithMetadata = created.map((createdEvent, index) => ({
                ...createdEvent,
                seriesId: eventSegments[index]?.seriesId,
                segmentIndex: eventSegments[index]?.segmentIndex,
                segmentCount: eventSegments[index]?.segmentCount,
                continuesFromPreviousDay: eventSegments[index]?.continuesFromPreviousDay,
                continuesToNextDay: eventSegments[index]?.continuesToNextDay,
              }));
              // 替换临时ID为真实ID
              setEvents(prev => {
                const filtered = prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id));
                return [...filtered, ...createdWithMetadata];
              });
            setSyncStatus('synced');
            showToast({ tone: 'success', message: `已创建 ${created.length} 个日程` });
            return true;
          }
        } catch (refreshError) {
          // 刷新失败，提示用户重新登录
          setEvents(prev => prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id)));
          setSyncStatus('session-expired');
          showToast({ tone: 'error', message: '会话已过期，请重新登录', detail: '本次创建已回滚。' });
          console.error('JWT刷新失败:', refreshError);
          return false;
        }
      }
      
      // 其他错误处理
      setEvents(prev => prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id)));
      const msg = getSaveErrorMessage(e, '保存失败，请检查网络或账号配置');
      setSyncStatus('sync-error');
      showToast({ tone: 'error', message: '保存失败，已回滚。', detail: msg });
      console.error(e);
      return false;
    }
  }, [currentUser, activeUserIsDemo, dismissToast, showToast]);

  const handleSmartAddEvent = useCallback(() => {
    // Filter events for the selected date to determine the default start time
    const daysEvents = events.filter(e => isSameDay(e.date, selectedDate));
    // Sort events by start time
    daysEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let defaultStartTime = '09:00';
    let defaultEndTime = '10:00';

    if (daysEvents.length > 0) {
      const lastEvent = daysEvents[daysEvents.length - 1];
      defaultStartTime = lastEvent.endTime;
    }

    // Determine default end time: use current time if possible
    const now = new Date();
    const currentTimeStr = formatTime(now);

    const startMinutes = getMinutesFromTime(defaultStartTime);
    const currentMinutes = getMinutesFromTime(currentTimeStr);

    if (currentMinutes > startMinutes) {
      // If current time is after start time, use current time
      defaultEndTime = currentTimeStr;
    } else {
      // Fallback: start time + 15 minutes
      const endMinutes = startMinutes + 15;
      const hours = Math.floor(endMinutes / 60) % 24;
      const mins = endMinutes % 60;
      defaultEndTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    openModal(defaultStartTime, defaultEndTime, selectedDate);
  }, [openModal, selectedDate, events]);

  const handleLogSession = useCallback((description: string, tagIds: string[]) => {
    const { startTime, endTime, startDate } = logSessionModalConfig;
    if (!startTime || !endTime) return;

    // Use the actual start date if available, otherwise fallback to current time
    // This fixes issues where the session started on a previous day
    const eventDate = startDate || new Date();

    if (tagIds.length === 0) {
      // If no tags are selected, create one event with a default title and the first available tag
      handleAddEvent({
        title: description.trim() || '计时活动',
        startTime,
        endTime,
        category: tags[0]?.id || '',
        date: eventDate
      });
    } else {
      // Create a separate event for each selected tag
      tagIds.forEach(tagId => {
        const tag = tags.find(t => t.id === tagId);
        handleAddEvent({
          title: description.trim() || tag?.label || '计时活动',
          startTime,
          endTime,
          category: tagId,
          date: eventDate
        });
      });
    }
  }, [logSessionModalConfig, tags, handleAddEvent]);

  const handleUpdateEvent = useCallback(async (updatedEvent: CalendarEvent) => {
    if (activeUserIsDemo) {
      const previousEvent = events.find(e => e.id === updatedEvent.id);
      setEvents(prev => {
        const next = prev.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        saveDemoEvents(next);
        return next;
      });
      if (previousEvent) {
        showToast({
          tone: 'success',
          message: 'Demo 日程已更新',
          detail: '数据仅保存在当前浏览器本地。',
          actionLabel: '撤销',
          onAction: () => {
            dismissToast();
            setEvents(prev => {
              const next = prev.map(e => e.id === previousEvent.id ? previousEvent : e);
              saveDemoEvents(next);
              return next;
            });
          }
        });
      }
      return;
    }

    if (!currentUser || !supabase) {
      showToast({ tone: 'info', message: '请先登录', detail: '登录后才能同步修改。' });
      return;
    }

    // Optimistic update: immediately update UI
    const previousEvents = events;
    const previousEvent = events.find(e => e.id === updatedEvent.id);
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));

    try {
      const saved = await updateEventDB(currentUser.id, updatedEvent);
      if (!saved) {
        // Revert on failure
        setEvents(previousEvents);
        setSyncStatus('sync-error');
        showToast({ tone: 'error', message: '更新失败，已回滚。', detail: '请稍后重试。' });
        return;
      }
      setSyncStatus('synced');
      if (previousEvent) {
        showToast({
          tone: 'success',
          message: '日程已更新',
          actionLabel: '撤销',
          onAction: () => {
            dismissToast();
            setEvents(prev => prev.map(e => e.id === previousEvent.id ? previousEvent : e));
            updateEventDB(currentUser.id, previousEvent).catch(error => {
              console.error('撤销更新失败:', error);
              setSyncStatus('sync-error');
              showToast({ tone: 'error', message: '撤销失败', detail: '云端恢复没有完成，请稍后重试。' });
            });
          }
        });
      }
    } catch (e) {
      // Revert on error
      setEvents(previousEvents);
      const msg = getSaveErrorMessage(e, '更新失败，请检查网络或账号配置');
      if (msg.includes('JWT expired')) {
        setSyncStatus('session-expired');
        showToast({ tone: 'error', message: '会话已过期，请重新登录', detail: '本次更新已回滚。' });
      } else {
        setSyncStatus('sync-error');
        showToast({ tone: 'error', message: '更新失败，已回滚。', detail: msg });
      }
      console.error(e);
    }
  }, [currentUser, activeUserIsDemo, dismissToast, events, showToast]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (activeUserIsDemo) {
      const deletedEvent = events.find(e => e.id === id);
      setEvents(prev => {
        const next = prev.filter(e => e.id !== id);
        saveDemoEvents(next);
        return next;
      });
      if (deletedEvent) {
        showToast({
          tone: 'success',
          message: 'Demo 日程已删除',
          detail: '数据仅保存在当前浏览器本地。',
          actionLabel: '撤销',
          onAction: () => {
            dismissToast();
            setEvents(prev => {
              const next = [...prev, deletedEvent];
              saveDemoEvents(next);
              return next;
            });
          }
        });
      }
      return;
    }

    if (!currentUser || !supabase) {
      showToast({ tone: 'info', message: '请先登录', detail: '登录后才能同步删除。' });
      return;
    }

    // Optimistic update: immediately remove from UI
    const previousEvents = events;
    const deletedEvent = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));

    try {
      const ok = await deleteEventDB(currentUser.id, id);
      if (!ok) {
        // Revert on failure
        setEvents(previousEvents);
        setSyncStatus('sync-error');
        showToast({ tone: 'error', message: '删除失败，已回滚。', detail: '请稍后重试。' });
        return;
      }
      setSyncStatus('synced');
      if (deletedEvent) {
        showToast({
          tone: 'success',
          message: '日程已删除',
          actionLabel: '撤销',
          onAction: async () => {
            dismissToast();
            setEvents(prev => [...prev, deletedEvent]);
            try {
              const recreated = await createEvents(currentUser.id, [{
                title: deletedEvent.title,
                startTime: deletedEvent.startTime,
                endTime: deletedEvent.endTime,
                category: deletedEvent.category,
                date: deletedEvent.date
              }]);
              if (recreated.length > 0) {
                setEvents(prev => prev.map(e => e.id === deletedEvent.id ? recreated[0] : e));
              }
            } catch (error) {
              console.error('撤销删除失败:', error);
              setSyncStatus('sync-error');
              showToast({ tone: 'error', message: '撤销失败', detail: '云端恢复没有完成，请稍后重试。' });
            }
          }
        });
      }
    } catch (e) {
      // Revert on error
      setEvents(previousEvents);
      const msg = getSaveErrorMessage(e, '删除失败，请检查网络或账号配置');
      if (msg.includes('JWT expired')) {
        setSyncStatus('session-expired');
        showToast({ tone: 'error', message: '会话已过期，请重新登录', detail: '本次删除已回滚。' });
      } else {
        setSyncStatus('sync-error');
        showToast({ tone: 'error', message: '删除失败，已回滚。', detail: msg });
      }
      console.error(e);
    }
  }, [currentUser, activeUserIsDemo, dismissToast, events, showToast]);

  // Tag Management
  const handleAddTag = useCallback(async (label: string, color: string, icon: string) => {
    const newTag: Tag = { id: crypto.randomUUID(), label, color, icon };

    // Optimistic update
    const previousTags = tags;
    setTags(prev => [...prev, newTag]);
    setVisibleTags(prev => [...prev, newTag.id]); // Optimistically add to visible tags

    if (activeUserIsDemo) {
      const nextTags = [...previousTags, newTag];
      saveDemoTags(nextTags);
      showToast({ tone: 'success', message: 'Demo 标签已创建', detail: '数据仅保存在当前浏览器本地。' }, 3000);
      return;
    }

    if (!currentUser || !supabase) {
      // If not logged in, revert optimistic update and alert
      setTags(previousTags);
      setVisibleTags(prev => prev.filter(tagId => tagId !== newTag.id));
      alert('请登录后保存标签');
      return;
    }

    try {
      const saved = await createTagDB(currentUser.id, newTag);
      if (!saved) {
        // Revert on failure
        setTags(previousTags);
        setVisibleTags(prev => prev.filter(tagId => tagId !== newTag.id));
        alert('标签保存失败，请稍后重试');
        return;
      }
      // If the saved tag has a different ID or other properties, update it.
      // For now, we assume the ID is stable and other properties are as sent.
      // If `saved` contains more accurate data, you might replace `newTag` with `saved` here.
      // setTags(prev => prev.map(t => t.id === newTag.id ? saved : t));
    } catch (e) {
      setTags(previousTags);
      setVisibleTags(prev => prev.filter(tagId => tagId !== newTag.id));
      console.error(e);
      alert('标签保存失败');
    }
  }, [currentUser, activeUserIsDemo, tags, showToast]);

  const handleUpdateTag = useCallback(async (updatedTag: Tag) => {
    // Optimistic update
    const previousTags = tags;
    setTags(prev => prev.map(t => t.id === updatedTag.id ? updatedTag : t));

    if (activeUserIsDemo) {
      const nextTags = previousTags.map(t => t.id === updatedTag.id ? updatedTag : t);
      saveDemoTags(nextTags);
      showToast({ tone: 'success', message: 'Demo 标签已更新', detail: '数据仅保存在当前浏览器本地。' }, 3000);
      return;
    }

    if (!currentUser || !supabase) {
      setTags(previousTags); // Revert if not logged in
      alert('请登录后更新标签');
      return;
    }

    try {
      const saved = await updateTagDB(currentUser.id, updatedTag);
      if (!saved) {
        setTags(previousTags);
        alert('标签保存失败，请稍后重试');
        return;
      }
    } catch (e) {
      setTags(previousTags);
      console.error(e);
      alert('标签更新失败');
    }
  }, [currentUser, activeUserIsDemo, tags, showToast]);

  const handleDeleteTag = useCallback(async (id: string) => {
    const previousTags = tags;
    const previousEvents = events;
    const previousVisibleTags = visibleTags;
    const targetTag = tags.find(t => t.id === id);
    const affectedEvents = events.filter(e => e.category === id);

    if (affectedEvents.length > 0) {
      const confirmed = window.confirm(`确定要删除标签「${targetTag?.label || '该标签'}」吗？该标签下 ${affectedEvents.length} 条记录会归为未分类。`);
      if (!confirmed) return;
    }

    setTags(prev => prev.filter(t => t.id !== id));
    setVisibleTags(prev => prev.filter(tagId => tagId !== id));
    setEvents(prev => prev.map(e => e.category === id ? { ...e, category: '' } : e));

    if (activeUserIsDemo) {
      const nextTags = previousTags.filter(t => t.id !== id);
      const nextEvents = previousEvents.map(e => e.category === id ? { ...e, category: '' } : e);
      saveDemoTags(nextTags);
      saveDemoEvents(nextEvents);
      showToast({ tone: 'success', message: 'Demo 标签已删除', detail: '关联记录已归为未分类。' }, 3000);
      return;
    }

    if (!currentUser || !supabase) {
      setTags(previousTags);
      setEvents(previousEvents);
      setVisibleTags(previousVisibleTags);
      alert('请登录后删除标签');
      return;
    }

    let clearedEventIds: string[] = [];
    try {
      clearedEventIds = await clearEventCategory(currentUser.id, id);
      await deleteTagDB(currentUser.id, id);
    } catch (e) {
      setTags(previousTags);
      setEvents(previousEvents);
      setVisibleTags(previousVisibleTags);
      if (clearedEventIds.length > 0) {
        try {
          await restoreEventCategory(currentUser.id, clearedEventIds, id);
        } catch (restoreError) {
          console.error('恢复标签关联失败:', restoreError);
        }
      }
      const msg = e instanceof Error ? e.message : '标签删除失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, activeUserIsDemo, supabase, tags, events, visibleTags, showToast]);

  const handleToggleTagVisibility = useCallback((tagId: string) => {
    setVisibleTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleReorderTags = useCallback((newTags: Tag[]) => {
    setTags(newTags);
  }, []);

  const handleSaveTagOrder = useCallback(async (tagsToSave?: Tag[]) => {
    const orderedTags = tagsToSave ?? tags;
    try {
      if (activeUserIsDemo) {
        saveDemoTags(orderedTags);
        showToast({ tone: 'success', message: 'Demo 标签排序已保存', detail: '数据仅保存在当前浏览器本地。' }, 3000);
        return;
      }

      if (!currentUser) {
        try {
          localStorage.setItem('tag_order_guest', JSON.stringify(orderedTags.map(t => t.id)));
          alert('已保存在本地，登录后可云端同步');
          return;
        } catch (e) {
          console.error('Failed to save guest tag order locally:', e);
          alert('本地保存失败，请检查浏览器存储设置');
          return;
        }
      }
      await updateTagOrder(currentUser.id, orderedTags);
    } catch (e) {
      console.error('Failed to update tag order:', e);
      alert('排序保存失败，请检查网络');
      throw e;
    }
  }, [currentUser, activeUserIsDemo, tags, showToast]);

  const filteredEvents = useMemo(() => {
    if (visibleTags.length === 0) return [];
    return events.filter(event => visibleTags.includes(event.category));
  }, [events, visibleTags]);
  const hasHiddenAllTags = tags.length > 0 && visibleTags.length === 0;

  // Alarm Handlers
  const handleAlarmStart = () => {
    setAlarmState(prev => ({
      ...prev,
      status: 'running',
      startTime: Date.now()
    }));
  };

  const handleAlarmPause = () => {
    setAlarmState(prev => {
      if (prev.status !== 'running') return prev;
      const now = Date.now();
      const elapsed = now - prev.startTime;
      return {
        ...prev,
        status: 'paused',
        accumulatedTime: prev.accumulatedTime + elapsed,
        startTime: 0
      };
    });
  };

  const handleAlarmReset = () => {
    setAlarmState(prev => ({
      ...prev,
      status: 'idle',
      startTime: 0,
      accumulatedTime: 0
      // We keep mode and totalDuration unless explicitly changed
    }));
  };

  const handleSetAlarmMode = useCallback((mode: AlarmMode) => {
    setAlarmState({
      status: 'idle',
      mode: mode,
      startTime: 0,
      accumulatedTime: 0,
      totalDuration: 0
    });
  }, []);

  const handleSetTimerDuration = (duration: number) => {
    setAlarmState({
      status: 'idle',
      mode: 'timer',
      startTime: 0,
      accumulatedTime: 0,
      totalDuration: duration
    });
  };


  // 监听事件数据变化，自动备份到本地存储
  React.useEffect(() => {
    if (activeUserIsDemo) return;
    if (!currentUser || events.length === 0) return;
    
    // 自动备份事件数据到本地存储
    backupEventsToLocalStorage(currentUser.id, events);
    
    // 清理旧的备份数据
    cleanOldBackups(currentUser.id);
  }, [currentUser, activeUserIsDemo, events]);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('synced');
      showToast({ tone: 'success', message: '网络已恢复', detail: '可以继续同步日程。' }, 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline-cache');
      showToast({ tone: 'info', message: '当前离线', detail: '会优先使用本地缓存。' }, 3000);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  React.useEffect(() => {
    if (!supabase) return;
    if (activeUserIsDemo) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!activeUserIsDemo) setCurrentUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (activeUserIsDemo) return;
      setCurrentUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [activeUserIsDemo]);



  React.useEffect(() => {
    if (activeUserIsDemo) return;
    if (!currentUser) return;

    let mounted = true;
    const { startDate, endDate } = getVisibleDateRange(currentDate, viewMode, selectedDate);

    const loadData = async () => {
      try {
        const [initialTags, fetchedEvents] = await Promise.all([
          retry(() => fetchTagsDB(currentUser.id, 1, 50)),
          retry(() => fetchEvents(currentUser.id, startDate, endDate, undefined, { loadAll: true }))
        ]);

        if (mounted) {
          setTags(initialTags);
          setHasMoreTags(initialTags.length === 50);
          setVisibleTags(initialTags.map(t => t.id));
          setEvents(fetchedEvents);
          const cats = Array.from(new Set(fetchedEvents.map(e => e.category)));
          setVisibleTags(prev => Array.from(new Set([...prev, ...cats])));
          setIsOnline(true);
          setSyncStatus('synced');
          
          // 数据加载成功后，自动备份到本地存储
          backupEventsToLocalStorage(currentUser.id, fetchedEvents);
        }
      } catch (error: any) {
        if (mounted) {
          const msg = String(error?.message ?? '');
          const isNetworkError = 
            msg.includes('Failed to fetch') ||
            msg.includes('NetworkError') ||
            msg.includes('connection') ||
            msg.includes('ERR_CONNECTION_CLOSED') ||
            msg.includes('ERR_QUIC_PROTOCOL_ERROR') ||
            msg.includes('ERR_INTERNET_DISCONNECTED') ||
            msg.includes('ERR_ABORTED') ||
            msg.includes('AbortError');

          if (!isNetworkError) {
            console.error('Error loading data:', error);
          }

          if (isNetworkError) {
            setIsOnline(false);
            
            // 网络错误时，尝试从本地备份恢复数据
            const restoredData = restoreEventsFromLocalStorage(currentUser.id);
            if (restoredData?.events && restoredData.events.length > 0) {
              setEvents(restoredData.events);
              const cats = Array.from(new Set(restoredData.events.map(e => e.category)));
              setVisibleTags(prev => Array.from(new Set([...prev, ...cats])));
              setSyncStatus('offline-cache');
              showToast({ tone: 'info', message: '当前离线，已载入本地缓存。', detail: `${restoredData.events.length} 个日程可继续查看。` });
              console.log('从本地备份恢复了', restoredData.events.length, '个事件');
            } else {
              setSyncStatus('sync-error');
              showToast({ tone: 'error', message: '同步失败', detail: '当前离线且没有可用本地缓存。' });
            }
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [currentUser, activeUserIsDemo, reloadNonce, currentDate, viewMode, selectedDate, showToast]);

  const loadMoreTags = useCallback(async () => {
    if (activeUserIsDemo) return;
    if (!currentUser || !hasMoreTags) return;
    const nextPage = tagPage + 1;
    const newTags = await fetchTagsDB(currentUser.id, nextPage);
    if (newTags.length > 0) {
      setTags(prev => [...prev, ...newTags]);
      setTagPage(nextPage);
    }
    if (newTags.length < 50) {
      setHasMoreTags(false);
    }
  }, [currentUser, activeUserIsDemo, hasMoreTags, tagPage]);

  // 移除本地持久化，所有 UI 状态来源于数据库

  const handleDemoLogin = useCallback(() => {
    const demoTags = loadDemoTags();
    setIsDemoMode(true);
    setCurrentUser(DEMO_USER);
    setEvents(loadDemoEvents());
    setTags(demoTags);
    setVisibleTags(demoTags.map(t => t.id));
    setHasMoreTags(false);
    setTagPage(1);
    setIsAuthOpen(false);
    setIsAccountOpen(false);
    setSyncStatus('offline-cache');
    showToast({ tone: 'success', message: '已进入免登录 Demo', detail: '数据仅保存在当前浏览器本地，不读取 Supabase 账号数据。' }, 5000);
  }, [showToast]);

  const handleLogin = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) { return { ok: false, error: '未配置 Supabase' }; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { return { ok: false, error: '邮箱或密码错误' }; }
    const { data } = await supabase.auth.getSession();
    setIsDemoMode(false);
    setCurrentUser(data.session?.user ?? null);
    setIsAuthOpen(false);
    return { ok: true };
  };

  const handleRegister = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) { return { ok: false, error: '未配置 Supabase' }; }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const msg = /already/i.test(error.message) ? '该邮箱已注册，请直接登录' : error.message;
      return { ok: false, error: msg };
    }
    if (data.session) {
      const { data: s } = await supabase.auth.getSession();
      setIsDemoMode(false);
      setCurrentUser(s.session?.user ?? null);
      setIsAuthOpen(false);
      return { ok: true };
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      return { ok: false, error: '邮箱验证已开启，请完成验证后登录' };
    }
    const { data: s2 } = await supabase.auth.getSession();
    setIsDemoMode(false);
    setCurrentUser(s2.session?.user ?? null);
    setIsAuthOpen(false);
    return { ok: true };
  };



  const handleRestoreData = useCallback(async (restoredEvents: CalendarEvent[], restoredTags: Tag[]) => {
    if (activeUserIsDemo) {
      setEvents(restoredEvents);
      setTags(restoredTags);
      setVisibleTags(restoredTags.map(t => t.id));
      saveDemoEvents(restoredEvents);
      saveDemoTags(restoredTags);
      setSyncStatus('offline-cache');
      showToast({ tone: 'success', message: 'Demo 数据恢复完成', detail: `恢复 ${restoredEvents.length} 个日程、${restoredTags.length} 个标签。` });
      return;
    }

    if (currentUser) {
      const items = restoredEvents.map(e => ({ title: e.title, startTime: e.startTime, endTime: e.endTime, category: e.category, date: e.date }));
      const saved = await replaceAllEvents(currentUser.id, items);
      setEvents(saved);
    } else {
      setEvents(restoredEvents);
    }
    setTags(restoredTags);
    setVisibleTags(prev => {
      const newTagIds = restoredTags.map(t => t.id);
      return Array.from(new Set([...prev, ...newTagIds]));
    });
    setSyncStatus('synced');
    showToast({ tone: 'success', message: '数据恢复完成', detail: `恢复 ${restoredEvents.length} 个日程、${restoredTags.length} 个标签。` });
  }, [currentUser, activeUserIsDemo, showToast]);

  const handleImportEvents = useCallback(async (importedEvents: Partial<CalendarEvent>[]) => {
    // 1. Convert Partial<CalendarEvent> to full CalendarEvent
    // 2. Auto-match tags based on title or description if possible (simple logic for now)
    // 3. Merge with existing events

    const newEvents: CalendarEvent[] = importedEvents.map(evt => {
      // Try to find a matching tag
      let category = tags[0]?.id || 'default'; // Default to first tag

      if (evt.category) {
        // If category string matches a tag label, use that tag ID
        const matchedTag = tags.find(t => t.label === evt.category || t.id === evt.category);
        if (matchedTag) category = matchedTag.id;
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        title: evt.title || '无标题日程',
        startTime: evt.startTime || '09:00',
        endTime: evt.endTime || '10:00',
        date: evt.date || new Date(),
        category: category,
      };
    });

    const segmented = newEvents.flatMap(e => splitEventAcrossDays({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category,
      date: e.date,
    }));

    const isDup = (a: Omit<CalendarEvent, 'id'>, b: CalendarEvent) => (
      a.category === b.category &&
      isSameDay(a.date, b.date) &&
      a.startTime === b.startTime &&
      a.endTime === b.endTime &&
      a.title === b.title
    );

    const uniqueSegments = segmented.filter(ne => !events.some(ev => isDup(ne, ev)));

    if (uniqueSegments.length === 0) {
      showToast({ tone: 'info', message: '没有新日程可导入', detail: '文件中的日程可能已经存在。' });
      return;
    }

    const newCategories = Array.from(new Set(uniqueSegments.map(e => e.category)));
    setVisibleTags(prev => Array.from(new Set([...prev, ...newCategories])));

    if (activeUserIsDemo) {
      const localCreated = uniqueSegments.map(e => ({ ...e, id: `demo-${crypto.randomUUID()}` }));
      setEvents(prev => {
        const next = [...prev, ...localCreated];
        saveDemoEvents(next);
        return next;
      });
      setSyncStatus('offline-cache');
      showToast({ tone: 'success', message: 'Demo 导入完成', detail: `已导入 ${localCreated.length} 个日程，仅保存在本地。` });
      return;
    }

    if (!currentUser || !supabase) {
      const localCreated = uniqueSegments.map(e => ({ ...e, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
      setSyncStatus('offline-cache');
      showToast({ tone: 'info', message: '网络不可用，已保存到本地。', detail: `导入 ${localCreated.length} 个日程。` });
      return;
    }
    // 定义items变量，确保在catch块中也能访问
    const items = uniqueSegments.map(e => ({ title: e.title, startTime: e.startTime, endTime: e.endTime, category: e.category, date: e.date }));
    
    try {
      const saved = await createEvents(currentUser.id, items);
      if (!saved || saved.length === 0) {
        setSyncStatus('sync-error');
        showToast({ tone: 'error', message: '导入失败，已保存到本地。', detail: '云端同步稍后可重试。' });
        const localCreated = uniqueSegments.map(ev => ({ ...ev, id: crypto.randomUUID() }));
        setEvents(prev => [...prev, ...localCreated]);
        return;
      }
      await refreshEvents();
      setSyncStatus('synced');
      showToast({ tone: 'success', message: '导入完成', detail: `已导入 ${saved.length} 个日程。` });
    } catch (e: any) {
      console.error('Save failed:', e);
      let msg = e instanceof Error ? e.message : '保存失败，请检查网络或账号配置';

      // 处理JWT过期错误
      if (msg === 'JWT expired' || msg.includes('JWT expired')) {
        try {
          // 尝试自动刷新会话
          await supabase.auth.refreshSession();
          
          // 刷新成功后重新保存事件
          const saved = await createEvents(currentUser.id, items);
          if (saved && saved.length > 0) {
            await refreshEvents();
            setSyncStatus('synced');
            showToast({ tone: 'success', message: '导入完成', detail: `已导入 ${saved.length} 个日程。` });
            return;
          }
        } catch (refreshError) {
          console.error('JWT刷新失败:', refreshError);
          msg = '会话已过期，请重新登录';
          setSyncStatus('session-expired');
        }
      } else if (msg.includes('Failed to fetch')) {
        // Improve user experience for network errors
        msg = '网络连接异常，事件已保存到本地';
        setSyncStatus('offline-cache');
      } else {
        setSyncStatus('sync-error');
      }

      showToast({ tone: msg.includes('本地') ? 'info' : 'error', message: msg });

      const localCreated = uniqueSegments.map(ev => ({ ...ev, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
    }
  }, [currentUser, activeUserIsDemo, events, tags, refreshEvents, showToast]);

  return (
    <div className={`App board-app-shell ${isSidebarCollapsed ? 'sidebar-is-collapsed' : ''} relative min-h-screen w-full flex items-stretch md:items-center justify-center bg-[#F2F2F7] overflow-x-auto p-4 md:p-6`}>

      {/* Main Layout */}
      <div className={`main-layout board-main-layout relative z-10 w-full flex flex-col md:flex-row h-full md:h-auto transition-[gap,max-width] duration-300 ${isSidebarCollapsed ? 'max-w-none md:gap-0' : 'max-w-7xl md:gap-6'}`}>
        <div className="board-status-strip absolute flex items-center justify-end z-30">
          <span className="board-prototype-label">{activeUserIsDemo ? 'Demo 模式 · 本地数据' : 'Liquid Calendar Board Mock'}</span>
        </div>

        {/* Sidebar Navigation */}
        <Sidebar
          activeModule={activeModule}
          onSwitch={handleModuleSwitch}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenAccount={() => setIsAccountOpen(true)}
          onAddEvent={handleSmartAddEvent}
          onCalendarDetailsOpen={() => setIsMobileCalendarDetailsOpen(prev => !prev)}
          isLoggedIn={!!currentUser}
          isCollapsed={isSidebarCollapsed}
          profile={sidebarProfile}
          onProfileSave={handleSidebarProfileSave}
        />

        {/* Module Content */}
        <div className="board-module-content flex-1 min-w-0 min-h-0 relative flex flex-col h-full">
          {activeModule === 'calendar' && (
            <div className={`flex-1 ${!currentUser && events.length === 0 ? 'pointer-events-none opacity-60' : ''}`}>
              <Calendar
                events={filteredEvents}
                tags={tags}
                visibleTags={visibleTags}
                hasHiddenAllTags={hasHiddenAllTags}
                onToggleTagVisibility={handleToggleTagVisibility}
                onSmartAddEvent={handleSmartAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onOpenModal={openModal}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              viewMode={viewMode}
              setViewMode={setViewMode}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebarCollapsed={() => setIsSidebarCollapsed(prev => !prev)}
              isMobileDetailsOpen={isMobileCalendarDetailsOpen}
              onCloseMobileDetails={() => setIsMobileCalendarDetailsOpen(false)}
            />
              {!currentUser && events.length === 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                  <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 text-sm">请先登录以查看日程</div>
                </div>
              )}
            </div>
          )}
          {activeModule === 'alarm' && (
            <div className={`flex-1 ${!currentUser ? 'pointer-events-none opacity-60' : ''}`}>
              <Alarm
                alarmState={alarmState}
                onStart={handleAlarmStart}
                onPause={handleAlarmPause}
                onReset={handleAlarmReset}
                onSetMode={handleSetAlarmMode}
                onSetDuration={handleSetTimerDuration}
                onOpenLogSessionModal={openLogSessionModal}
              />
              {!currentUser && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                  <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 text-sm">请先登录以使用闹钟</div>
                </div>
              )}
            </div>
          )}
          {activeModule === 'history' && (
            <div className={`flex-1 ${!currentUser ? 'pointer-events-none opacity-60' : ''}`}>
              <History
                events={events}
                tags={tags}
                onOpenModal={openModal}
                onAddTag={handleAddTag}
                onUpdateTag={handleUpdateTag}
                onDeleteTag={handleDeleteTag}
                onReorderTags={handleReorderTags}
                onSaveOrder={handleSaveTagOrder}
              />
              {!currentUser && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                  <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 text-sm">请先登录以查看历史</div>
                </div>
              )}
            </div>
          )}
          {activeModule === 'diary' && (
            <div className={`flex-1 ${!currentUser ? 'pointer-events-none opacity-60' : ''}`}>
              <Diary
                userId={currentUser?.id}
                isDemoMode={activeUserIsDemo}
                demoEntries={DEMO_DIARY_ENTRIES}
                onWeeklyModeChange={setIsSidebarCollapsed}
              />
              {!currentUser && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                  <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 text-sm">请先登录以查看日记</div>
                </div>
              )}
            </div>
          )}
          {activeModule === 'chat' && (
            <div className="flex-1">
              <Chat
                events={events}
                tags={tags}
                currentDate={currentDate}
                userId={activeUserIsDemo ? undefined : currentUser?.id}
                demoDiaryEntries={activeUserIsDemo ? DEMO_DIARY_ENTRIES : undefined}
                demoStorageNamespace={activeUserIsDemo ? 'demo' : undefined}
                enableContextExport={activeUserIsDemo}
              />
            </div>
          )}
        </div>
      </div>

      {/* Global Modals */}
      <AddEventModal
        config={modalConfig}
        onClose={closeModal}
        onSave={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        tags={tags}
        onOpenCreateTagModal={openCreateTagModal}
        onEditTag={openEditTagModal}
        loadMoreTags={loadMoreTags}
        hasMoreTags={hasMoreTags}
      />

      <LogSessionModal
        isOpen={logSessionModalConfig.isOpen}
        onClose={closeLogSessionModal}
        onConfirm={handleLogSession}
        startTime={logSessionModalConfig.startTime}
        endTime={logSessionModalConfig.endTime}
        tags={tags}
        onOpenCreateTagModal={openCreateTagModal}
        loadMoreTags={loadMoreTags}
        hasMoreTags={hasMoreTags}
      />

      <CreateTagModal
        isOpen={isCreateTagModalOpen}
        onClose={closeCreateTagModal}
        onConfirm={handleAddTag}
        onDelete={handleDeleteTag}
        onUpdate={handleUpdateTag}
        initialTag={editingTag}
        mode={editingTag ? 'edit' : 'create'}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        events={events}
        tags={tags}
        onRestoreData={handleRestoreData}
        onImportEvents={handleImportEvents}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDemoLogin={handleDemoLogin}
      />

      <AccountModal
        isOpen={isAccountOpen}
        email={currentUser?.email}
        onClose={() => setIsAccountOpen(false)}
        onSignOut={async () => {
          if (activeUserIsDemo) {
            setIsDemoMode(false);
            setCurrentUser(null);
            setIsAccountOpen(false);
            setEvents(INITIAL_EVENTS);
            setTags(INITIAL_TAGS);
            setVisibleTags(INITIAL_TAGS.map(t => t.id));
            showToast({ tone: 'info', message: '已退出 Demo 模式', detail: '正式账号数据仍需登录后查看。' }, 3000);
            return;
          }
          if (!supabase) return;
          try {
            const { error } = await supabase.auth.signOut({ scope: 'global' } as any);
            if (error) {
              const msg = String(error?.message ?? '');
              if (
                msg.includes('AbortError') ||
                msg.includes('aborted') ||
                msg.includes('ERR_ABORTED') ||
                msg.includes('Failed to fetch') ||
                msg.includes('NetworkError') ||
                msg.includes('connection') ||
                msg.includes('ERR_CONNECTION_CLOSED')
              ) {
                console.warn('Sign out aborted or offline, proceeding with local cleanup.');
              } else {
                console.error('Sign out failed:', error);
              }
            }
          } catch (e: any) {
            const msg = String(e?.message ?? '');
            if (
              msg.includes('AbortError') ||
              msg.includes('aborted') ||
              msg.includes('ERR_ABORTED') ||
              msg.includes('Failed to fetch') ||
              msg.includes('NetworkError') ||
              msg.includes('connection') ||
              msg.includes('ERR_CONNECTION_CLOSED')
            ) {
              console.warn('Sign out aborted or offline, proceeding with local cleanup.');
            } else {
              console.error('Sign out error:', e);
            }
          } finally {
            try {
              Object.keys(localStorage).forEach((k) => {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                  localStorage.removeItem(k);
                }
              });
            } catch { }
            setIsAccountOpen(false);
            setCurrentUser(null);
            setEvents([]);
            setTags([]);
            setVisibleTags([]);
          }
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className={`toast-card toast-${toast.tone} rounded-2xl border bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-[slideInUp_0.25s_ease-out_forwards]`}>
            <div className="toast-dot h-2.5 w-2.5 rounded-full flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">{toast.message}</div>
              {toast.detail && <div className="text-xs text-gray-500 mt-0.5 truncate">{toast.detail}</div>}
            </div>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={toast.onAction}
                className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors"
              >
                {toast.actionLabel}
              </button>
            )}
            <button onClick={dismissToast} className="text-gray-400 hover:text-gray-700 transition-colors">
              <span className="sr-only">关闭提示</span>
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
