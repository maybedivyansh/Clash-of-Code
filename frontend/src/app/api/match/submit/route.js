
import { NextResponse } from 'next/server';
import { gameLogic } from '@/lib/server/gameLogic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { matchId, userId, code } = body;

        if (!matchId || !userId || !code) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await gameLogic.handleSubmission(matchId, userId, code);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);

    } catch (e) {
        console.error("Submit API Error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
