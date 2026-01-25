# Clash of Code ⚔️

**Clash of Code** is a high-octane, real-time 1v1 competitive coding platform where developers battle for supremacy. It combines algorithmic problem solving with fighting game mechanics—write clean code to damage your opponent, or face elimination if your code fails!


## 🚀 Features

- **Real-Time 1v1 Battles**: Compete against other players in real-time. Code faster and cleaner to win.
- **Live Code Execution**: Secure, sandboxed code execution (Python supported) powered by Piston.
- **Combat Mechanics**:
  - **Pass Tests**: Heal your HP and deal damage to your opponent.
  - **Runtime Errors**: Take damage yourself.
  - **Syntax Errors**: Lose valuable time.
- **Smart Matchmaking**: ELO-based queue system finds opponents of similar skill levels.
- **Private Lobbies**: Create private rooms to challenge friends directly.
- **Dynamic Leaderboards**: Track your rating, wins, and losses on your profile.
- **Cyberpunk Aesthetic**: Immersive, dark-mode UI designed for the modern hacker.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Icons**: Lucide React
- **State Management**: React Hooks & Context API

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Server**: Express.js
- **Real-Time Communication**: [Socket.io](https://socket.io/)
- **Code Execution**: [Piston API](https://github.com/engineer-man/piston) integration

### Database
- **Provider**: [Supabase](https://supabase.com/)
- **Type**: PostgreSQL

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Supabase project

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/clash-of-code.git
cd clash-of-code
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
```

Start the server:
```bash
npm start
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend` folder:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to start battling!

## 🎮 How to Play

1.  **Register/Login**: Sign up or play as a Guest.
2.  **Find a Match**: Click "Ranked Match" to enter the queue.
3.  **The Arena**:
    - You are given a coding problem (e.g., "Two Sum").
    - Write your solution in the editor.
    - Click **Execute** to run test cases.
4.  **Winning**:
    - Decrease your opponent's health to 0.
    - OR have higher health when the timer runs out.
    - OR pass all test cases first (Instant Win).

## 📂 Project Structure

```
clash-of-code/
├── backend/          # Node.js Express Server & Socket.io logic
│   ├── index.js      # Entry point
│   ├── gameLogic.js  # Core game mechanics (Health, ELO)
│   ├── matchmaker.js # Queue and room management
│   ├── piston.js     # Code execution driver
│   └── socket.js     # WebSocket event handlers
│
├── frontend/         # Next.js Application
│   ├── src/app/      # App Router pages (Battle, Matchmaking, Profile)
│   ├── components/   # Reusable UI components (Editor, Terminal)
│   └── lib/          # Utilities (Socket client)
│
├── database/         # SQL scripts for Supabase setup
└── README.md         # You are here
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
