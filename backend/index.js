require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const matchmaker = require('./matchmaker');
const gameLogic = require('./gameLogic');
const supabase = require('./supabase');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for MVP
        methods: ["GET", "POST"]
    }
});

const socketHandler = require('./socket');

// Basic Health Check
app.get('/', (req, res) => {
    res.send('Clash of Code Backend is Running');
});

socketHandler(io); // Attach socket logic

app.get('/api/user/:id/profile', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Fetch User Stats (Rating, Wins, Losses)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('username, rating, wins, losses')
            .eq('id', id)
            .single();

        if (userError) {
            console.error("Profile Fetch Error (User):", userError);
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Fetch Last 10 Matches
        // querying matches where player1_id OR player2_id is the user
        const { data: matches, error: matchError } = await supabase
            .from('matches')
            .select(`
                id,
                player1_id,
                player2_id,
                winner_id,
                status,
                duration,
                created_at,
                question_id
            `)
            .or(`player1_id.eq.${id},player2_id.eq.${id}`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (matchError) {
            console.error("Profile Fetch Error (Matches):", matchError);
            // We can still return user stats if matches fail, but let's notify
        }

        // 3. Enrich Match Data (Resolving Opponent Username)
        // This is a bit manual because Supabase joins on OR conditions are tricky or require specific FK setups. 
        // For MVP, we can simple-fetch the opponent names or just show ID/Guest.

        const enrichedMatches = await Promise.all((matches || []).map(async (m) => {
            const isP1 = m.player1_id === id;
            const opponentId = isP1 ? m.player2_id : m.player1_id;
            let opponentName = 'Unknown';

            if (opponentId.startsWith('guest_')) {
                opponentName = 'Guest';
            } else {
                // Try to fetch opponent name. 
                // Optimization: In a real app, we'd batch this or join.
                const { data: opp } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', opponentId)
                    .single();
                opponentName = opp ? opp.username : 'Opponent';
            }

            // Calculate Rating Change (Simplified: we don't store historical rating in matches table yet, 
            // but we can infer win/loss)
            // Ideally we should store the 'delta' in the match record or a separate definitions table.
            // For now, let's just show Win/Loss.

            const isWinner = m.winner_id === id;
            const isDraw = !m.winner_id && m.status === 'finished'; // or timeout double loss

            return {
                matchId: m.id,
                opponentId,
                opponentName,
                result: isWinner ? 'WIN' : (isDraw ? 'DRAW' : 'LOSS'),
                date: m.created_at,
                duration: m.duration
            };
        }));

        res.json({
            stats: user,
            matches: enrichedMatches
        });

    } catch (err) {
        console.error("Profile API Error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


const PORT = (process.env.PORT && process.env.PORT !== '3000') ? process.env.PORT : 4000;

// Database Connection Check
supabase.from('users').select('id').limit(1)
    .then(({ data, error }) => {
        if (error) {
            console.error("❌ Database Connection Failed:", error.message);
        } else {
            console.log("✅ Database Connected Successfully");
        }
    })
    .catch(err => console.error("❌ Database Critical Error:", err));

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
