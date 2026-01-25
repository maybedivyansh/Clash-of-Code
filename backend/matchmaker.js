const supabase = require('./supabase');

class Matchmaker {

    constructor() {
        // No in-memory state needed for DB-backed queues
    }

    // Clean up stale entries (optional for MVP/cron job)
    async cleanupStaleQueueItems() {
        // Remove items older than X minutes?
        // DB cleanup would be a SQL query here
    }

    async createPrivateRoom(socket, userId, duration, rating) {
        // Generate 5-letter code
        const code = Math.random().toString(36).substr(2, 5).toUpperCase();

        console.log(`[MATCHMAKER] Creating Private Room ${code} for ${userId} in DB`);

        // Insert into DB with room_id
        const { error } = await supabase
            .from('matchmaking_queue')
            .upsert({
                user_id: userId,
                duration,
                socket_id: socket.id,
                rating,
                room_id: code
            });

        if (error) {
            console.error("Error creating private room:", error);
            return null;
        }

        return code;
    }

    async joinPrivateRoom(socket, userId, code, rating) {
        console.log(`[MATCHMAKER] ${userId} attempting to join room ${code}`);

        // Find the room host in DB
        const { data: hostData, error: findError } = await supabase
            .from('matchmaking_queue')
            .select('*')
            .eq('room_id', code)
            .maybeSingle();

        if (findError || !hostData) {
            return { error: 'Room not found or expired.' };
        }

        if (hostData.user_id === userId) {
            return { error: 'You cannot join your own room.' };
        }

        console.log(`[MATCHMAKER] Match found in Private Room ${code}! Host: ${hostData.user_id}`);

        // Remove host from queue
        // Note: Race condition possible but unlikely for private codes
        const { error: deleteError } = await supabase
            .from('matchmaking_queue')
            .delete()
            .eq('id', hostData.id);

        if (deleteError) {
            return { error: 'Room expired or taken.' };
        }

        const matchId = `match_private_${Date.now()}_${code}`;

        return {
            match: {
                matchId,
                p1: { userId: hostData.user_id, socket: { id: hostData.socket_id }, rating: hostData.rating },
                p2: { userId, socket, rating },
                duration: hostData.duration
            }
        };
    }

    async cancelPrivateRoom(socketId) {
        // Remove from DB where socket_id matches AND room_id is not null
        const { error } = await supabase
            .from('matchmaking_queue')
            .delete()
            .eq('socket_id', socketId)
            .not('room_id', 'is', null);

        if (!error) console.log(`[MATCHMAKER] Private Room cancelled for ${socketId}`);
    }

    async findMatch(socket, userId, duration, rating) {
        console.log(`Searching match for ${userId} (${duration} min, Rating: ${rating})`);

        // 1. Transaction-like check: Is there someone waiting?
        // Note: Supabase JS doesn't support complex transactions easily without RPC.
        // We will do a simple check-then-act. Race conditions are possible but rare for MVP scale.

        // Find waiting opponent in same duration AND NO ROOM ID (Public Queue)
        const { data: waitingData, error: waitingError } = await supabase
            .from('matchmaking_queue')
            .select('*')
            .eq('duration', duration)
            .is('room_id', null) // IMPORTANT: Only match public players
            .neq('user_id', userId) // Don't match self
            .order('created_at', { ascending: true }) // FIFO
            .limit(1)
            .maybeSingle();

        console.log(`[MATCHMAKER] Waiting data for ${userId}:`, waitingData, "Error:", waitingError ? waitingError.message : 'none');

        if (waitingData) {
            // MATCH FOUND
            // 2. Remove opponent from queue (optimistic lock or just delete)
            console.log(`[MATCHMAKER] Match found! Attempting to match ${userId} with ${waitingData.user_id}`);
            const { error: deleteError } = await supabase
                .from('matchmaking_queue')
                .delete()
                .eq('id', waitingData.id);

            if (deleteError) {
                console.error("Race condition? Opponent snatched.", deleteError);
                // If failed (someone else matched them), we should recurse or just join queue.
                // For simplicity, if delete fail, we assume taken, so we join queue.
                return await this.addToQueue(socket, userId, duration, rating);
            }

            const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            return {
                matchId,
                p1: { userId: waitingData.user_id, socket: { id: waitingData.socket_id }, rating: waitingData.rating },
                p2: { userId, socket, rating },
                duration
            };
        } else {
            console.log(`[MATCHMAKER] No match found. Adding ${userId} to queue.`);
            return await this.addToQueue(socket, userId, duration, rating);
        }
    }

    async addToQueue(socket, userId, duration, rating) {
        // 3. Insert self into queue (Public -> room_id is null)
        // Check if already exists? constraint handles it, but let's upsert
        console.log(`[MATCHMAKER] Inserting into queue: ${userId}, Socket: ${socket.id}`);
        const { error } = await supabase
            .from('matchmaking_queue')
            .upsert({
                user_id: userId,
                duration,
                socket_id: socket.id,
                rating,
                room_id: null
            })
            .select();

        if (error) {
            console.error("Error joining queue:", error);
        } // else console.log("Joined queue");

        return null; // No match yet
    }

    async removePlayer(socketId) {
        const { error } = await supabase
            .from('matchmaking_queue')
            .delete()
            .eq('socket_id', socketId);

        if (error) console.error("Error removing player from queue:", error);
        else console.log(`Removed ${socketId} from queue.`);
    }
}

module.exports = new Matchmaker();
