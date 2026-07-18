import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

interface SidebarProfile {
  name: string;
  tagline: string;
  avatarUrl?: string | null;
}

interface SidebarProps {
  activeModule: 'calendar' | 'alarm' | 'history' | 'diary';
  onSwitch: (module: 'calendar' | 'alarm' | 'history' | 'diary') => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
  onAddEvent?: () => void;
  onCalendarDetailsOpen?: () => void;
  isLoggedIn?: boolean;
  isCollapsed?: boolean;
  profile?: SidebarProfile;
  onProfileSave?: (profile: SidebarProfile) => Promise<void> | void;
}

const defaultProfile: SidebarProfile = {
  name: '用户',
  tagline: '添加一句个人签名',
  avatarUrl: null,
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSwitch, onOpenSettings, onOpenAuth, onOpenAccount, onAddEvent, onCalendarDetailsOpen, isLoggedIn, isCollapsed = false, profile = defaultProfile, onProfileSave }) => {
  const [profileName, setProfileName] = useState(profile.name || defaultProfile.name);
  const [profileTagline, setProfileTagline] = useState(profile.tagline || defaultProfile.tagline);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(profile.avatarUrl ?? null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { id: 'alarm', label: '闹钟', icon: Icons.Clock },
    { id: 'history', label: '历史', icon: Icons.History },
    { id: 'calendar', label: '日历', icon: Icons.Calendar },
    { id: 'diary', label: '日记', icon: Icons.BookOpen },
  ];

  const handleNavClick = (module: 'calendar' | 'alarm' | 'history' | 'diary') => {
    onSwitch(module);

    if (module !== 'calendar' || !onCalendarDetailsOpen) return;

    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      onCalendarDetailsOpen();
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setProfileName(profile.name || defaultProfile.name);
    setProfileTagline(profile.tagline || defaultProfile.tagline);
    setProfileAvatar(profile.avatarUrl ?? null);
  }, [profile.name, profile.tagline, profile.avatarUrl]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await onProfileSave?.({
        name: profileName.trim() || defaultProfile.name,
        tagline: profileTagline.trim() || defaultProfile.tagline,
        avatarUrl: profileAvatar,
      });
      setIsProfileEditorOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const profileEditor = (
    <div className="board-profile-modal-backdrop" onClick={() => setIsProfileEditorOpen(false)}>
      <div className="board-profile-modal" role="dialog" aria-modal="true" aria-label="编辑个人资料" onClick={(event) => event.stopPropagation()}>
        <div className="board-profile-popover-head">
          <span>编辑个人资料</span>
          <button type="button" onClick={() => setIsProfileEditorOpen(false)} aria-label="关闭个人资料编辑">
            <Icons.X size={15} />
          </button>
        </div>
        <button
          type="button"
          className="board-profile-avatar-editor"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="board-profile-avatar-preview">
            {profileAvatar ? <img src={profileAvatar} alt="" /> : (profileName || defaultProfile.name).slice(0, 1).toUpperCase()}
          </span>
          <span>添加或更换头像</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
        <label className="board-profile-field">
          <span>昵称</span>
          <input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={12} />
        </label>
        <label className="board-profile-field">
          <span>签名</span>
          <textarea value={profileTagline} onChange={(event) => setProfileTagline(event.target.value)} maxLength={28} />
        </label>
        <button type="button" className="board-profile-save" onClick={handleSaveProfile} disabled={isSavingProfile}>
          {isSavingProfile ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <GlassCard
        intensity="medium"
        className={`sidebar-container board-sidebar flex-shrink-0 w-full md:h-[85vh] flex flex-row md:flex-col items-center justify-center md:justify-start gap-8 p-4 md:pt-12 z-20 bg-white transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'md:w-0 md:min-w-0 md:max-w-0 md:p-0 md:gap-0 md:opacity-0 md:-translate-x-6 md:pointer-events-none sidebar-container-collapsed' : 'md:w-24 md:opacity-100 md:translate-x-0 sidebar-container-expanded'}`}
      >
      <button
        type="button"
        className="board-sidebar-brand"
        onClick={() => setIsProfileEditorOpen(true)}
        aria-label="编辑个人资料"
        title="编辑个人资料"
      >
        <div className="board-sidebar-avatar">
          {profileAvatar ? <img src={profileAvatar} alt="" /> : (profileName || defaultProfile.name).slice(0, 1).toUpperCase()}
        </div>
        <p className="board-sidebar-name">{profileName || defaultProfile.name}</p>
        <p className="board-sidebar-copy">{profileTagline || defaultProfile.tagline}</p>
      </button>

      <nav className="board-sidebar-nav" aria-label="主导航">
        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as 'calendar' | 'alarm' | 'history' | 'diary')}
              aria-label={item.label}
              title={item.label}
              className={`sidebar-nav-${item.id} board-sidebar-nav-button group flex flex-col items-center gap-2 relative transition-all duration-200 ${isActive ? 'is-active' : ''} ${isCollapsed ? 'md:gap-1.5' : ''}`}
            >
              <div className="board-sidebar-nav-icon">
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="board-sidebar-nav-label">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

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
      {isProfileEditorOpen && createPortal(profileEditor, document.body)}
    </>
  );
};

export default Sidebar;
