
import { supabaseAdmin } from './supabaseAdmin.js';
import { executeCode } from './piston.js';
import { getRatingChange } from '../elo.js';

export class GameLogic {

    // Helper to get match state from DB
    async getMatchState(matchId) {
        const { data, error } = await supabaseAdmin
            .from('matches')
            .select(`
                *,
                questions (*)
            `)
            .eq('id', matchId)
            .single();

        if (error) return null;
        return data;
    }

    async createMatch(data) {
        // data: { id, player1_id, player2_id, duration, question_id, status: 'active', ... }
        const { error } = await supabaseAdmin.from('matches').insert(data);
        if (error) console.error("Create Match Error:", error);
        return !error;
    }

    // Check for timeout based on current time vs created_at + duration
    async checkTimeout(matchId, matchData) {
        // If already finished, ignore
        if (matchData.status !== 'active') return false;

        const startTime = new Date(matchData.created_at).getTime();
        const durationMs = matchData.duration * 60 * 1000;
        const endTime = startTime + durationMs;
        const now = Date.now();

        if (now > endTime) {
            // TIMEOUT
            console.log(`[GameLogic] Match ${matchId} Timeout.`);

            // Double Loss logic
            const delta = getRatingChange(matchData.duration, false);

            // Update Users
            await this.updateUserStats(matchData.player1_id, delta, false);
            await this.updateUserStats(matchData.player2_id, delta, false);

            // Update Match
            await supabaseAdmin.from('matches').update({
                status: 'timeout',
                winner_id: null,
                ended_at: new Date().toISOString()
            }).eq('id', matchId);

            return { isTimeout: true, delta };
        }
        return { isTimeout: false };
    }

    async handleSubmission(matchId, userId, code) {
        const match = await this.getMatchState(matchId);
        if (!match) return { error: 'Match not found' };

        // 1. Check Timeout
        const timeoutCheck = await this.checkTimeout(matchId, match);
        if (timeoutCheck.isTimeout) {
            return { error: 'Match Timed Out', action: 'timeout', delta: timeoutCheck.delta };
        }

        if (match.status !== 'active') {
            // Match is already finished for some reason (race condition)
            return { error: 'Match is already finished', action: 'finished' };
        }

        // 2. Identify Player
        const isP1 = match.player1_id === userId;
        const isP2 = match.player2_id === userId;
        if (!isP1 && !isP2) return { error: 'User not in match' };

        const myHealth = isP1 ? match.p1_health : match.p2_health;
        if (myHealth <= 0) return { error: 'You are eliminated' };

        // 3. Execute Code
        // Test cases are in match.questions.test_cases
        const result = await executeCode(code, match.questions.test_cases);

        let updates = {};
        let action = 'neutral';
        let eliminationResult = null;
        let newHealth = myHealth;

        // Check if the execution itself failed (e.g. server error, invalid config)
        if (result.error) {
            // Treat as a System/Runtime Error -> Apply damage? 
            // Or return error to user? 
            // If it's a code execution error (likely syntax or simple crash), it might come as result.error if piston.js catches it.
            // Let's treat it as a Runtime Error for game mechanics:
            console.log("Piston Execution Error treated as Runtime Error:", result.error);

            // Construct a "fake" result to fall through to runtime error logic
            // Or just handle directly:
            const damage = 10;
            newHealth = Math.min(100, Math.max(0, myHealth - damage));
            if (isP1) updates.p1_health = newHealth;
            else updates.p2_health = newHealth;

            // Check Self Death
            if (newHealth <= 0) {
                action = 'eliminated';
                eliminationResult = await this.eliminatePlayer(match, userId);
            }

            // We can attach the error message to the result so the frontend sees it
            result.results = [{ error: result.error, passed: false, input: "System", expected: "-", actual: "Error" }];
            result.allPassed = false;

        } else if (result.allPassed) {
            // VICTORY
            action = 'win';
            // Mark tests passed
            if (isP1) updates.p1_tests_passed = true;
            else updates.p2_tests_passed = true;

            // End Game Logic
            const endRes = await this.endGame(match, userId);
            return {
                result,
                action: 'win',
                ...endRes // winnerDelta, loserDelta, etc.
            };
        } else {
            // INCORRECT OR RUNTIME ERROR
            const hasRuntimeError = result.results.some(r => r.error);
            let damage = 0;
            let heal = 0;

            if (hasRuntimeError) {
                damage = 10;
            } else {
                const passedCount = result.results.filter(r => r.passed).length;
                if (passedCount > 0) heal = 5;
                else damage = 5;
            }

            newHealth = Math.min(100, Math.max(0, myHealth - damage + heal));

            if (isP1) updates.p1_health = newHealth;
            else updates.p2_health = newHealth;

            // Check Self Death
            if (newHealth <= 0) {
                action = 'eliminated';
                eliminationResult = await this.eliminatePlayer(match, userId);
            }
        }

        // Apply Updates to DB
        // We do this if not 'win' (win handles its own updates in endGame)
        if (action !== 'win') {
            await supabaseAdmin.from('matches').update(updates).eq('id', matchId);
        }

        return {
            result,
            action,
            gameState: { ...match, ...updates }, // Optimistic state
            eliminationResult
        };
    }

    async eliminatePlayer(match, loserId) {
        const delta = getRatingChange(match.duration, false);
        await this.updateUserStats(loserId, delta, false);

        // Check opponent health
        const isP1 = match.player1_id === loserId;
        const opponentHealth = isP1 ? match.p2_health : match.p1_health;

        if (opponentHealth <= 0) {
            // Double Loss
            await supabaseAdmin.from('matches').update({
                status: 'finished_double_loss',
                ended_at: new Date().toISOString()
            }).eq('id', match.id);
            return { matchOver: true, delta, type: 'double_loss' };
        }

        return { matchOver: false, delta, type: 'elimination' };
    }

    async endGame(match, winnerId) {
        const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id;

        const winnerDelta = getRatingChange(match.duration, true);
        const loserDelta = getRatingChange(match.duration, false);

        // Update Stats
        await this.updateUserStats(winnerId, winnerDelta, true);
        await this.updateUserStats(loserId, loserDelta, false);

        // Update Match
        await supabaseAdmin.from('matches').update({
            status: 'finished',
            winner_id: winnerId,
            ended_at: new Date().toISOString()
        }).eq('id', match.id);

        return { winnerDelta, loserDelta, winnerId, loserId };
    }

    async updateUserStats(userId, delta, isWin) {
        if (userId.startsWith('guest_')) return; // No stats for guests

        // We need to fetch current stats first to increment
        // Or use an RPC function if concurrency is high.
        // For now, fetch-and-update is okay for low volume.

        const { data: user } = await supabaseAdmin.from('users').select('rating, wins, losses').eq('id', userId).single();
        if (!user) return;

        const newRating = (user.rating || 800) + delta;
        const updates = {
            rating: newRating,
            wins: isWin ? (user.wins + 1) : user.wins,
            losses: !isWin ? (user.losses + 1) : user.losses
        };

        await supabaseAdmin.from('users').update(updates).eq('id', userId);
    }
}

export const gameLogic = new GameLogic();
