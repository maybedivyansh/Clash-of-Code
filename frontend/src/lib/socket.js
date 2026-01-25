import { io } from 'socket.io-client';

// Hardcoded for debugging to ensure port 4000 is used
const URL = 'http://localhost:4000';
console.log("🔌 Connecting to Socket Backend at:", URL);

const socket = io(URL, {
    autoConnect: true,
    reconnection: true,
});

export default socket;
