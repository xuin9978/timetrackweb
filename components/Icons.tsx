import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, Bell, MoreHorizontal, X, Timer, History, Settings, Tags, Hourglass, Filter, Check, PanelRight, PanelLeft, PieChart, Download, Trash, User, Lock, GripVertical, Sun, Moon, Sparkles, Copy, RefreshCw } from 'lucide-react';

const DayJourney: React.FC<{ size?: number; className?: string; strokeWidth?: number }> = ({
  size = 18,
  className,
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M4 16.5A8 8 0 0 1 20 16.5"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray="3 3"
    />
    <circle cx="12" cy="5" r="1.8" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 18H10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M5 18a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M19.5 14.5a4.5 4.5 0 1 0 0 7 4.4 4.4 0 0 1-4.9-4.9 4.4 4.4 0 0 0 4.9-2.1Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Icons = {
  ChevronLeft,
  ChevronRight,
  Calendar: CalendarIcon,
  Plus,
  Clock,
  Bell,
  MoreHorizontal,
  X,
  Timer,
  History,
  Settings,
  Tags,
  Stopwatch: Timer,
  Hourglass,
  Filter,
  Check,
  PanelRight,
  PanelLeft,
  PieChart,
  Download,
  Copy,
  RefreshCw,
  Trash,
  User,
  Lock,
  GripVertical,
  Sun,
  Moon,
  Sparkles,
  DayJourney
};
