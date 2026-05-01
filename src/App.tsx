import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logout, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Dashboard } from './pages/Dashboard';
import { GameRoom } from './pages/GameRoom';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { playTap, playFanfare, playNav } from './lib/sounds';

// Floating card suit particles for ambiance
function FloatingSuits() {
  const suits = ['♠', '♥', '♦', '♣', '🃏'];
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    suit: suits[i % suits.length],
    left: `${(i * 8.3) % 100}%`,
    delay: `${i * 1.8}s`,
    duration: `${12 + (i % 5) * 3}s`,
    size: `${1.2 + (i % 3) * 0.5}rem`,
  }));

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="suit-particle"
          style={{
            left: p.left,
            bottom: '-30px',
            animationDelay: p.delay,
            animationDuration: p.duration,
            fontSize: p.size,
          }}
        >
          {p.suit}
        </div>
      ))}
    </>
  );
}

// Animated card fan for login screen
function CardFan() {
  const cards = ['🂡', '🂱', '🃁', '🃑', '🃏'];
  return (
    <div className="flex justify-center mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ rotate: 0, y: 40, opacity: 0 }}
          animate={{
            rotate: (i - 2) * 15,
            y: Math.abs(i - 2) * 5,
            opacity: 1,
          }}
          transition={{ delay: 0.2 + i * 0.1, type: 'spring', bounce: 0.4 }}
          className="text-5xl md:text-6xl mx-[-8px] drop-shadow-lg select-none"
          style={{ transformOrigin: 'bottom center' }}
        >
          {card}
        </motion.div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              email: u.email,
              displayName: u.displayName,
              createdAt: serverTimestamp(),
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state error:', err);
        toast.error('Authentication error');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = useCallback(async () => {
    playTap();
    try {
      await loginWithGoogle();
      playFanfare();
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized', {
          description: `Add "${window.location.hostname}" to authorized domains in Firebase Console → Authentication → Settings.`,
          duration: 10000,
        });
      } else if (e?.code !== 'auth/popup-closed-by-user') {
        toast.error(`Login failed: ${e.message}`);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-felt">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center animate-pulse-glow">
            <span className="text-3xl">🃏</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-felt relative overflow-hidden">
        <FloatingSuits />
        <Toaster richColors theme="dark" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
          className="text-center relative z-10 px-6"
        >
          <CardFan />

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-3 gradient-text"
          >
            Marriage
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-lg md:text-xl text-slate-400 font-medium max-w-md mx-auto mb-2"
          >
            The Nepali Card Game Score Counter
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-sm text-slate-500 max-w-sm mx-auto mb-10"
          >
            Create a room, invite friends, and let us handle the math ✨
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleLogin}
                size="lg"
                className="px-10 py-7 text-lg rounded-2xl shadow-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 font-bold border-0 btn-press"
              >
                <span className="mr-2 text-xl">🎴</span>
                Sign in with Google
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-felt text-slate-100 flex flex-col relative">
        <FloatingSuits />

        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/80 border-b border-amber-500/10 px-4 py-3 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => { playNav(); window.location.href = '/'; }}
          >
            <span className="text-2xl">🃏</span>
            <h1 className="text-xl font-extrabold gradient-text">Marriage</h1>
          </motion.div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-slate-900">
                {(user.displayName || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-300">
                {user.displayName}
              </span>
            </div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { playTap(); logout(); }}
                className="h-8 shrink-0 border-slate-700 text-slate-400 hover:text-white hover:border-amber-500/50 bg-transparent"
              >
                Logout
              </Button>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 relative z-10">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/game/:gameId" element={<GameRoom user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-600 border-t border-slate-800/50 relative z-10">
          Made with ♥ for Marriage lovers
        </footer>

        <Toaster richColors theme="dark" />
      </div>
    </BrowserRouter>
  );
}
