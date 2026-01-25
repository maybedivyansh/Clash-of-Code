const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- IN-MEMORY STORE ---------------- */

const rooms = {};

/* ---------------- UTIL ---------------- */

function generateRoomCode(len = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/* ---------------- REST APIs ---------------- */

app.post("/create-room", (req, res) => {
  const { difficulty, time, language } = req.body;

  let code;
  do code = generateRoomCode();
  while (rooms[code]);

  rooms[code] = {
    roomCode: code,
    difficulty,
    timeLimitMs: Number(time) * 60 * 1000,
    language,
    players: 1,
    health: {},
    started: false,
    ended: false,
    timer: null
  };

  res.json({ roomCode: code });
});

app.post("/join-room", (req, res) => {
  const room = rooms[req.body.roomCode];
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.players >= 2) return res.status(403).json({ error: "Room full" });

  room.players++;
  res.json(room);
});

app.get("/room/:code", (req, res) => {
  const room = rooms[req.params.code];
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

/* ---------------- SOCKET ---------------- */

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" }
});

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    socket.join(roomCode);

    if (!room.health[socket.id]) {
      room.health[socket.id] = 100;
    }

    // Restore Step-4 behaviour
    io.to(roomCode).emit("room-update", {
      players: room.players
    });

    io.to(roomCode).emit("health-update", room.health);

    // Start game timer ONCE
    if (room.players === 2 && !room.started) {
      room.started = true;

      // Authoritative game end
      room.timer = setTimeout(() => {
        if (!room.ended) {
          room.ended = true;
          io.to(roomCode).emit("time-up");
        }
      }, room.timeLimitMs);

      // Countdown for UI
      let remaining = Math.floor(room.timeLimitMs / 1000);
      const interval = setInterval(() => {
        remaining--;
        io.to(roomCode).emit("timer", remaining);

        if (remaining <= 0 || room.ended) {
          clearInterval(interval);
        }
      }, 1000);
    }
  });

  socket.on("submit-code", ({ roomCode, code }) => {
    const room = rooms[roomCode];
    if (!room || room.ended) return;
    if (room.health[socket.id] <= 0) return;

    const file = path.join(__dirname, `${socket.id}.py`);
    fs.writeFileSync(file, code);

    exec(`python "${file}"`, { timeout: 2000 }, (err, stdout, stderr) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      if (room.ended) return;

      // ❌ mistake → health decreases
      if (err || stderr) {
        room.health[socket.id] -= 10;
      } else {
        // ✅ correct output wins immediately
        if (stdout.trim().endsWith("3")) {
          room.ended = true;
          clearTimeout(room.timer);
          io.to(roomCode).emit("winner", socket.id);
          return;
        }
      }

      // elimination
      if (room.health[socket.id] <= 0) {
        room.health[socket.id] = 0;
        io.to(roomCode).emit("player-eliminated", socket.id);
      }

      io.to(roomCode).emit("health-update", room.health);
    });
  });
});

server.listen(5000, () =>
  console.log("Server running on port 5000")
);
