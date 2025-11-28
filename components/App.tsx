
import React, { useState } from 'react';
import Calendar from './components/Calendar';
import Alarm from './components/Alarm';
import Sidebar from './components/Sidebar';
import AddEventModal from './components/AddEventModal';
import { INITIAL_EVENTS, INITIAL_TAGS, splitEventAcrossDays } from './utils/dateUtils';
import { CalendarEvent, Tag, ModalConfig } from './types';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'calendar' | 'alarm'>('calendar');
  
  // Shared State
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [tags, setTags] = useState<Tag[]>(INITIAL_TAGS);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    mode: 'create'
  });

  const openModal = (start = '09:00', end = '10:00', date = new Date(), event?: CalendarEvent) => {
    setModalConfig({
      isOpen: true,
      mode: event ? 'edit' : 'create',
      initialData: { start, end, date, event }
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleAddEvent = (newEventData: Omit<CalendarEvent, 'id'>) => {
    const eventSegments = splitEventAcrossDays(newEventData);
    const newEvents = eventSegments.map(segment => ({
        ...segment,
        id: Math.random().toString(36).substr(2, 9),
    }));
    setEvents(prev => [...prev, ...newEvents]);
  };

  const handleUpdateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Tag Management
  const handleAddTag = (label: string) => {
    const colors = ['bg-pink-400', 'bg-indigo-400', 'bg-teal-400', 'bg-yellow-400', 'bg-lime-400'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTag: Tag = {
      id: Math.random().toString(36).substr(2, 9),
      label,
      color: randomColor
    };
    setTags(prev => [...prev, newTag]);
  };

  const handleDeleteTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden p-2 md:p-4">
      
      {/* Ambient Background Blobs */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="blob-1 absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-900/40 mix-blend-screen blur-[80px] md:blur-[120px]" />
        <div className="blob-2 absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/40 mix-blend-screen blur-[80px] md:blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-cyan-900/20 mix-blend-screen blur-[60px] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Main Layout */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col md:flex-row gap-6 h-full md:h-auto">
        
        {/* Sidebar Navigation */}
        <Sidebar activeModule={activeModule} onSwitch={setActiveModule} />

        {/* Module Content */}
        <div className="flex-1 min-w-0">
          {activeModule === 'calendar' ? (
            <Calendar 
              events={events} 
              tags={tags}
              onAddEvent={handleAddEvent} 
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
              onOpenModal={openModal}
            />
          ) : (
            <Alarm 
              events={events}
              tags={tags}
              onOpenModal={openModal} 
            />
          )}
        </div>
      </div>

      {/* Global Add Event Modal */}
      <AddEventModal 
        config={modalConfig}
        onClose={closeModal}
        onSave={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        tags={tags}
        onAddTag={handleAddTag}
        onDeleteTag={handleDeleteTag}
      />

    </div>
  );
};

export default App;
