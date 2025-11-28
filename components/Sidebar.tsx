import React from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

interface SidebarProps {
  activeModule: 'calendar' | 'alarm' | 'history';
  onSwitch: (module: 'calendar' | 'alarm' | 'history') => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  isLoggedIn?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSwitch, onOpenSettings, onOpenAuth, isLoggedIn }) => {
  const navItems = [
    { id: 'alarm', label: '闹钟', icon: Icons.Clock },
    { id: 'history', label: '历史', icon: Icons.History },
    { id: 'calendar', label: '日历', icon: Icons.Calendar },
  ];

  return (
    <GlassCard
      intensity="medium"
      className="flex-shrink-0 w-full md:w-24 md:h-[85vh] flex flex-row md:flex-col items-center justify-center md:justify-start gap-8 p-4 md:pt-12 z-20 bg-white"
    >
      {navItems.map((item) => {
        const isActive = activeModule === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSwitch(item.id as any)}
            className="group flex flex-col items-center gap-2 relative"
          >
            <div className={`
              w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300
              ${isActive
                ? 'bg-black text-white shadow-md scale-105'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              }
            `}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`
              text-[10px] font-medium tracking-wide transition-colors duration-300
              ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}
            `}>
              {item.label}
            </span>
          </button>
        );
      })}

      <div className="md:mt-auto pt-4 md:pt-0 border-l md:border-l-0 md:border-t border-gray-100 pl-4 md:pl-0 md:w-full flex flex-col items-center justify-center gap-3">
        {!isLoggedIn && (
          <button
            onClick={onOpenAuth}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black transition-all duration-300">
              <Icons.User size={20} />
            </div>
          </button>
        )}
        <button
          onClick={onOpenSettings}
          className="group flex flex-col items-center gap-2"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black transition-all duration-300">
            <Icons.Settings size={20} />
          </div>
        </button>
      </div>
    </GlassCard>
  );
};

export default Sidebar;
