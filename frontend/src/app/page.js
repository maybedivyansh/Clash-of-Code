'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Code2, Trophy, Zap, Terminal, Globe, Users } from 'lucide-react';

const Landing = () => {
  const router = useRouter();
  const { user, loginAsGuest } = useAuth();

  const handleGuestPlay = () => {
    loginAsGuest();
    router.push('/matchmaking');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('coc_guest_id');
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-cyan-500/30 font-sans overflow-x-hidden relative flex flex-col items-center">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] mix-blend-screen opacity-20"></div>
        <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] mix-blend-screen opacity-20"></div>
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-md w-full">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-lg tracking-tight">ClashOf<span className="text-cyan-400">Code</span></span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group">
                  <span className="text-white font-mono font-bold group-hover:text-cyan-400 transition-colors">{user.user_metadata?.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 md:pt-48 md:pb-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-900/20 border border-cyan-500/20 text-cyan-400 text-xs md:text-sm font-mono mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          SYSTEM ONLINE // READY FOR BATTLE
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-8 tracking-tight leading-1.1 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 max-w-5xl drop-shadow-2xl">
          CODE. COMPETE. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">CONQUER.</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-2xl mb-12 leading-relaxed px-4">
          The ultimate 1v1 real-time implementation battleground.
          Prove your logic, strictly typed superiority.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
          {user ? (
            <button
              onClick={() => router.push('/matchmaking')}
              className="group relative w-full sm:w-auto px-8 py-4 bg-cyan-500 text-black font-bold text-lg rounded-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:shadow-[0_0_60px_rgba(34,211,238,0.6)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 fill-current" />
                ENTER ARENA
              </span>
            </button>
          ) : (
            <>
              <Link
                href="/signup"
                className="group relative w-full sm:w-auto px-8 py-4 bg-white text-black font-bold text-lg rounded-sm overflow-hidden transition-all hover:scale-105 active:scale-95 hover:bg-cyan-50 text-center"
              >
                <span className="relative flex items-center justify-center gap-2">
                  INITIATE SEQUENCE
                </span>
              </Link>
              <button
                onClick={handleGuestPlay}
                className="w-full sm:w-auto px-8 py-4 bg-transparent border border-gray-700 text-gray-300 font-bold text-lg rounded-sm hover:bg-gray-900 hover:border-gray-500 transition-all active:scale-95"
              >
                GUEST ACCESS
              </button>
            </>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-24 w-full px-2 max-w-6xl">
          <FeatureCard
            icon={<Globe className="w-8 h-8 text-blue-500 mx-auto" />}
            title="Real-Time Sync"
            desc="Low-latency WebSocket infrastructure ensures instant code updates and execution results."
          />
          <FeatureCard
            icon={<Trophy className="w-8 h-8 text-yellow-500 mx-auto" />}
            title="ELO Ranking"
            desc="Climb the global ladder. Start as a novice (800) and ascend to Grandmaster status."
          />
          <FeatureCard
            icon={<Code2 className="w-8 h-8 text-purple-500 mx-auto" />}
            title="Cyberpunk Editor"
            desc="Immersive Monaco-based environment tailored for focus and flow state."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/80 backdrop-blur py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-gray-600 text-sm">
          <div>© 2024 ClashOfCode Systems.</div>
          <div className="flex gap-4">
            <Users className="w-4 h-4" />
            <span>v1.0.0-alpha</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all hover:bg-white/10 backdrop-blur-sm group text-center flex flex-col items-center">
    <div className="mb-6 p-4 bg-black/40 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-white/5">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{title}</h3>
    <p className="text-gray-400 leading-relaxed">
      {desc}
    </p>
  </div>
);

export default Landing;
