
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
import { getVisibleDateRange, splitEventAcrossDays, isSameDay, INITIAL_EVENTS, INITIAL_TAGS } from './utils/dateUtils';
import { fetchEvents, createEvents, updateEvent as updateEventDB, deleteEvent as deleteEventDB, replaceAllEvents } from './utils/eventService';
import { fetchTags as fetchTagsDB, createTag as createTagDB, updateTag as updateTagDB, deleteTag as deleteTagDB, updateTagOrder } from './utils/tagService';
import { syncTags } from './utils/syncService';
import { CalendarEvent, Tag, ModalConfig, AlarmState, AlarmMode, LogSessionModalConfig, ViewMode } from './types';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'calendar' | 'alarm' | 'history'>('calendar');
  const isDev = import.meta.env?.DEV ?? false;

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);

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
    const refreshed = await fetchEvents(currentUser.id, startDate, endDate);
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

    if (!currentUser || !supabase) {
      const localCreated = eventSegments.map(seg => ({ ...seg, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
      const cats = Array.from(new Set(localCreated.map(e => e.category)));
      setVisibleTags(prev => {
        const newCats = cats.filter(c => !prev.includes(c));
        return newCats.length ? [...prev, ...newCats] : prev;
      });
      return;
    }
    try {
      const created = await createEvents(currentUser.id, eventSegments);
      if (!created || created.length === 0) {
        alert('保存失败，请稍后重试');
        const localCreated = eventSegments.map(seg => ({ ...seg, id: crypto.randomUUID() }));
        setEvents(prev => [...prev, ...localCreated]);
        return;
      }
      
      // 增强数据同步：获取最新数据
      await refreshEvents();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
      const localCreated = eventSegments.map(seg => ({ ...seg, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
      const cats = Array.from(new Set(localCreated.map(e => e.category)));
      setVisibleTags(prev => {
        const newCats = cats.filter(c => !prev.includes(c));
        return newCats.length ? [...prev, ...newCats] : prev;
      });
    }
  }, [currentUser, refreshEvents]);

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
    if (!currentUser) { alert('请先登录'); return; }
    if (!supabase) { alert('未配置 Supabase'); return; }
    try {
      const saved = await updateEventDB(currentUser.id, updatedEvent);
      if (!saved) return;
      await refreshEvents();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '更新失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, refreshEvents]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!currentUser) { alert('请先登录'); return; }
    if (!supabase) { alert('未配置 Supabase'); return; }
    try {
      const ok = await deleteEventDB(currentUser.id, id);
      if (!ok) return;
      await refreshEvents();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '删除失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, refreshEvents]);

  // Tag Management
  const handleAddTag = useCallback(async (label: string, color: string, icon: string) => {
    if (!currentUser || !supabase) { alert('请先登录'); return; }
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || `tag-${Math.random().toString(36).slice(2, 8)}`;
    const newTag: Tag = { id: slug, label, color, icon };
    try {
      const saved = await createTagDB(currentUser.id, newTag);
      if (!saved) { alert('标签保存失败，请稍后重试'); return; }
      setTags(prev => [...prev, saved]);
      setVisibleTags(prev => [...prev, saved.id]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '标签保存失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, supabase]);

  const handleUpdateTag = useCallback(async (updatedTag: Tag) => {
    if (!currentUser || !supabase) { alert('请先登录'); return; }
    try {
      const saved = await updateTagDB(currentUser.id, updatedTag);
      if (!saved) { alert('标签保存失败，请稍后重试'); return; }
      setTags(prev => prev.map(t => t.id === saved.id ? saved : t));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '标签更新失败，请检查网络或账号配置';
      alert(msg);
      console.error(e);
    }
  }, [currentUser, supabase]);

  const handleDeleteTag = useCallback(async (id: string) => {
    if (!currentUser || !supabase) { alert('请先登录'); return; }
    try {
      await deleteTagDB(currentUser.id, id);
      setTags(prev => prev.filter(t => t.id !== id));
      // Also remove the tag from visible tags
      setVisibleTags(prev => prev.filter(tagId => tagId !== id));
      // Optionally, re-categorize events that used this tag
      setEvents(prev => prev.map(e => e.category === id ? { ...e, category: tags[0]?.id || '' } : e));
    } catch (e) {
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

  const retry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> => {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        const msg = String(err?.message ?? '');
        if (err?.name === 'AbortError' || /AbortError|aborted/i.test(msg)) throw err;
        attempt++;
        if (attempt > retries) throw err;
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt - 1)));
      }
    }
  };

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

    const controller = new AbortController();
    const signal = controller.signal;
    const myId = ++loadIdRef.current;

    // Add 300ms debounce to prevent aborted requests on rapid navigation
    const timerId = setTimeout(async () => {
      try {
        const { startDate, endDate } = getVisibleDateRange(currentDate, viewMode, selectedDate);

        const [initialTags, fetchedEvents] = await Promise.all([
          retry(() => fetchTagsDB(currentUser.id, 1, 50, signal)),
          retry(() => fetchEvents(currentUser.id, startDate, endDate, signal))
        ]);

        if (!signal.aborted && loadIdRef.current === myId) {
          setTags(initialTags);
          setHasMoreTags(initialTags.length === 50);
          setVisibleTags(initialTags.map(t => t.id));
          setEvents(fetchedEvents);
          const cats = Array.from(new Set(fetchedEvents.map(e => e.category)));
          setVisibleTags(prev => Array.from(new Set([...prev, ...cats])));
        }
      } catch (error: any) {
        const msg = String(error?.message ?? '');
        const aborted = signal.aborted || /AbortError|aborted/i.test(msg) || (error?.name === 'AbortError');
        if (!aborted) {
          console.error('Error loading data:', error);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timerId);
      controller.abort();
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
      setIsAuthOpen(false);
      return { ok: true };
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      return { ok: false, error: '邮箱验证已开启，请完成验证后登录' };
    }
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

    const isDup = (a: Omit<CalendarEvent,'id'>, b: CalendarEvent) => (
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
    try {
      const items = uniqueSegments.map(e => ({ title: e.title, startTime: e.startTime, endTime: e.endTime, category: e.category, date: e.date }));
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
      
      // Improve user experience for network errors
      if (msg.includes('Failed to fetch')) {
        msg = '网络连接异常，事件已保存到本地';
      }

      alert(msg);
      
      const localCreated = uniqueSegments.map(ev => ({ ...ev, id: crypto.randomUUID() }));
      setEvents(prev => [...prev, ...localCreated]);
    }
  }, [currentUser, events, tags, refreshEvents]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F2F2F7] overflow-x-auto p-2 md:p-6">

      {currentUser && (
        <button onClick={() => setIsAccountOpen(true)} className="absolute top-2 right-4 z-30 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-sm text-black">
          {currentUser.email}
        </button>
      )}

      {/* Main Layout */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col md:flex-row gap-6 h-full md:h-auto">
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
          isLoggedIn={!!currentUser}
        />

        {/* Module Content */}
        <div className="flex-1 min-w-0 relative">
          {activeModule === 'calendar' && (
            <div className={!currentUser && !isDev && events.length === 0 ? 'pointer-events-none opacity-60' : ''}>
              <Calendar
                events={filteredEvents}
                tags={tags}
                visibleTags={visibleTags}
                onToggleTagVisibility={handleToggleTagVisibility}
                onAddEvent={handleAddEvent}
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
              {!currentUser && !isDev && events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
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
                } catch {}
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
