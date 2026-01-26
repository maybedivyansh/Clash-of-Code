
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { gameLogic } from '@/lib/server/gameLogic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, duration, rating, mode, code } = body; // mode: 'public', 'create_private', 'join_private'

        if (!userId || (!duration && mode !== 'join_private')) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Clean up any existing queue entry for this user
        await supabaseAdmin.from('matchmaking_queue').delete().eq('user_id', userId);

        if (mode === 'create_private') {
            const roomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
            const { error } = await supabaseAdmin.from('matchmaking_queue').insert({
                user_id: userId,
                duration,
                rating,
                room_id: roomCode,
                socket_id: 'api' // Placeholder
            });

            if (error) throw error;
            return NextResponse.json({ status: 'created', code: roomCode });
        }

        if (mode === 'join_private') {
            if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

            // Find Host
            const { data: host, error } = await supabaseAdmin
                .from('matchmaking_queue')
                .select('*')
                .eq('room_id', code)
                .maybeSingle();

            if (error || !host) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
            if (host.user_id === userId) return NextResponse.json({ error: 'Cannot join own room' }, { status: 400 });

            // Create Match
            const matchId = `match_private_${Date.now()}_${code}`;
            const question = await fetchRandomQuestion();
            if (!question) return NextResponse.json({ error: 'No questions available' }, { status: 500 });

            const matchData = {
                id: matchId,
                player1_id: host.user_id,
                player2_id: userId,
                duration: host.duration,
                status: 'active',
                p1_health: 100,
                p2_health: 100,
                question_id: question.id,
                created_at: new Date().toISOString()
            };

            await gameLogic.createMatch(matchData);

            // Remove host from queue
            await supabaseAdmin.from('matchmaking_queue').delete().eq('id', host.id);

            return NextResponse.json({
                status: 'found',
                matchId,
                opponentId: host.user_id,
                question,
                startTime: Date.now(),
                duration: host.duration,
                p1: { userId: host.user_id },
                p2: { userId: userId }
            });
        }

        // Public Matchmaking
        // Search for opponent
        const { data: opponent, error } = await supabaseAdmin
            .from('matchmaking_queue')
            .select('*')
            .eq('duration', duration)
            .is('room_id', null)
            .neq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (opponent) {
            // Match Found
            // Delete opponent from queue (Optimistic locking? Just delete for now)
            await supabaseAdmin.from('matchmaking_queue').delete().eq('id', opponent.id);

            const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const question = await fetchRandomQuestion();
            if (!question) return NextResponse.json({ error: 'No questions available' }, { status: 500 });

            const matchData = {
                id: matchId,
                player1_id: opponent.user_id,
                player2_id: userId,
                duration: duration,
                status: 'active',
                p1_health: 100,
                p2_health: 100,
                question_id: question.id,
                created_at: new Date().toISOString()
            };

            await gameLogic.createMatch(matchData);

            return NextResponse.json({
                status: 'found',
                matchId,
                opponentId: opponent.user_id,
                question,
                startTime: Date.now(),
                duration: duration,
                p1: { userId: opponent.user_id },
                p2: { userId: userId }
            });

        } else {
            // Join Queue
            const tableData = {
                user_id: userId,
                duration,
                rating,
                room_id: null,
                socket_id: 'api'
            };
            const { error: insertError } = await supabaseAdmin.from('matchmaking_queue').insert(tableData);
            if (insertError) {
                console.error(insertError);
                return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
            }
            return NextResponse.json({ status: 'queued' });
        }

    } catch (e) {
        console.error("Match API Error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function fetchRandomQuestion() {
    const { count } = await supabaseAdmin.from('questions').select('*', { count: 'exact', head: true });
    if (!count) return null;

    const randomIndex = Math.floor(Math.random() * count);
    const { data } = await supabaseAdmin.from('questions').select('*').range(randomIndex, randomIndex).maybeSingle();
    return data; // or data[0] if array? maybeSingle returns object or null. range returns array?
    // supabase-js .range returns array. .maybeSingle transforms it.
}
