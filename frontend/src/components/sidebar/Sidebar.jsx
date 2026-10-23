import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { menuConfig } from './SidebarConfig.js';
import * as Icons from './Icons';

const FAV_KEY = 'sb_favorites';
const REC_KEY = 'sb_recents';
const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// Resolve icon name string → component
const getIcon = (name) => Icons[name] || Icons.FileText;

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ item, collapsed, favorites, onToggleFav, onNavigate }) {
  const isFav = favorites.includes(item.path);
  const ItemIcon = getIcon(item.icon);
  return (
    <NavLink
      to={item.path}
      onClick={() => onNavigate(item)}
      className={({ isActive }) =>
        'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium ' +
        'transition-all duration-150 cursor-pointer select-none border ' +
        (isActive
          ? 'bg-blue-600/25 text-white border-blue-500/30'
          : 'text-slate-300 hover:text-white hover:bg-white/10 border-transparent')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-400 rounded-full" />
          )}
          <span className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
            <ItemIcon size={15} />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFav(item.path); }}
                className={`shrink-0 transition-all ${isFav ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-400'}`}
              >
                <Icons.Star size={11} />
              </button>
            </>
          )}
          {collapsed && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-700 z-50 font-medium">
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── GroupSection ──────────────────────────────────────────────────────────────
function GroupSection({ group, collapsed, isOpen, onToggle, favorites, onToggleFav, onNavigate }) {
  const location = useLocation();
  const hasActive = group.items.some(i => i.path === location.pathname);
  const GIcon = getIcon(group.groupIcon);
  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 select-none ${hasActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
        title={collapsed ? group.group : undefined}
      >
        <span className={`shrink-0 ${hasActive ? 'text-blue-400' : 'text-slate-500'}`}>
          <GIcon size={14} />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-[12px] font-bold uppercase tracking-widest truncate">
              {group.group}
            </span>
            <span className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
              <Icons.ChevronRight size={12} />
            </span>
          </>
        )}
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen || collapsed ? `${group.items.length * 44}px` : '0px' }}
      >
        <div className={`space-y-0.5 pb-1 ${collapsed ? 'px-1' : 'pl-4 pr-1'}`}>
          {group.items.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed}
              favorites={favorites} onToggleFav={onToggleFav} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SidebarInner ──────────────────────────────────────────────────────────────
function SidebarInner({ role, user, onLogout, collapsed, setCollapsed, onClose }) {
  const location = useLocation();
  const searchRef = useRef(null);
  const groups = menuConfig[role] || menuConfig.student;
  const activeGroupIdx = groups.findIndex(g => g.items.some(i => i.path === location.pathname));

  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    groups.forEach((_, i) => { init[i] = i === activeGroupIdx || i === 0; });
    return init;
  });
  const [search,     setSearch]     = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [favorites,  setFavorites]  = useState(() => load(FAV_KEY, []));
  const [recents,    setRecents]    = useState(() => load(REC_KEY, []));

  useEffect(() => {
    if (activeGroupIdx >= 0) setOpenGroups(prev => ({ ...prev, [activeGroupIdx]: true }));
  }, [location.pathname, activeGroupIdx]);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  const toggleGroup = useCallback(i => {
    setOpenGroups(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { next[k] = false; });
      next[i] = !prev[i];
      return next;
    });
  }, []);

  const toggleFav = useCallback(path => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      save(FAV_KEY, next);
      return next;
    });
  }, []);

  const handleNavigate = useCallback(item => {
    setRecents(prev => {
      const next = [item, ...prev.filter(r => r.path !== item.path)].slice(0, 5);
      save(REC_KEY, next);
      return next;
    });
    setSearch('');
    setShowSearch(false);
    if (onClose) onClose();
  }, [onClose]);

  const allItems      = groups.flatMap(g => g.items);
  const favoriteItems = allItems.filter(i => favorites.includes(i.path));
  const searchResults = search.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const accentGradient = {
    admin: 'from-blue-500 to-cyan-400', teacher: 'from-emerald-500 to-teal-400',
    student: 'from-violet-500 to-purple-400', principal: 'from-amber-500 to-orange-400',
  }[role] || 'from-blue-500 to-cyan-400';

  const roleLabel = { admin: 'Administrator', teacher: 'Teacher', student: 'Student', principal: 'Principal' }[role] || role;

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #1a3a6b 0%, #1e4d8c 100%)' }}>

      {/* Header */}
      {/* Logo — always centered, always same size, no collapse button here */}
      <div className="flex items-center justify-center border-b border-white/15 shrink-0 h-24">
        <img src="/logo 1.png?v=9" alt="EK-Mikha" className="w-20 h-20 object-contain" />
      </div>

      {/* Search */}
      <div className={`px-3 mb-2 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && showSearch ? (
          <div className="flex items-center gap-2 bg-white/8 border border-white/12 rounded-lg px-2.5 py-1.5">
            <Icons.Search size={12} className="text-slate-400 shrink-0" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setShowSearch(false); } }}
              placeholder="Search modules..."
              className="flex-1 bg-transparent text-[13px] text-white placeholder:text-slate-500 outline-none" />
            <button onClick={() => { setSearch(''); setShowSearch(false); }} className="text-slate-400 hover:text-white">
              <Icons.X size={11} />
            </button>
          </div>
        ) : (
          <button onClick={() => { setShowSearch(true); if (setCollapsed) setCollapsed(false); }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all text-[13px] ${collapsed ? '' : 'w-full'}`}>
            <Icons.Search size={13} />
            {!collapsed && <span>Search modules...</span>}
          </button>
        )}
      </div>

      {/* Search results */}
      {search && !collapsed && (
        <div className="mx-3 mb-2 bg-slate-800/80 border border-white/10 rounded-lg overflow-hidden shrink-0">
          {searchResults.length > 0 ? (
            <>
              <p className="text-[10px] text-slate-400 px-3 pt-2 pb-1 font-bold uppercase tracking-widest">Results</p>
              {searchResults.map(item => {
                const ItemIcon = getIcon(item.icon);
                return (
                  <NavLink key={item.path} to={item.path} onClick={() => handleNavigate(item)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/10 text-slate-300 hover:text-white text-[12px] transition-all">
                    <ItemIcon size={13} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-3">No modules found</p>
          )}
        </div>
      )}

      {/* Pinned */}
      {!search && favoriteItems.length > 0 && !collapsed && (
        <div className="mx-3 mb-2 shrink-0">
          <p className="text-[10px] text-slate-400 px-1 mb-1 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Icons.Star size={10} /> Pinned
          </p>
          <div className="space-y-0.5">
            {favoriteItems.map(item => (
              <NavItem key={item.path} item={item} collapsed={false} favorites={favorites} onToggleFav={toggleFav} onNavigate={handleNavigate} />
            ))}
          </div>
        </div>
      )}

      {!search && favoriteItems.length > 0 && !collapsed && (
        <div className="mx-4 mb-2 border-t border-white/15 shrink-0" />
      )}

      {/* Main nav */}
      {!search && (
        <nav className="flex-1 overflow-y-auto px-2 pb-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {groups.map((group, i) => (
            <GroupSection key={group.group} group={group} collapsed={collapsed} isOpen={!!openGroups[i]}
              onToggle={() => toggleGroup(i)} favorites={favorites} onToggleFav={toggleFav} onNavigate={handleNavigate} />
          ))}
        </nav>
      )}

      {/* Collapse toggle + Sign out */}
      <div className={`shrink-0 border-t border-white/15 ${collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 flex flex-col gap-2'}`}>
        {/* Collapse toggle */}
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(p => !p)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-all duration-150 text-[13px] font-medium ${collapsed ? 'justify-center w-full' : 'w-full'}`}
          >
            {collapsed ? <Icons.ChevronRight size={14} /> : <><Icons.ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        )}
        {/* Sign out */}
        <button onClick={onLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150 text-[14px] font-medium ${collapsed ? 'justify-center' : ''}`}>
          <Icons.LogOut size={14} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Sidebar({ role, user, onLogout }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: collapsed ? '60px' : '252px' }}>
        <SidebarInner role={role} user={user} onLogout={onLogout}
          collapsed={collapsed} setCollapsed={setCollapsed} onClose={null} />
      </aside>

      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white shadow-xl">
        <span className="text-base font-bold leading-none">&#9776;</span>
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl">
            <SidebarInner role={role} user={user} onLogout={onLogout}
              collapsed={false} setCollapsed={null} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
