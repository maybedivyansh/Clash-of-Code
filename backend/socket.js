const matchmaker = require('./matchmaker');
const gameLogic = require('./gameLogic');
const supabase = require('./supabase');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_queue', async ({ userId, duration, isGuest }) => {
            let rating = 800;

            if (isGuest) {
                rating = 800; // Guest default
            } else {
                // Fetch real rating from DB
                const { data, error } = await supabase
                    .from('users')
                    .select('rating')
                    .eq('id', userId)
                    .single();

                if (data) rating = data.rating;
            }

            // DB Matchmaking
            // matchmaker.findMatch returns a Match Object if found, or null if queued.
            const match = await matchmaker.findMatch(socket, userId, duration, rating);

            if (match) {
                // Fetch a random question
                // Fetch random question (Count-based strategy)
                const { count, error: countError } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact', head: true });

                if (countError || count === 0) {
                    console.error("No questions found or count error!", countError);
                    return;
                }

                const randomIndex = Math.floor(Math.random() * count);
                const { data: questions, error } = await supabase
                    .from('questions')
                    .select('*')
                    .range(randomIndex, randomIndex)
                    .maybeSingle();

                if (error || !questions) {
                    console.error("Error fetching random question", error);
                    return;
                }

                const question = questions; // maybeSingle returns object, or range(x,x) returns array of 1? 
                // range returns array. so if we used maybeSingle with range... 
                // wait, range returns array. maybeSingle is for no rows.
                // Let's stick to standard array access to be safe:
                // Actually safer:
                // .range(randomIndex, randomIndex) returns [question]

                // Let's refine the query:
                // const { data: randomQ } = await supabase.from('questions').select('*').range(randomIndex, randomIndex);
                // const question = randomQ[0];

                const game = await gameLogic.createGame(match.matchId, match.p1, match.p2, duration, question);

                // Notify players
                // Note: opponent socket object (waitingData.socket_id) is just { id: ... } mock 
                // We need to send to that ID via io

                io.to(match.p1.socket.id).emit('match_found', {
                    matchId: match.matchId,
                    opponentId: match.p2.userId,
                    opponentIdentifier: match.p2.userId.startsWith('guest_') ? 'Guest' : (match.p2.rating ? `Ranked (${match.p2.rating})` : 'Player 2'),
                    question,
                    startTime: game.startTime,
                    endTime: game.endTime,
                    duration: game.duration,
                    p1: { userId: match.p1.userId, rating: match.p1.rating, id: match.p1.userId }, // Send sanitized P1
                    p2: { userId: match.p2.userId, rating: match.p2.rating, id: match.p2.userId }  // Send sanitized P2
                });
                io.to(match.p2.socket.id).emit('match_found', {
                    matchId: match.matchId,
                    opponentId: match.p1.userId,
                    opponentIdentifier: match.p1.userId.startsWith('guest_') ? 'Guest' : (match.p1.rating ? `Ranked (${match.p1.rating})` : 'Player 1'),
                    question,
                    startTime: game.startTime,
                    endTime: game.endTime,
                    duration: game.duration,
                    p1: { userId: match.p1.userId, rating: match.p1.rating, id: match.p1.userId }, // Send sanitized P1
                    p2: { userId: match.p2.userId, rating: match.p2.rating, id: match.p2.userId }  // Send sanitized P2
                });

                console.log(`Match started: ${match.matchId}`);

                // Start Game Timer
                const timeoutMs = duration * 60 * 1000;
                setTimeout(async () => {
                    const timeoutResult = await gameLogic.handleTimeout(match.matchId);
                    if (timeoutResult) {
                        const { delta } = timeoutResult;
                        console.log(`[SOCKET] Match ${match.matchId} timed out. Sending double loss.`);

                        // Notify both players of defeat
                        // We send winnerId: null so frontend shows 'Defeat' (or similar)
                        // We send negative rating change
                        io.to(match.p1.socket.id).emit('game_over', { winnerId: null, ratingChange: delta });
                        io.to(match.p2.socket.id).emit('game_over', { winnerId: null, ratingChange: delta });
                    }
                }, timeoutMs);
            }
        });

        socket.on('create_private_room', async ({ userId, duration, rating }) => {
            const code = await matchmaker.createPrivateRoom(socket, userId, duration, rating);
            if (code) {
                socket.emit('private_room_created', { code });
            } else {
                socket.emit('private_room_error', { message: 'Failed to create room.' });
            }
        });

        socket.on('join_private_room', async ({ userId, code, rating }) => {
            const result = await matchmaker.joinPrivateRoom(socket, userId, code, rating);

            if (result.error) {
                socket.emit('private_room_error', { message: result.error });
            } else if (result.match) {
                const match = result.match;

                // Fetch random question (Count-based strategy)
                supabase.from('questions').select('*', { count: 'exact', head: true })
                    .then(async ({ count, error: countError }) => {
                        if (countError || count === 0) { return; }

                        const randomIndex = Math.floor(Math.random() * count);
                        const { data: randomQ } = await supabase
                            .from('questions')
                            .select('*')
                            .range(randomIndex, randomIndex);

                        if (!randomQ || randomQ.length === 0) return;

                        const question = randomQ[0];
                        const game = await gameLogic.createGame(match.matchId, match.p1, match.p2, match.duration, question);

                        // Notify players
                        io.to(match.p1.socket.id).emit('match_found', {
                            matchId: match.matchId,
                            opponentId: match.p2.userId,
                            opponentIdentifier: 'Challenger', // Private room specific?
                            question,
                            startTime: game.startTime,
                            endTime: game.endTime,
                            duration: game.duration,
                            p1: { userId: match.p1.userId, rating: match.p1.rating, id: match.p1.userId },
                            p2: { userId: match.p2.userId, rating: match.p2.rating, id: match.p2.userId }
                        });
                        io.to(match.p2.socket.id).emit('match_found', {
                            matchId: match.matchId,
                            opponentId: match.p1.userId,
                            opponentIdentifier: 'Room Host',
                            question,
                            startTime: game.startTime,
                            endTime: game.endTime,
                            duration: game.duration,
                            p1: { userId: match.p1.userId, rating: match.p1.rating, id: match.p1.userId },
                            p2: { userId: match.p2.userId, rating: match.p2.rating, id: match.p2.userId }
                        });

                        console.log(`Private Match started: ${match.matchId}`);

                        // Start Timer
                        const timeoutMs = match.duration * 60 * 1000;
                        setTimeout(async () => {
                            // Timeout logic same as above
                            const timeoutResult = await gameLogic.handleTimeout(match.matchId);
                            if (timeoutResult) {
                                const { delta } = timeoutResult;
                                io.to(match.p1.socket.id).emit('game_over', { winnerId: null, ratingChange: delta });
                                io.to(match.p2.socket.id).emit('game_over', { winnerId: null, ratingChange: delta });
                            }
                        }, timeoutMs);

                    });
            }
        });

        socket.on('code_update', ({ matchId, code }) => {
            // Broadcast to room (opponent will receive it)
            // exclude sender
            socket.to(matchId).emit('opponent_code_update', { code });
        });

        socket.on('submit_code', async ({ matchId, userId, code }) => {
            const result = await gameLogic.handleSubmission(matchId, userId, code);

            if (result.error) {
                socket.emit('execution_error', result.error);
                return;
            }

            // Emit result back to sender
            socket.emit('execution_result', result.result);

            // Broadcast health updates
            const game = result.gameState;
            io.to(game.p1.socketId).emit('game_update', game);
            io.to(game.p2.socketId).emit('game_update', game);

            if (result.action === 'win') {
                const winnerId = userId;
                const endResult = await gameLogic.endGame(matchId, winnerId);

                const sanitize = (val) => (val === null || val === undefined || Number.isNaN(val)) ? 0 : val;
                const p1IsWinner = game.p1.id === winnerId;
                const p1Delta = p1IsWinner ? sanitize(endResult?.winnerDelta) : sanitize(endResult?.loserDelta);
                const p2Delta = !p1IsWinner ? sanitize(endResult?.winnerDelta) : sanitize(endResult?.loserDelta);

                console.log(`[SOCKET DEBUG] WINNER Emitting game_over to P1 (${game.p1.socketId}) -> Change: ${p1Delta}`);
                console.log(`[SOCKET DEBUG] WINNER Emitting game_over to P2 (${game.p2.socketId}) -> Change: ${p2Delta}`);

                io.to(game.p1.socketId).emit('game_over', { winnerId, ratingChange: p1Delta });
                io.to(game.p2.socketId).emit('game_over', { winnerId, ratingChange: p2Delta });

            } else if (result.action === 'eliminated') {
                // Only one player died, match continues
                const delta = result.eliminationResult?.delta || 0;
                console.log(`[SOCKET DEBUG] ELIMINATED ${userId} -> Change: ${delta}`);

                // Send game_over (Lose) ONLY to the dead player
                socket.emit('game_over', { winnerId: null, ratingChange: delta });

                // Send game_update to both (other player sees opponent at 0 health)
                // Already handled above
            } else if (result.action === 'match_failed') {
                // Both died (the second player just died)
                const delta = result.eliminationResult?.delta || 0;
                console.log(`[SOCKET DEBUG] MATCH FAILED (2nd Death) ${userId} -> Change: ${delta}`);

                // Send game_over to the second player (first player already got theirs?)
                // Actually first player might have left.
                socket.emit('game_over', { winnerId: null, ratingChange: delta });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            matchmaker.removePlayer(socket.id);
            matchmaker.cancelPrivateRoom(socket.id);
        });
    });
};
