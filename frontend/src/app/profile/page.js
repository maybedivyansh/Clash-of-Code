'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Trophy, Swords, XCircle, Clock, ArrowLeft, Loader2, Calendar, User } from 'lucide-react';

const ProfilePage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [matches, setMatches] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                router.push('/login');
                return;
            }
            setUser(authUser);

            try {
                // Fetch from our new backend API
                // Assuming backend is on localhost:4000 based on previous context
                // In production this URL should be environmental
                const res = await fetch(`http://localhost:4000/api/user/${authUser.id}/profile`);

                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                    setMatches(data.matches);
                } else {
                    console.error("Failed to fetch profile");
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
                <p className="text-xl text-red-500">Could not load profile data.</p>
                <button
                    onClick={() => router.push('/matchmaking')}
                    className="px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                >
                    Return to Lobby
                </button>
            </div>
        );
    }

    const winRate = stats.wins + stats.losses > 0
        ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden p-6 md:p-12 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none fixed">
                <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen opacity-20"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen opacity-20"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Operator Profile
                        </h1>
                        <p className="text-cyan-400 font-mono tracking-widest text-sm mt-1">
                            ID: {stats.username || user.email?.split('@')[0]}
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-yellow-500/40 transition-all">
                        <div className="absolute -right-6 -bottom-6 text-yellow-500/10 group-hover:text-yellow-500/20 transition-colors">
                            <Trophy size={100} />
                        </div>
                        <div className="relative">
                            <p className="text-yellow-500 text-sm font-bold tracking-widest uppercase mb-1">ELO Rating</p>
                            <p className="text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.rating}</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-green-500/40 transition-all">
                        <div className="absolute -right-6 -bottom-6 text-green-500/10 group-hover:text-green-500/20 transition-colors">
                            <Swords size={100} />
                        </div>
                        <div className="relative">
                            <p className="text-green-500 text-sm font-bold tracking-widest uppercase mb-1">Victory Rate</p>
                            <p className="text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left">{winRate}%</p>
                            <p className="text-xs text-gray-400 mt-1">{stats.wins} Wins</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-red-500/40 transition-all">
                        <div className="absolute -right-6 -bottom-6 text-red-500/10 group-hover:text-red-500/20 transition-colors">
                            <XCircle size={100} />
                        </div>
                        <div className="relative">
                            <p className="text-red-500 text-sm font-bold tracking-widest uppercase mb-1">Total Losses</p>
                            <p className="text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.losses}</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
                        <div className="absolute -right-6 -bottom-6 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
                            <Clock size={100} />
                        </div>
                        <div className="relative">
                            <p className="text-blue-500 text-sm font-bold tracking-widest uppercase mb-1">Total Matches</p>
                            <p className="text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left">{stats.wins + stats.losses}</p>
                        </div>
                    </div>
                </div>

                {/* Match History */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold tracking-tight text-white/90 flex items-center gap-3">
                        <span className="w-1 h-8 bg-cyan-500 rounded-full shadow-[0_0_10px_#06b6d4]"></span>
                        Recent Operations
                    </h2>

                    <div className="grid gap-4">
                        {matches.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 text-gray-400">
                                No recent matches found. Initiate a battle to build your history.
                            </div>
                        ) : (
                            matches.map((match) => (
                                <div key={match.matchId} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all duration-300 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`
                                            w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl border shadow-lg
                                            ${match.result === 'WIN' ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-green-500/20' : ''}
                                            ${match.result === 'LOSS' ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-red-500/20' : ''}
                                            ${match.result === 'DRAW' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-yellow-500/20' : ''}
                                        `}>
                                            {match.result === 'WIN' ? 'W' : match.result === 'LOSS' ? 'L' : 'D'}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-gray-400 text-xs uppercase tracking-wider">VS</span>
                                                <span className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                                                    {match.opponentName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(match.date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {match.duration}m
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-xl font-bold font-mono 
                                            ${match.result === 'WIN' ? 'text-green-400' : ''}
                                            ${match.result === 'LOSS' ? 'text-red-400' : ''}
                                            ${match.result === 'DRAW' ? 'text-yellow-400' : ''}
                                        `}>
                                            {match.result}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
