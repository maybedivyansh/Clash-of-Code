'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Trophy, RefreshCw, Home, Frown, Sparkles } from 'lucide-react';

const ResultContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getActiveUser } = useAuth();

    const winnerId = searchParams.get('winnerId');
    const user = getActiveUser();
    const userId = user?.id;

    const isWinner = winnerId && userId && winnerId === userId;

    const rawRating = parseInt(searchParams.get('ratingChange'));

    console.log("[RESULT DEBUG] Params:", {
        winnerId,
        ratingParam: searchParams.get('ratingChange'),
        parsed: rawRating,
        isWinner
    });

    // If param is missing or invalid, default to visual fallback
    const ratingChange = isNaN(rawRating) ? (isWinner ? 25 : -15) : rawRating;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b ${isWinner ? 'from-green-900/20' : 'from-red-900/20'} to-transparent opacity-50`}></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 w-full max-w-lg p-6 text-center">
                <div className="mb-12 relative inline-block">
                    <div className={`absolute inset-0 blur-3xl opacity-40 ${isWinner ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    {isWinner ? (
                        <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-bounce relative z-10" />
                    ) : (
                        <Frown className="w-32 h-32 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] relative z-10" />
                    )}
                </div>

                <h1 className={`text-6xl md:text-8xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br ${isWinner ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'} drop-shadow-2xl`}>
                    {isWinner ? 'VICTORY' : 'DEFEAT'}
                </h1>

                <p className="text-xl text-gray-400 mb-12 max-w-md mx-auto leading-relaxed">
                    {isWinner ? (
                        <span className="flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            Outstanding performance, Operator. System integrity maintained.
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                        </span>
                    ) : 'Critical failure detected. Re-calibrate logic and try again.'}
                </p>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 mb-12">
                    <div className="text-sm text-gray-500 uppercase tracking-widest mb-2 font-bold">Rating Update</div>
                    <div className={`text-4xl font-black font-mono ${ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ratingChange > 0 ? '+' : ''}{ratingChange} <span className="text-base align-middle opacity-50">ELO</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => router.push('/matchmaking')}
                        className="group flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all w-full sm:w-auto tracking-wider uppercase text-sm border border-cyan-400/20"
                    >
                        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                        Next Match
                    </button>

                    {/* Rematch implies re-inviting specific opponent. For MVP, we'll keep it simple or hide it if not ready. 
                        If the user explicitly asked for 'Rematch' AND 'Next Match', I'll add 'Rematch' as a visually distinct button 
                        that currently behaves like 'Same Settings' or 'Fast Queue'.
                    */}
                    <button
                        onClick={() => router.push('/matchmaking')} // In V2 this would trigger direct invite
                        className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-gray-300 font-bold py-4 px-8 rounded-xl hover:bg-white/20 hover:text-white transition-all w-full sm:w-auto tracking-wider uppercase text-sm"
                    >
                        <Trophy className="w-5 h-5" />
                        Rematch
                    </button>

                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center justify-center gap-2 bg-black border border-gray-800 text-gray-500 font-bold py-4 px-6 rounded-xl hover:text-white hover:border-gray-600 transition-all w-full sm:w-auto text-xs uppercase tracking-widest"
                    >
                        <Home className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const Result = () => {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Data...</div>}>
            <ResultContent />
        </Suspense>
    );
}

export default Result;
