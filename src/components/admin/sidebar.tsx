'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, Database, MessageSquare, Users, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'User Management', href: '/dashboard/users', icon: Users },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Audit Trail', href: '/dashboard/audit', icon: ShieldAlert },
  { name: 'Queries', href: '/dashboard/queries', icon: Database },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  // Make sure we handle exactly matching /dashboard or matching subroutes
  const checkActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-white/5 glass flex flex-col h-screen fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <span className="text-primary-foreground font-bold tracking-tighter">R</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">Admin Portal</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4 mt-2 px-3">Main Menu</div>
        {navItems.map((item) => {
          const isActive = checkActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                isActive 
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
              )}
              <item.icon className={cn('h-4 w-4 transition-colors', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Link
          href="/chat"
          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-300 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 hover:border-indigo-500/30 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4" />
            Live Preview
          </div>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        </Link>
      </div>
    </aside>
  );
}
