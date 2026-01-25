'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import socket from '@/lib/socket';
import CodeEditor from '@/components/Editor';
import HealthBar from '@/components/HealthBar';
import Timer from '@/components/Timer';
import OutputPanel from '@/components/OutputPanel';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Battle = () => {
    const router = useRouter();
    const { getActiveUser } = useAuth();

    const [matchData, setMatchData] = useState(null);
    const [userId, setUserId] = useState(null);

    const [code, setCode] = useState("# Write your code here\n");
    const [opponentCode, setOpponentCode] = useState("# Opponent is thinking...\n");
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Game State
    const [myHealth, setMyHealth] = useState(100);
    const [oppHealth, setOppHealth] = useState(100);

    useEffect(() => {
        // Hydrate from Session
        const user = getActiveUser();
        if (user) setUserId(user.id);

        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('currentMatch');
            if (stored) {
                const parsed = JSON.parse(stored);
                setMatchData(parsed);
                if (parsed.question?.starter_code) {
                    setCode(parsed.question.starter_code);
                }
            } else {
                router.push('/');
            }
        }
    }, [getActiveUser, router]);

    // Determine Identity
    const isPlayer1 = matchData && userId ? matchData.p1.userId === userId : false;

    useEffect(() => {
        if (!matchData || !userId) return;

        const onGameUpdate = (game) => {
            const me = game.p1.id === userId ? game.p1 : game.p2;
            const opp = game.p1.id === userId ? game.p2 : game.p1;
            setMyHealth(me.health);
            setOppHealth(opp.health);
        };

        const onExecutionResult = (res) => {
            setLoading(false);
            setOutput(res.results);
            setError(null);
        };

        const onExecutionError = (err) => {
            setLoading(false);
            setError(typeof err === 'string' ? err : 'Runtime Error');
        };

        const onGameOver = ({ winnerId, ratingChange }) => {
            console.log("OnGameOver Received:", { winnerId, ratingChange, type: typeof ratingChange });
            router.push(`/result?winnerId=${winnerId}&ratingChange=${ratingChange}`);
        };

        const onOpponentCodeUpdate = ({ code }) => {
            setOpponentCode(code);
        };

        socket.on('game_update', onGameUpdate);
        socket.on('execution_result', onExecutionResult);
        socket.on('execution_error', onExecutionError);
        socket.on('game_over', onGameOver);
        socket.on('opponent_code_update', onOpponentCodeUpdate);

        return () => {
            socket.off('game_update', onGameUpdate);
            socket.off('execution_result', onExecutionResult);
            socket.off('execution_error', onExecutionError);
            socket.off('game_over', onGameOver);
            socket.off('opponent_code_update', onOpponentCodeUpdate);
        };
    }, [matchData, router, userId]);

    // Emit code changes
    const handleCodeChange = (newCode) => {
        setCode(newCode);
        socket.emit('code_update', { matchId: matchData.matchId, code: newCode });
    };

    const handleRun = () => {
        if (!matchData) return;
        setLoading(true);
        setOutput(null);
        setError(null);
        socket.emit('submit_code', {
            matchId: matchData.matchId,
            userId,
            code
        });
    };

    if (!matchData || !userId) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-blue-500 font-mono flex-col gap-4">
                <div>Loading Battle Arena...</div>
            </div>
        );
    }

    const p1Code = isPlayer1 ? code : opponentCode;
    const p2Code = isPlayer1 ? opponentCode : code;

    const setP1Code = isPlayer1 ? handleCodeChange : () => { };
    const setP2Code = isPlayer1 ? () => { } : handleCodeChange;

    return (
        <div className="h-screen w-full flex bg-[#030712] text-white overflow-hidden font-sans relative selection:bg-cyan-500/30">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20 opacity-60"></div>
                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
            </div>

            {/* Main Layout: 2 Columns */}
            <div className="relative z-10 w-full h-full flex p-6 gap-6">

                {/* LEFT COLUMN (30% width): Question + Stats */}
                <div className="w-[30%] flex flex-col gap-6">

                    {/* Top-Left: Question (Flexible Height) */}
                    <div className="flex-1 bg-gray-950/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col relative group shadow-2xl hover:border-cyan-500/20 transition-all duration-500">
                        {/* Leave Button */}
                        <div className="absolute top-4 left-4 z-20">
                            <button
                                onClick={() => router.push('/')}
                                className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-red-500/20 hover:text-red-300 transition-all active:scale-95"
                            >
                                ← Forfeit
                            </button>
                        </div>

                        <div className="h-16 bg-white/5 border-b border-white/5 flex items-center justify-center select-none backdrop-blur-sm">
                            <span className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold flex items-center gap-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                                Mission Objective
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto p-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-cyan-500/50 transition-colors">
                            <h2 className="text-2xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight leading-tight">
                                {matchData.question.title}
                            </h2>
                            <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed font-light marker:text-cyan-500">
                                {matchData.question.description}
                            </div>
                        </div>
                    </div>

                    {/* Bottom-Left: Status Panel (Fixed Height) */}
                    <div className="h-72 bg-gray-950/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl group hover:border-cyan-500/20 transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        {/* Health Bars */}
                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Operator (You)</span>
                                    <span className="text-xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">{myHealth}%</span>
                                </div>
                                <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5 box-border p-[2px]">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                                        style={{ width: `${myHealth}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-2 opacity-80">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Adversary</span>
                                    <span className="text-xl font-black text-gray-400 tabular-nums">{oppHealth}%</span>
                                </div>
                                <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5 box-border p-[2px]">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                        style={{ width: `${oppHealth}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Timer */}
                        <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                                Time Remaining
                            </div>
                            <div className="text-3xl font-black text-white font-mono tracking-widest tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                <Timer endTime={matchData.endTime || (matchData.startTime + (matchData.duration * 60 * 1000))} onEnd={() => { }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (70% width): Code Editor */}
                <div className="flex-1 bg-gray-950/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col relative shadow-2xl hover:border-cyan-500/20 transition-all duration-500 group">
                    <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-6 justify-between w-full select-none backdrop-blur-sm">
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold flex items-center gap-3">
                            <span className="w-2 h-2 rounded-sm bg-cyan-500 rotate-45"></span>
                            Neural Link
                        </span>
                        <div className="flex items-center gap-4">
                            <div className="px-2 py-1 bg-green-500/10 rounded border border-green-500/20 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative bg-black/40">
                        <div className="absolute inset-0 p-1">
                            <CodeEditor
                                code={code}
                                setCode={handleCodeChange}
                                readOnly={false}
                            />
                        </div>

                        {/* Submit Button Floating */}
                        <div className="absolute bottom-8 right-8 z-30 flex gap-2">
                            <button
                                onClick={handleRun}
                                disabled={loading}
                                className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm uppercase tracking-widest transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed clip-path-slant"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <div className="relative flex items-center gap-3">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Execute</span>
                                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                                        </>
                                    )}
                                </div>
                                {/* Glow Effect */}
                                <div className="absolute -inset-2 bg-cyan-500/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                            </button>
                        </div>
                    </div>

                    {/* Output Terminal */}
                    {(output || error) && (
                        <div className="absolute bottom-24 right-8 left-8 max-h-64 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl p-0 overflow-hidden shadow-2xl z-20 font-mono text-sm ring-1 ring-white/5">
                            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5">
                                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2">
                                    <span className="text-cyan-500">❯</span> System Output
                                </span>
                                <button
                                    onClick={() => { setOutput(null); setError(null); }}
                                    className="text-gray-500 hover:text-white transition-colors p-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4 overflow-auto max-h-52">
                                <OutputPanel output={output} error={error} loading={loading} />
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Battle;
