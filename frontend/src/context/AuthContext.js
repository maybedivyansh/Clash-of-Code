'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guestId, setGuestId] = useState(null);

    useEffect(() => {
        // Check for Supabase Session
        const getSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;

                const sessionUser = data?.session?.user ?? null;
                setUser(sessionUser);

                // Self-healing: Ensure profile exists for existing session
                if (sessionUser) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', sessionUser.id)
                        .single();

                    if (!profile) {
                        const username = sessionUser.user_metadata?.username || sessionUser.email?.split('@')[0] || 'User';
                        await supabase
                            .from('users')
                            .insert([{
                                id: sessionUser.id,
                                username: username,
                                rating: 1000
                            }]);
                    }
                }
            } catch (err) {
                console.error("Auth Check Error:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // Load or Init Guest ID
        if (typeof window !== 'undefined') {
            const storedGuest = sessionStorage.getItem('coc_guest_id');
            if (storedGuest) {
                setGuestId(storedGuest);
            }
        }

        return () => subscription.unsubscribe();
    }, []);

    const loginAsGuest = useCallback(() => {
        const id = 'guest_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('coc_guest_id', id);
        setGuestId(id);
        return id;
    }, []);

    const getActiveUser = useCallback(() => {
        if (user) {
            return {
                id: user.id,
                username: user.user_metadata?.username || user.email?.split('@')[0],
                isGuest: false
            };
        }

        // Check state first, then fallback to storage to avoid race conditions
        let currentGuestId = guestId;
        if (!currentGuestId && typeof window !== 'undefined') {
            currentGuestId = sessionStorage.getItem('coc_guest_id');
        }

        if (currentGuestId) {
            return {
                id: currentGuestId,
                username: 'Guest_' + currentGuestId.substr(6),
                isGuest: true
            };
        }
        return null;
    }, [user, guestId]);

    return (
        <AuthContext.Provider value={{ user, guestId, loginAsGuest, getActiveUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
