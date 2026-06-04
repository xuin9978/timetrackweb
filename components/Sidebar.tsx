import React from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

interface SidebarProps {
  activeModule: 'calendar' | 'alarm' | 'history';
  onSwitch: (module: 'calendar' | 'alarm' | 'history') => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
  onAddEvent?: () => void;
  isLoggedIn?: boolean;
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
  isCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSwitch, onOpenSettings, onOpenAuth, onOpenAccount, onAddEvent, isLoggedIn, colorMode, onToggleColorMode, isCollapsed = false }) => {
  const navItems = [
    { id: 'alarm', label: '闹钟', icon: Icons.Clock },
    { id: 'history', label: '历史', icon: Icons.History },
    { id: 'calendar', label: '日历', icon: Icons.Calendar },
  ];
  const ModeIcon = colorMode === 'dark' ? Icons.Sun : Icons.Moon;

  return (
    <GlassCard
      intensity="medium"
      className={`sidebar-container flex-shrink-0 w-full md:h-[85vh] flex flex-row md:flex-col items-center justify-center md:justify-start gap-8 p-4 md:pt-12 z-20 bg-white transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'md:w-0 md:min-w-0 md:max-w-0 md:p-0 md:gap-0 md:opacity-0 md:-translate-x-6 md:pointer-events-none sidebar-container-collapsed' : 'md:w-24 md:opacity-100 md:translate-x-0 sidebar-container-expanded'}`}
    >
      {navItems.map((item) => {
        const isActive = activeModule === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSwitch(item.id as any)}
            aria-label={item.label}
            title={item.label}
            className={`sidebar-nav-${item.id} group flex flex-col items-center gap-2 relative transition-all duration-200 ${isCollapsed ? 'md:gap-1.5' : ''}`}
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
              text-[10px] font-medium tracking-wide transition-all duration-300 whitespace-nowrap
              ${isCollapsed ? 'md:max-h-0 md:opacity-0 md:translate-y-1 md:pointer-events-none' : 'md:max-h-4 md:opacity-100'}
              ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}
            `}>
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        onClick={onToggleColorMode}
        aria-label={colorMode === 'dark' ? '切换到白天模式' : '切换到晚上模式'}
        className={`sidebar-theme-toggle group flex flex-col items-center gap-2 relative transition-all duration-200 ${isCollapsed ? 'md:gap-1.5' : ''}`}
      >
        <div className={`
          w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 active:scale-95
          ${colorMode === 'dark'
            ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-300'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }
        `}>
          <ModeIcon size={21} strokeWidth={2.2} />
        </div>
        <span className={`
          text-[10px] font-medium tracking-wide transition-all duration-300 whitespace-nowrap
          ${isCollapsed ? 'md:max-h-0 md:opacity-0 md:translate-y-1 md:pointer-events-none' : 'md:max-h-4 md:opacity-100'}
          ${colorMode === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}
        `}>
          {colorMode === 'dark' ? '白天' : '晚上'}
        </span>
      </button>

      {/* Add Event Button - Visible in PWA/Mobile via CSS ordering, or Desktop as extra action */}
      {onAddEvent && (
        <button
          onClick={onAddEvent}
          aria-label="添加日程"
          title="添加日程"
          className={`sidebar-add-button group flex flex-col items-center gap-2 relative md:hidden transition-all duration-200 ${isCollapsed ? 'md:gap-1.5' : ''}`}
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all duration-300 active:scale-95 hover:rotate-90">
            <Icons.Plus size={24} strokeWidth={2.5} />
          </div>
          {/* Label hidden in PWA mode via global CSS, but visible otherwise? 
              Actually user wants PWA labels hidden. 
              Let's add a label for consistency but it will be hidden by the same rule.
          */}
          <span className="text-[10px] font-medium tracking-wide text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
            添加
          </span>
        </button>
      )}

      <div className={`sidebar-actions md:mt-auto pt-4 md:pt-0 border-l md:border-l-0 md:border-t border-gray-100 pl-4 md:pl-0 md:w-full flex flex-col items-center justify-center gap-3 transition-all duration-200 ${isCollapsed ? 'md:pl-0 md:gap-2' : ''}`}>
        <button
          onClick={isLoggedIn ? onOpenAccount : onOpenAuth}
          aria-label={isLoggedIn ? '打开账户' : '登录或注册'}
          title={isLoggedIn ? '账户' : '登录或注册'}
          className="group flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
            <Icons.User size={20} />
          </div>
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="打开设置"
          title="设置"
          className="group flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all duration-300">
            <Icons.Settings size={20} />
          </div>
        </button>
      </div>
    </GlassCard>
  );
};

export default Sidebar;
