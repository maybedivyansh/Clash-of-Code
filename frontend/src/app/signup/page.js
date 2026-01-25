'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { KeyRound, Mail, User, Loader2, ShieldCheck } from 'lucide-react';

const Signup = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }, // Store metadata
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // 2. Create entry in public users table
        if (authData.user) {
            // We'll trust the trigger or do it manually if trigger not set.
            // For MVP, manual insert is safer to ensure it exists immediately.
            const { error: dbError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    username: username,
                    rating: 1000
                }]);

            if (dbError) {
                console.error("Error creating user profile:", dbError);
                setError("Account created but profile setup failed. Please contact support or try logging in.");
                setLoading(false);
                return;
            }

            router.push('/matchmaking');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden font-sans selection:bg-purple-500/30">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-50%] right-[-50%] w-[1000px] h-[1000px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse"></div>
                <div className="absolute bottom-[-50%] left-[-50%] w-[1000px] h-[1000px] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse delay-1000"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-6">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                        INITIATE PROTOCOL
                    </h2>
                    <p className="text-gray-400">Register new operator credentials.</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                    {/* Decorative top border */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2 animate-shake">
                            <div className="w-1 h-8 bg-red-500 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Codename</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                                    placeholder="Neo"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email Coordinates</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                                    placeholder="neo@matrix.simulation"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Secure Passkey</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    REGISTER
                                    <ShieldCheck className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4 relative z-10">
                        <div className="text-sm text-gray-500">
                            Already operative? <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold hover:underline transition-colors">Access Terminal</Link>
                        </div>
                        <div>
                            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest">
                                ← Return to Base
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
