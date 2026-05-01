import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { motion } from 'motion/react';
import { GameData } from '../types';
import { Users, Loader2, Sparkles, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { playTap, playSuccess, playNav, playCardDeal, playJoin } from '../lib/sounds';

export function Dashboard({ user }: { user: User }) {
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [ongoingGames, setOngoingGames] = useState<GameData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      where('status', 'in', ['waiting', 'playing']),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const games = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as GameData));
      setOngoingGames(games);
    }, (error) => {
      console.error("Error fetching games", error);
    });

    return () => unsub();
  }, []);

  const handleCreateGame = async () => {
    playTap();
    setLoading(true);
    try {
      const gameRef = await addDoc(collection(db, 'games'), {
        ownerId: user.uid,
        status: 'waiting',
        playerIds: [user.uid],
        players: {
          [user.uid]: { name: user.displayName || 'Player', totalScore: 0 }
        },
        currentMatch: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      playSuccess();
      navigate(`/game/${gameRef.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to create game', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    playJoin();
    navigate(`/game/${joinId.trim()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-10 mt-4"
    >
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center py-6"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="text-5xl mb-3 inline-block"
        >
          🃏
        </motion.div>
        <h2 className="text-3xl md:text-4xl font-extrabold gradient-text mb-2">
          Ready to Play?
        </h2>
        <p className="text-slate-400 text-lg">
          Deal the cards and let the games begin!
        </p>
      </motion.div>

      {/* Action cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="card-glow bg-gradient-to-br from-slate-800/80 to-slate-900/80 h-full flex flex-col overflow-hidden relative">
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />

            <CardHeader className="relative z-10">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20"
              >
                <Sparkles className="text-amber-400 w-7 h-7" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-white">Create Table</CardTitle>
              <CardDescription className="text-base text-slate-400">
                Start a new game and invite your friends to join
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto relative z-10">
              <Button
                onClick={handleCreateGame}
                disabled={loading}
                size="lg"
                className="w-full text-lg h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-500/20 border-0 btn-press"
              >
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Create New Game
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="card-glow bg-gradient-to-br from-slate-800/80 to-slate-900/80 h-full flex flex-col overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />

            <CardHeader className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <Users className="text-emerald-400 w-7 h-7" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Join Table</CardTitle>
              <CardDescription className="text-base text-slate-400">
                Enter a game code to join an existing table
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinGame} className="flex flex-col mt-auto">
              <CardContent className="space-y-4 relative z-10">
                <Input
                  id="gameId"
                  placeholder="Paste game ID here..."
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="h-14 text-lg rounded-xl text-center tracking-widest font-mono bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                />
              </CardContent>
              <CardFooter className="relative z-10">
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  className="w-full text-lg h-14 rounded-xl border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 bg-transparent btn-press"
                  disabled={!joinId.trim()}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Join Table
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>

      {/* Ongoing games */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
          <Crown className="mr-3 text-amber-400 w-6 h-6" />
          Live Tables
        </h2>
        {ongoingGames.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-10 text-center bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700/50"
          >
            <div className="text-4xl mb-3">🎴</div>
            <p className="text-slate-500 font-medium text-lg">No active games right now</p>
            <p className="text-slate-600 text-sm mt-1">Be the first to create a table!</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  onClick={() => { playCardDeal(); navigate(`/game/${game.id}`); }}
                  className="cursor-pointer card-glow bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-5 rounded-2xl transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
                      {game.id?.substring(0, 8)}...
                    </div>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      game.status === 'waiting' ? 'badge-waiting' : 'badge-playing'
                    }`}>
                      {game.status === 'waiting' ? '⏳ Waiting' : '🎮 Playing'}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">
                    {game.players[game.ownerId]?.name}'s Table
                  </h3>
                  <div className="flex items-center text-sm text-slate-400">
                    <Users className="w-4 h-4 mr-2 text-amber-500/60" />
                    {game.playerIds.length} Player{game.playerIds.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
