
export interface Tag {
  id: string;
  label: string;
  color: string; // tailwind class
  icon?: string; // emoji
  order?: number; // for sorting
}

export interface CalendarEvent {
  id:string;
  title: string;
  startTime: string; 
  endTime: string;
  category: string; // References Tag.id
  date: Date;
  description?: string;
}

export interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

export enum ViewMode {
  Month = 'Month',
  Week = 'Week',
  Day = 'Day',
}

export interface DragSelection {
  startDate: Date;
  startTime: string;
  endTime: string;
  isDragging: boolean;
}

export interface ModalConfig {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    start: string;
    end: string;
    date: Date;
    event?: CalendarEvent;
  };
}

export type AlarmMode = 'stopwatch' | 'timer';

export interface AlarmState {
  status: 'idle' | 'running' | 'paused';
  mode: AlarmMode;
  startTime: number;
  accumulatedTime: number;
  totalDuration: number;
}

export interface LogSessionModalConfig {
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
  startDate?: Date;
  endDate?: Date;
}
