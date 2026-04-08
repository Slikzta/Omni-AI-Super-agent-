import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, logout } from '../lib/firebase';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogIn, LogOut, Sparkles, MessageSquare, Image as ImageIcon, Video, Mic, Settings, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [user] = useAuthState(auth);

  const navItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'video', icon: Video, label: 'Video' },
    { id: 'live', icon: Mic, label: 'Live' },
    { id: 'integrations', icon: Share2, label: 'Integrations' },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl hidden md:block tracking-tight">OmniAgent</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-zinc-800 text-white shadow-inner" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                activeTab === item.id ? "text-purple-400" : ""
              )} />
              <span className="font-medium hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          {user ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-800/30">
              <Avatar className="w-8 h-8 border border-zinc-700">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 hidden md:block">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                <button 
                  onClick={logout}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={signInWithGoogle}
              variant="outline" 
              className="w-full gap-2 border-zinc-700 hover:bg-zinc-800"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden md:block">Sign In</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
