const { executeCode } = require('./piston');
const { getRatingChange } = require('./elo');
const supabase = require('./supabase');

class GameLogic {
    constructor() {
        this.games = new Map(); // matchId -> GameState
    }

    async createGame(matchId, p1, p2, duration, question) {
        const gameState = {
            matchId,
            p1: { id: p1.userId, socketId: p1.socket.id, health: 100, testsPassed: false, rating: p1.rating },
            p2: { id: p2.userId, socketId: p2.socket.id, health: 100, testsPassed: false, rating: p2.rating },
            duration,
            startTime: Date.now(),
            endTime: Date.now() + duration * 60 * 1000,
            question,
            status: 'active'
        };

        this.games.set(matchId, gameState);

        // Persist Match Start
        console.log(`[DB-DEBUG] Assumed Match ID: ${matchId}`);
        console.log(`[DB-DEBUG] P1: ${p1.userId}, P2: ${p2.userId}`);

        try {
            // Ensure guests exist in DB
            if (p1.userId.startsWith('guest_')) {
                await this.ensureGuestUser(p1.userId);
            }
            if (p2.userId.startsWith('guest_')) {
                await this.ensureGuestUser(p2.userId);
            }

            const row = {
                id: matchId,
                player1_id: p1.userId,
                player2_id: p2.userId,
                duration: duration,
                status: 'active',
                p1_health: 100,
                p2_health: 100,
                question_id: question.id
            };
            console.log("[DB-DEBUG] Inserting:", row);

            const { data, error } = await supabase.from('matches').insert(row).select();

            if (error) {
                console.error("[DB-DEBUG] INSERT FAILED:", error);
            } else {
                console.log("[DB-DEBUG] INSERT SUCCESS:", data);
            }
        } catch (err) {
            console.error("[DB-DEBUG] EXCEPTION:", err);
        }

        return gameState;
    }

    getGame(matchId) {
        return this.games.get(matchId);
    }

    removeGame(matchId) {
        this.games.delete(matchId);
    }

    async eliminatePlayer(matchId, playerId) {
        const game = this.games.get(matchId);
        if (!game) return null;

        const playerKey = game.p1.id === playerId ? 'p1' : 'p2';
        const otherKey = playerKey === 'p1' ? 'p2' : 'p1';

        // 1. Apply Loss to the dying player
        const delta = getRatingChange(game.duration, false);
        console.log(`[ELO DEBUG] Player ${playerId} Eliminated. Delta: ${delta}`);

        try {
            if (!playerId.startsWith('guest_')) {
                await this.updateUserStats(playerId, delta, false);
            }
        } catch (e) { console.error("Elimination stats failed", e); }

        // 2. Check if other player is also dead or finished
        // If other player is dead/eliminated, then match ends (Double Loss)
        // If other player is still playing, match continues

        // Mark this player as dead in game state explicitly if needed, but health <= 0 is enough logic usually.
        // let's assume health <= 0 is the check.

        if (game[otherKey].health <= 0) {
            // Both dead. Match ends.
            game.status = 'finished';
            await supabase.from('matches').update({
                status: 'finished_double_loss', // or just finished
                winner_id: null,
                p1_health: game.p1.health,
                p2_health: game.p2.health
            }).eq('id', matchId);

            return { matchOver: true, delta };
        } else {
            // Match continues for the other guy
            // We just update the DB with current healths
            await supabase.from('matches').update({
                p1_health: game.p1.health,
                p2_health: game.p2.health
            }).eq('id', matchId);

            return { matchOver: false, delta };
        }
    }

    async handleSubmission(matchId, userId, code) {
        const game = this.games.get(matchId);
        if (!game || game.status !== 'active') return { error: 'Game not active' };

        const playerKey = game.p1.id === userId ? 'p1' : (game.p2.id === userId ? 'p2' : null);
        if (!playerKey) return { error: 'Player not in this game' };

        // Prevent dead player from submitting
        if (game[playerKey].health <= 0) {
            return { error: 'You have been eliminated.' };
        }

        const opponentKey = playerKey === 'p1' ? 'p2' : 'p1';

        // Execute Code
        const result = await executeCode(code, game.question.test_cases);

        let action = 'neutral';
        let eliminationResult = null;

        if (result.allPassed) {
            game[playerKey].testsPassed = true;
            action = 'win';
            // Handled by controller/socket.js
        } else {
            const hasRuntimeError = result.results.some(r => r.error);

            if (hasRuntimeError) {
                game[playerKey].health = Math.max(0, game[playerKey].health - 10);
            } else {
                const passedCount = result.results.filter(r => r.passed).length;
                if (passedCount > 0) {
                    game[playerKey].health = Math.min(100, game[playerKey].health + 5);
                } else {
                    game[playerKey].health = Math.max(0, game[playerKey].health - 5);
                }
            }

            // Sync Health to DB (lightweight)
            try {
                await supabase.from('matches').update({
                    p1_health: game.p1.health,
                    p2_health: game.p2.health
                }).eq('id', matchId);
            } catch (e) {
                console.error("Health update failed", e);
            }

            // Check if self died
            if (game[playerKey].health <= 0) {
                // Call elimination logic
                eliminationResult = await this.eliminatePlayer(matchId, userId);
                if (eliminationResult.matchOver) {
                    action = 'match_failed'; // input for socket to end for both (or just last guy)
                } else {
                    action = 'eliminated';
                }
            }
        }

        return {
            gameState: game,
            result,
            action,
            eliminationResult
        };
    }

    async handleTimeout(matchId) {
        const game = this.games.get(matchId);
        if (!game) return null;
        if (game.status === 'finished') return null;

        game.status = 'finished';

        // Calculate loss delta for both
        const delta = getRatingChange(game.duration, false);
        console.log(`[ELO DEBUG] Match ${matchId} TIMEOUT - Both Lose. Delta: ${delta}`);

        try {
            // Update stats for P1
            if (!game.p1.id.startsWith('guest_')) {
                await this.updateUserStats(game.p1.id, delta, false);
            }
            // Update stats for P2
            if (!game.p2.id.startsWith('guest_')) {
                await this.updateUserStats(game.p2.id, delta, false);
            }

            // Update match
            await supabase.from('matches').update({
                winner_id: null, // Double loss / Draw
                status: 'timeout',
                p1_health: game.p1.health,
                p2_health: game.p2.health
            }).eq('id', matchId);

            return { delta };
        } catch (e) {
            console.error("Timeout update failed", e);
            return null;
        }
    }

    async endGame(matchId, winnerId) {
        const game = this.games.get(matchId);
        if (!game) return;
        if (game.status === 'finished') return; // Prevent double end

        game.status = 'finished';

        const loserId = game.p1.id === winnerId ? game.p2.id : game.p1.id;
        const winnerIsGuest = winnerId.startsWith('guest_');
        const loserIsGuest = loserId.startsWith('guest_');

        const winnerDelta = getRatingChange(game.duration, true);
        const loserDelta = getRatingChange(game.duration, false);

        console.log(`[ELO DEBUG] Match ${matchId} | Duration: ${game.duration} | WinnerDelta: ${winnerDelta} | LoserDelta: ${loserDelta}`);

        console.log(`Game Over: ${matchId}. Winner: ${winnerId}`);

        try {
            // Persist to DB only for real users
            if (!winnerIsGuest) {
                await this.updateUserStats(winnerId, winnerDelta, true);
            }
            if (!loserIsGuest) {
                await this.updateUserStats(loserId, loserDelta, false);
            }

            // Update match status
            await supabase.from('matches').update({
                winner_id: winnerId,
                status: 'finished',
                p1_health: game.p1.health,
                p2_health: game.p2.health
            }).eq('id', matchId);

            return {
                winnerDelta,
                loserDelta,
                winnerId,
                loserId
            };

        } catch (e) {
            console.error("Failed to update stats", e);
            return null;
        }
    }

    async updateUserStats(userId, delta, isWin) {
        const { data: user, error } = await supabase
            .from('users')
            .select('rating, wins, losses')
            .eq('id', userId)
            .single();

        if (user) {
            const currentRating = user.rating !== null ? user.rating : 800; // Default 800 if null
            const newRating = currentRating + delta;
            console.log(`[ELO] Updating ${userId}: ${currentRating} -> ${newRating} (Delta: ${delta})`);

            const updates = {
                rating: newRating,
                wins: isWin ? (user.wins + 1) : user.wins,
                losses: !isWin ? (user.losses + 1) : user.losses
            };
            await supabase.from('users').update(updates).eq('id', userId);
        } else {
            console.error(`[ELO] User ${userId} not found or no SELECT permission!`);
        }
    }

    async ensureGuestUser(userId) {
        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: userId,
                    username: 'Guest',
                    rating: 800,
                    wins: 0,
                    losses: 0
                })
                .select();

            if (error) console.error("Failed to upsert guest:", error);
        } catch (e) {
            console.error("Exception upserting guest:", e);
        }
    }
}

module.exports = new GameLogic();
