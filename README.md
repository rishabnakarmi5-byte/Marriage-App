# 🃏 Marriage — The Ultimate Score Counter

A premium, real-time score tracking application for the popular Nepali card game **Marriage**. Designed for a seamless, exciting, and friendly game night experience.

## ✨ Features

- **🎯 Real-time Synchronization**: Powered by Firebase, scores update instantly for all players at the table.
- **🧮 Auto-Calculation**: Just enter the 'Maal' and 'Seen' status; we handle the complex pairwise differences and game points.
- **🔊 Immersive Audio**: Procedural sound effects for taps, shuffles, wins, and faults (Web Audio API).
- **🎭 Premium UI**: A dark "card-felt" theme with gold accents, smooth animations (Framer Motion), and responsive design.
- **🏆 Live Leaderboard**: Track the overall winner throughout the session.
- **🛡️ Error Handling**: Robust logic for 'Fault' scenarios, 'Dubli' matches, and match corrections (deletion/reversion).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rishabnakarmi5-byte/Marriage-App.git
   cd Marriage-App
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file and add your Firebase and Gemini API keys (see `.env.example`).

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📐 Points Logic

The app follows standard Nepali Marriage rules:
- **Game Points**: 3 points for seen players, 10 points for unseen (doubled in Dubli).
- **Maal Difference**: Valid only for seen players and the winner. Pairwise differences are calculated across all valid players.
- **Faults**: If a fault is recorded, the fault-player pays 15 points to every other player at the table.

## 🛠️ Tech Stack

- **Frontend**: React (Vite)
- **Styling**: Tailwind CSS
- **Database/Auth**: Firebase Firestore & Auth
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Toast**: Sonner

---
Made with ♥ for Marriage lovers everywhere.
