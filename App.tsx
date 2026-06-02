
import React, { useState, useMemo, useCallback } from 'react';
import Calendar from './components/Calendar';
import Alarm from './components/Alarm';
import History from './components/History';
import Sidebar from './components/Sidebar';
import AddEventModal from './components/AddEventModal';
import LogSessionModal from './components/LogSessionModal';
import CreateTagModal from './components/CreateTagModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { supabase } from './utils/supabaseClient';
import AccountModal from './components/AccountModal';
import { getVisibleDateRange, splitEventAcrossDays, isSameDay, formatTime, getMinutesFromTime, INITIAL_EVENTS, INITIAL_TAGS } from './utils/dateUtils';
import { fetchEvents, createEvents, updateEvent as updateEventDB, deleteEvent as deleteEventDB, replaceAllEvents } from './utils/eventService';
import { backupEventsToLocalStorage, restoreEventsFromLocalStorage, cleanOldBackups } from './utils/dataBackupService';
import { fetchTags as fetchTagsDB, createTag as createTagDB, updateTag as updateTagDB, deleteTag as deleteTagDB, updateTagOrder } from './utils/tagService';

import { CalendarEvent, Tag, ModalConfig, AlarmState, AlarmMode, LogSessionModalConfig, ViewMode } from './types';

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

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'calendar' | 'alarm' | 'history'>('calendar');




  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

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

  // Load initial mock data when not logged in
  React.useEffect(() => {
    if (!currentUser) {
      setEvents(INITIAL_EVENTS);
      setTags(INITIAL_TAGS);
      setVisibleTags(INITIAL_TAGS.map(t => t.id));
    }
  }, [currentUser]);

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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [reloadNonce, setReloadNonce] = useState(0);
  const loadIdRef = React.useRef(0);

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
    if (!currentUser) return;
    const { startDate, endDate } = getVisibleDateRange(currentDate, viewMode, selectedDate);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    const refreshed = await fetchEvents(currentUser.id, startDate, endDate, undefined, { loadAll: false });
    setEvents(refreshed);

    // Update visible tags with new categories found in refreshed events
    const cats = Array.from(new Set(refreshed.map(e => e.category)));
    setVisibleTags(prev => {
      const newCats = cats.filter(c => !prev.includes(c));
      return newCats.length ? [...prev, ...newCats] : prev;
    });


  }, [currentUser, currentDate, viewMode, selectedDate]);

  const handleAddEvent = useCallback(async (newEventData: Omit<CalendarEvent, 'id'>) => {
    const eventSegments = splitEventAcrossDays(newEventData);

    const newCategory = newEventData.category;
    if (newCategory) {
      setVisibleTags(prev => prev.includes(newCategory) ? prev : [...prev, newCategory]);
    }

    // Optimistic update: immediately add to UI with temporary IDs
    const optimisticEvents = eventSegments.map(seg => ({ ...seg, id: `temp-${crypto.randomUUID()}` }));
    setEvents(prev => [...prev, ...optimisticEvents]);

    if (!currentUser || !supabase) {
      return;
    }

    try {
      // Background save to database
      const created = await createEvents(currentUser.id, eventSegments);
      if (!created || created.length === 0) {
        // Revert optimistic update on failure
        setEvents(prev => prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id)));
        alert('保存失败，请稍后重试');
        return;
      }

      // Replace temporary IDs with real IDs from database
      setEvents(prev => {
        const filtered = prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id));
        return [...filtered, ...created];
      });
    } catch (e: any) {
      // 处理JWT过期错误
      if (e.message === 'JWT expired' || e.message?.includes('JWT expired')) {
        try {
          // 尝试自动刷新会话
          await supabase.auth.refreshSession();
          
          // 刷新成功后重新保存事件
          const created = await createEvents(currentUser.id, eventSegments);
          if (created && created.length > 0) {
            // 替换临时ID为真实ID
            setEvents(prev => {
              const filtered = prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id));
              return [...filtered, ...created];
            });
            return;
          }
        } catch (refreshError) {
          // 刷新失败，提示用户重新登录
          setEvents(prev => prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id)));
          alert('会话已过期，请重新登录');
          console.error('JWT刷新失败:', refreshError);
          return;
        }
      }
      
      // 其他错误处理
      setEvents(prev => prev.filter(e => !optimisticEvents.some(oe => oe.id === e.id)));
      const msg = e.message || '保存失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, splitEventAcrossDays]);

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
    if (!currentUser || !supabase) return;

    // Optimistic update: immediately update UI
    const previousEvents = events;
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));

    try {
      const saved = await updateEventDB(currentUser.id, updatedEvent);
      if (!saved) {
        // Revert on failure
        setEvents(previousEvents);
        alert('更新失败，请稍后重试');
        return;
      }
    } catch (e) {
      // Revert on error
      setEvents(previousEvents);
      const msg = e instanceof Error ? e.message : '更新失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, events]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!currentUser || !supabase) return;

    // Optimistic update: immediately remove from UI
    const previousEvents = events;
    setEvents(prev => prev.filter(e => e.id !== id));

    try {
      const ok = await deleteEventDB(currentUser.id, id);
      if (!ok) {
        // Revert on failure
        setEvents(previousEvents);
        alert('删除失败，请稍后重试');
        return;
      }
    } catch (e) {
      // Revert on error
      setEvents(previousEvents);
      const msg = e instanceof Error ? e.message : '删除失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, events]);

  // Tag Management
  const handleAddTag = useCallback(async (label: string, color: string, icon: string) => {
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || `tag-${Math.random().toString(36).slice(2, 8)}`;
    const newTag: Tag = { id: slug, label, color, icon };

    // Optimistic update
    const previousTags = tags;
    setTags(prev => [...prev, newTag]);
    setVisibleTags(prev => [...prev, newTag.id]); // Optimistically add to visible tags

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
  }, [currentUser, tags]);

  const handleUpdateTag = useCallback(async (updatedTag: Tag) => {
    // Optimistic update
    const previousTags = tags;
    setTags(prev => prev.map(t => t.id === updatedTag.id ? updatedTag : t));

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
  }, [currentUser, tags]);

  const handleDeleteTag = useCallback(async (id: string) => {
    // Optimistic update
    const previousTags = tags;
    setTags(prev => prev.filter(t => t.id !== id));
    setVisibleTags(prev => prev.filter(tagId => tagId !== id)); // Optimistically remove from visible tags
    // Optionally, re-categorize events that used this tag
    setEvents(prev => prev.map(e => e.category === id ? { ...e, category: tags[0]?.id || '' } : e));


    if (!currentUser || !supabase) {
      setTags(previousTags); // Revert if not logged in
      setVisibleTags(prev => [...prev, id]); // Revert visible tags
      alert('请登录后删除标签');
      return;
    }

    try {
      await deleteTagDB(currentUser.id, id);
    } catch (e) {
      setTags(previousTags);
      setVisibleTags(prev => [...prev, id]); // Revert visible tags
      const msg = e instanceof Error ? e.message : '标签删除失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, supabase, tags]);

  const handleToggleTagVisibility = useCallback((tagId: string) => {
    setVisibleTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleReorderTags = useCallback((newTags: Tag[]) => {
    setTags(newTags);
  }, []);

  const handleSaveTagOrder = useCallback(async () => {
    try {
      if (!currentUser) {
        try {
          localStorage.setItem('tag_order_guest', JSON.stringify(tags.map(t => t.id)));
          alert('已保存在本地，登录后可云端同步');
          return;
        } catch (e) {
          console.error('Failed to save guest tag order locally:', e);
          alert('本地保存失败，请检查浏览器存储设置');
          return;
        }
      }
      await updateTagOrder(currentUser.id, tags);
    } catch (e) {
      console.error('Failed to update tag order:', e);
      alert('排序保存失败，请检查网络');
      throw e;
    }
  }, [currentUser, tags]);

  const filteredEvents = useMemo(() => {
    if (visibleTags.length === 0) return events;
    return events.filter(event => visibleTags.includes(event.category));
  }, [events, visibleTags]);

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
    if (!currentUser || events.length === 0) return;
    
    // 自动备份事件数据到本地存储
    backupEventsToLocalStorage(currentUser.id, events);
    
    // 清理旧的备份数据
    cleanOldBackups(currentUser.id);
  }, [currentUser, events]);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);



  React.useEffect(() => {
    if (!currentUser) return;

    let mounted = true;
    const { startDate, endDate } = getVisibleDateRange(currentDate, viewMode, selectedDate);

    const loadData = async () => {
      try {
        const [initialTags, fetchedEvents] = await Promise.all([
          retry(() => fetchTagsDB(currentUser.id, 1, 50)),
          retry(() => fetchEvents(currentUser.id, startDate, endDate, undefined, { loadAll: false }))
        ]);

        if (mounted) {
          setTags(initialTags);
          setHasMoreTags(initialTags.length === 50);
          setVisibleTags(initialTags.map(t => t.id));
          setEvents(fetchedEvents);
          const cats = Array.from(new Set(fetchedEvents.map(e => e.category)));
          setVisibleTags(prev => Array.from(new Set([...prev, ...cats])));
          
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
              console.log('从本地备份恢复了', restoredData.events.length, '个事件');
            }
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [currentUser, reloadNonce, currentDate, viewMode, selectedDate]);

  const loadMoreTags = useCallback(async () => {
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
  }, [currentUser, hasMoreTags, tagPage]);

  // 移除本地持久化，所有 UI 状态来源于数据库

  const handleLogin = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) { return { ok: false, error: '未配置 Supabase' }; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { return { ok: false, error: '邮箱或密码错误' }; }
    const { data } = await supabase.auth.getSession();
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
      setCurrentUser(s.session?.user ?? null);
      setIsAuthOpen(false);
      return { ok: true };
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      return { ok: false, error: '邮箱验证已开启，请完成验证后登录' };
    }
    const { data: s2 } = await supabase.auth.getSession();
    setCurrentUser(s2.session?.user ?? null);
    setIsAuthOpen(false);
    return { ok: true };
  };



  const handleRestoreData = useCallback(async (restoredEvents: CalendarEvent[], restoredTags: Tag[]) => {
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
  }, [currentUser]);

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

    if (uniqueSegments.length === 0) { return; }

    const newCategories = Array.from(new Set(uniqueSegments.map(e => e.category)));
    setVisibleTags(prev => Array.from(new Set([...prev, ...newCategories])));

    if (!currentUser || !supabase) {
      const localCreated = uniqueSegments.map(e => ({ ...e, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
      return;
    }
    // 定义items变量，确保在catch块中也能访问
    const items = uniqueSegments.map(e => ({ title: e.title, startTime: e.startTime, endTime: e.endTime, category: e.category, date: e.date }));
    
    try {
      const saved = await createEvents(currentUser.id, items);
      if (!saved || saved.length === 0) {
        alert('导入失败，请稍后重试');
        const localCreated = uniqueSegments.map(ev => ({ ...ev, id: crypto.randomUUID() }));
        setEvents(prev => [...prev, ...localCreated]);
        return;
      }
      await refreshEvents();
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
            return;
          }
        } catch (refreshError) {
          console.error('JWT刷新失败:', refreshError);
          msg = '会话已过期，请重新登录';
        }
      } else if (msg.includes('Failed to fetch')) {
        // Improve user experience for network errors
        msg = '网络连接异常，事件已保存到本地';
      }

      alert(msg);

      const localCreated = uniqueSegments.map(ev => ({ ...ev, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
    }
  }, [currentUser, events, tags, refreshEvents]);

  return (
    <div className="App relative min-h-screen w-full flex items-stretch md:items-center justify-center bg-[#F2F2F7] overflow-x-auto p-4 md:p-6">

      {/* Main Layout */}
      <div className="main-layout relative z-10 w-full max-w-7xl flex flex-col md:flex-row md:gap-6 h-full md:h-auto">
        {!isOnline && (
          <div className="absolute -top-8 left-0 right-0 flex justify-center">
            <div className="px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-xs text-gray-600 flex items-center gap-2">
              <span>当前离线</span>
              <button onClick={() => setReloadNonce(n => n + 1)} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">重试</button>
            </div>
          </div>
        )}

        {/* Sidebar Navigation */}
        <Sidebar
          activeModule={activeModule}
          onSwitch={setActiveModule}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenAccount={() => setIsAccountOpen(true)}
          onAddEvent={handleSmartAddEvent}
          isLoggedIn={!!currentUser}
        />

        {/* Module Content */}
        <div className="flex-1 min-w-0 relative flex flex-col h-full">
          {activeModule === 'calendar' && (
            <div className={`flex-1 ${!currentUser && events.length === 0 ? 'pointer-events-none opacity-60' : ''}`}>
              <Calendar
                events={filteredEvents}
                tags={tags}
                visibleTags={visibleTags}
                onToggleTagVisibility={handleToggleTagVisibility}
                onAddEvent={handleAddEvent}
                onSmartAddEvent={handleSmartAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onOpenModal={openModal}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
              {!currentUser && events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify中心">
                  <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 text-sm">请先登录以查看日程</div>
                </div>
              )}
            </div>
          )}
          {activeModule === 'alarm' && (
            <Alarm
              alarmState={alarmState}
              onStart={handleAlarmStart}
              onPause={handleAlarmPause}
              onReset={handleAlarmReset}
              onSetMode={handleSetAlarmMode}
              onSetDuration={handleSetTimerDuration}
              onOpenLogSessionModal={openLogSessionModal}
            />
          )}
          {activeModule === 'history' && (
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
      />

      <AccountModal
        isOpen={isAccountOpen}
        email={currentUser?.email}
        onClose={() => setIsAccountOpen(false)}
        onSignOut={async () => {
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

    </div>
  );
};

export default App;
