import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request, { params }) {
    const { userId } = await params;

    try {
        // 1. Fetch User Stats
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('username, rating, wins, losses')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Fetch Match History
        // We need matches where player1_id = userId OR player2_id = userId
        const { data: matches, error: matchError } = await supabaseAdmin
            .from('matches')
            .select(`
                id,
                player1_id,
                player2_id,
                winner_id,
                duration,
                created_at,
                status
            `)
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (matchError) {
            console.error(matchError);
            return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
        }

        // 3. Format Matches for Frontend
        const formattedMatches = await Promise.all(matches.map(async (m) => {
            const isP1 = m.player1_id === userId;
            const opponentId = isP1 ? m.player2_id : m.player1_id;

            // Fetch Opponent Name (Optimization: Could batch this or join, but for MVP separate queries are fine/safer with RLS/Admin)
            // Actually, querying via admin is fast.
            let opponentName = 'Unknown';
            if (opponentId) {
                const { data: opp } = await supabaseAdmin.from('users').select('username').eq('id', opponentId).single();
                if (opp) opponentName = opp.username;
            }

            let result = 'DRAW';
            if (m.winner_id) {
                result = m.winner_id === userId ? 'WIN' : 'LOSS';
            } else if (m.status === 'finished_double_loss') {
                result = 'LOSS';
            }

            return {
                matchId: m.id,
                result,
                opponentName,
                date: m.created_at,
                duration: m.duration
            };
        }));

        return NextResponse.json({
            stats: user,
            matches: formattedMatches
        });

    } catch (e) {
        console.error("Profile API Error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
