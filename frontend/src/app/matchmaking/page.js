'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import socket from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Swords, Clock, User, ShieldAlert } from 'lucide-react';

const Matchmaking = () => {
    const router = useRouter();
    const { getActiveUser, loading } = useAuth();
    const [selectedDuration, setSelectedDuration] = useState(15);
    const [status, setStatus] = useState('idle'); // idle, searching, found, creating_room, setup_room
    const [opponentInfo, setOpponentInfo] = useState(null);
    const [matchCountdown, setMatchCountdown] = useState(5);

    // Private Room State
    const [roomCode, setRoomCode] = useState(null);
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (loading) return;

        const user = getActiveUser();
        if (!user) {
            router.push('/');
            return;
        }

        const onMatchFound = (data) => {
            console.log('Match found!', data);

            // Close any overlays
            setShowJoinInput(false);
            setRoomCode(null);

            // Save match data for Battle page
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('currentMatch', JSON.stringify(data));
            }

            setOpponentInfo({
                name: data.opponentIdentifier || 'Unknown Opponent',
                id: data.opponentId
            });
            setStatus('found');

            let count = 3;
            const interval = setInterval(() => {
                count--;
                setMatchCountdown(count);
                console.log("Match Countdown:", count);
                if (count <= 0) {
                    clearInterval(interval);
                    console.log("Redirecting to /battle...");
                    router.push('/battle');
                }
            }, 1000);
        };

        const onRoomCreated = ({ code }) => {
            setRoomCode(code);
            setStatus('creating_room');
        };

        const onRoomError = ({ message }) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
        };

        socket.on('match_found', onMatchFound);
        socket.on('private_room_created', onRoomCreated);
        socket.on('private_room_error', onRoomError);

        return () => {
            socket.off('match_found', onMatchFound);
            socket.off('private_room_created', onRoomCreated);
            socket.off('private_room_error', onRoomError);
        };
    }, [router, getActiveUser, loading]);

    const joinQueue = (duration) => {
        const user = getActiveUser();
        if (!user) return;

        setSelectedDuration(duration);
        setStatus('searching');
        socket.emit('join_queue', {
            userId: user.id,
            duration,
            isGuest: user.isGuest
        });
    };

    const createRoom = () => {
        const user = getActiveUser();
        if (!user || !selectedDuration) return;

        // Don't set status to searching, set specific room creation interaction logic handled by response
        socket.emit('create_private_room', {
            userId: user.id,
            duration: selectedDuration,
            rating: user.rating || 1000 // Send rating if available (guest 800) handled in backend
        });
    };

    const joinRoom = () => {
        const user = getActiveUser();
        if (!user || !joinCode) return;

        setError(null);
        socket.emit('join_private_room', {
            userId: user.id,
            code: joinCode,
            rating: user.rating || 1000
        });
    };

    if (loading) return null;

    const currentUser = getActiveUser();
    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-in-down">
                    <h1 className="text-6xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        BATTLE ARENA
                    </h1>
                    <p className="text-gray-400 text-lg uppercase tracking-widest font-mono">
                        Select match duration protocol
                    </p>
                </div>

                {/* Status: Searching */}
                {status === 'searching' && (
                    <div className="backdrop-blur-xl bg-black/60 border border-cyan-500/30 p-12 rounded-3xl flex flex-col items-center animate-pulse-glow shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden max-w-lg w-full">
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent"></div>

                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                            <Loader2 className="w-20 h-20 text-cyan-400 animate-spin relative z-10" />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">SCANNING NETWORK</h2>
                        <p className="text-cyan-400/80 font-mono mb-6">Looking for worthy opponents...</p>

                        <div className="flex gap-2 text-xs text-gray-500 uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full bg-black/40">
                            <span>Protocol: {selectedDuration}m</span>
                            <span>•</span>
                            <span>Region: Global</span>
                        </div>
                    </div>
                )}

                {/* Status: Found */}
                {status === 'found' && (
                    <div className="backdrop-blur-xl bg-green-900/10 border border-green-500/30 p-12 rounded-3xl flex flex-col items-center animate-bounce-in shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden max-w-lg w-full">
                        <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent"></div>

                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse"></div>
                            <Swords className="w-20 h-20 text-green-400 relative z-10" />
                        </div>

                        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">OPPONENT LOCATED</h2>
                        <div className="flex flex-col items-center gap-2 mb-8 w-full">
                            <div className="text-sm text-gray-400 uppercase tracking-widest">Target Identifier</div>
                            <div className="text-2xl font-bold text-green-300 bg-green-500/10 px-6 py-2 rounded-full border border-green-500/20">
                                {opponentInfo?.name || 'Unknown'}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-6xl font-black text-white mb-2 font-mono">{matchCountdown}</div>
                            <div className="text-green-500/80 text-xs uppercase tracking-[0.2em] animate-pulse">Deploying...</div>
                        </div>
                    </div>
                )}

                {/* Status: Idle */}
                {status === 'idle' && (
                    <div className="flex flex-col items-center w-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                            {[15, 30, 45].map(time => (
                                <button
                                    key={time}
                                    onClick={() => joinQueue(time)}
                                    className="group relative backdrop-blur-md bg-white/5 border border-white/10 p-8 rounded-2xl transition-all duration-300 hover:bg-cyan-900/20 hover:border-cyan-500/50 hover:scale-105 active:scale-95 flex flex-col items-center overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <Clock className="w-12 h-12 text-gray-600 group-hover:text-cyan-400 mb-6 transition-colors" />

                                    <div className="text-5xl font-black text-white mb-2 font-mono group-hover:text-cyan-100 transition-colors">
                                        {time}
                                    </div>
                                    <div className="text-sm font-bold text-gray-500 group-hover:text-cyan-400 tracking-[0.2em] transition-colors">
                                        MINUTES
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Room Options */}
                        <div className="flex gap-4 mt-8 w-full max-w-lg z-20 relative">
                            <button
                                onClick={() => setStatus('setup_room')}
                                className="flex-1 overflow-hidden relative group px-6 py-4 rounded-xl border border-white/10 transition-all bg-white/5 hover:bg-white/10 hover:border-cyan-500/50 cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                                    Create Room
                                </span>
                            </button>

                            <button
                                onClick={() => setShowJoinInput(true)}
                                className="flex-1 overflow-hidden relative group px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all"
                            >
                                <div className="absolute inset-0 bg-purple-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    Join Room
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Room Setup Modal (Duration Selection) */}
                {status === 'setup_room' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="border border-white/20 p-8 rounded-3xl w-full max-w-2xl relative shadow-2xl bg-black flex flex-col items-center">
                            <button
                                onClick={() => setStatus('idle')}
                                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>

                            <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">Room Configuration</h2>

                            <div className="grid grid-cols-3 gap-6 w-full mb-10">
                                {[15, 30, 45].map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedDuration(time)}
                                        className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center group
                                        ${selectedDuration === time
                                                ? 'bg-cyan-900/20 border-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:bg-white/10'}
                                    `}
                                    >
                                        <Clock className={`w-8 h-8 mb-4 ${selectedDuration === time ? 'text-cyan-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                        <div className="text-3xl font-black font-mono">{time}</div>
                                        <div className="text-[10px] font-bold tracking-[0.2em] mt-1">MINUTES</div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col items-center gap-2 mb-8 w-full">
                                <div className="text-gray-500 text-xs uppercase tracking-widest">Room Access Code</div>
                                <div className="text-4xl font-mono font-bold text-gray-700 tracking-[0.5em] select-none">
                                    XXXXX
                                </div>
                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                    (Generated upon creation)
                                </div>
                            </div>

                            <button
                                onClick={createRoom}
                                disabled={!selectedDuration}
                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all
                                ${selectedDuration
                                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                            `}
                            >
                                Generate Room
                            </button>
                        </div>
                    </div>
                )}

                {/* Room Waiting Screen */}
                {status === 'creating_room' && (
                    <div className="backdrop-blur-xl bg-black/80 border border-cyan-500/30 p-12 rounded-3xl flex flex-col items-center animate-zoom-in shadow-[0_0_50px_rgba(6,182,212,0.1)] relative max-w-lg w-full z-50">
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent"></div>
                        <h2 className="text-2xl font-black text-white mb-4 relative z-10">PRIVATE PROTOCOL INITIALIZED</h2>
                        <p className="text-gray-400 text-sm mb-6 font-mono text-center relative z-10">Share this access code with your opponent.</p>

                        <div className="bg-black/50 border border-cyan-500/50 px-8 py-4 rounded-xl text-4xl font-mono font-bold text-cyan-400 tracking-[0.5em] mb-8 relative z-10 shadow-[inner_0_0_20px_rgba(6,182,212,0.2)]">
                            {roomCode || '...'}
                        </div>

                        <div className="flex items-center gap-2 text-cyan-500/60 text-xs uppercase tracking-widest animate-pulse relative z-10">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Waiting for connection...
                        </div>

                        <button
                            onClick={() => { setStatus('idle'); setRoomCode(null); }}
                            className="mt-8 text-xs text-red-400 hover:text-red-300 underline relative z-10"
                        >
                            Abort Protocol
                        </button>
                    </div>
                )}

                {/* Join Room Input Overlay */}
                {showJoinInput && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-black border border-white/10 p-8 rounded-2xl w-full max-w-md relative shadow-2xl">
                            <button
                                onClick={() => setShowJoinInput(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                ✕
                            </button>
                            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Join Room</h2>
                            <input
                                type="text"
                                placeholder="ENTER 5-DIGIT CODE"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-purple-500 transition-colors uppercase mb-6"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                            />
                            <button
                                onClick={joinRoom}
                                disabled={joinCode.length !== 5}
                                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/20 disabled:text-gray-500 text-white font-bold py-4 rounded-lg transition-all"
                            >
                                ESTABLISH CONNECTION
                            </button>
                            {error && <p className="text-red-500 text-xs mt-4 text-center">{error}</p>}
                        </div>
                    </div>
                )}

                {/* Simulated Ticker */}
                <div className="mt-20 w-full max-w-2xl overflow-hidden border-t border-white/5 pt-6">
                    <div className="flex gap-8 animate-scroll text-xs text-gray-600 font-mono whitespace-nowrap">
                        <span className="flex items-center gap-2"><ShieldAlert className="w-3 h-3 text-red-500" /> SYSTEM: New Grandmaster promoted</span>
                        <span className="flex items-center gap-2"><User className="w-3 h-3 text-cyan-500" /> User_X just won a 15m match +25 ELO</span>
                        <span className="flex items-center gap-2"><User className="w-3 h-3 text-blue-500" /> Guest_99 joined the arena</span>
                        <span className="flex items-center gap-2"><ShieldAlert className="w-3 h-3 text-red-500" /> SYSTEM: Server capacity at 42%</span>
                    </div>
                </div>
            </div>

            {/* Footer Status */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-green-400 font-mono font-bold">ONLINE</span>
                </div>

                <button
                    onClick={() => router.push('/profile')}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all group"
                >
                    <User className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs font-monouppercase tracking-wider font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {currentUser.username}
                    </span>
                </button>
            </div>
        </div >
    );
};

export default Matchmaking;
