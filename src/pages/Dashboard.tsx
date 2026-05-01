import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { motion, AnimatePresence } from 'motion/react';
import { GameData, GameRules } from '../types';
import { Users, Loader2, Sparkles, Zap, Crown, Settings2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { playTap, playSuccess, playJoin, playCardDeal } from '../lib/sounds';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';

export function Dashboard({ user }: { user: User }) {
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [ongoingGames, setOngoingGames] = useState<GameData[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();

  // Rules State
  const [rules, setRules] = useState<GameRules>({
    rate: 1,
    normalSeen: 3,
    normalUnseen: 10,
    dubliSeen: 6,
    dubliUnseen: 20,
    faultNormal: 15,
    faultDubli: 30,
    cancelMaalOnFault: true
  });

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
        rules: rules,
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
      setIsCreateOpen(false);
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
          Configure your rules and deal the cards!
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Game Section */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Card className="card-glow bg-gradient-to-br from-slate-800/80 to-slate-900/80 h-full flex flex-col overflow-hidden relative cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
                <CardHeader className="relative z-10">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20"
                  >
                    <PlusCircle className="text-amber-400 w-7 h-7" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-white">Create Table</CardTitle>
                  <CardDescription className="text-base text-slate-400">
                    Set your local rules and invite up to 5 players
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto relative z-10">
                  <Button
                    size="lg"
                    className="w-full text-lg h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-500/20 border-0 pointer-events-none"
                  >
                    <Settings2 className="w-5 h-5 mr-2" />
                    Set Rules & Create
                  </Button>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Settings2 className="text-amber-500" />
                  Game Rules Configuration
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Customize the point system for your local group.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Rate Section */}
                <div className="space-y-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <Label htmlFor="rate" className="text-amber-400 font-bold text-sm uppercase tracking-wider">Currency & Rate</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-1.5">NPR per 1 Point</p>
                      <Input 
                        id="rate" 
                        type="number" 
                        value={rules.rate} 
                        onChange={(e) => setRules({...rules, rate: parseFloat(e.target.value) || 0})}
                        className="bg-slate-900 border-slate-700 h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Point Scenarios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <h3 className="font-black text-rose-500 text-xs uppercase tracking-widest">Normal Game Points</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Seen Penalty</Label>
                        <Input type="number" value={rules.normalSeen} onChange={(e) => setRules({...rules, normalSeen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Unseen Penalty</Label>
                        <Input type="number" value={rules.normalUnseen} onChange={(e) => setRules({...rules, normalUnseen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <h3 className="font-black text-amber-500 text-xs uppercase tracking-widest">Dubli Game Points</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Seen Penalty</Label>
                        <Input type="number" value={rules.dubliSeen} onChange={(e) => setRules({...rules, dubliSeen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Unseen Penalty</Label>
                        <Input type="number" value={rules.dubliUnseen} onChange={(e) => setRules({...rules, dubliUnseen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fault Section */}
                <div className="space-y-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20">
                  <h3 className="font-black text-rose-400 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Fault / Penalty Rules
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Normal Fault Pts</Label>
                      <Input type="number" value={rules.faultNormal} onChange={(e) => setRules({...rules, faultNormal: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Dubli Fault Pts</Label>
                      <Input type="number" value={rules.faultDubli} onChange={(e) => setRules({...rules, faultDubli: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2 border-t border-rose-500/10">
                    <Checkbox 
                      id="cancelMaal" 
                      checked={rules.cancelMaalOnFault} 
                      onCheckedChange={(c) => setRules({...rules, cancelMaalOnFault: !!c})} 
                      className="border-rose-500 data-[state=checked]:bg-rose-500"
                    />
                    <Label htmlFor="cancelMaal" className="text-xs text-slate-300 cursor-pointer">Cancel all maals when fault occurs (Standard)</Label>
                  </div>
                </div>
              </div>

              <DialogFooter className="sm:justify-between gap-4">
                <p className="text-[10px] text-slate-500 italic max-w-[200px]">These rules will apply to all matches in this session.</p>
                <Button 
                  onClick={handleCreateGame} 
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 h-12 rounded-xl border-0"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Confirm & Create Table
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Join Game Section */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-slate-400">
                      <Users className="w-4 h-4 mr-2 text-amber-500/60" />
                      {game.playerIds.length} / 5
                    </div>
                    <div className="text-xs font-bold text-amber-500/80">
                      Rs. {game.rules?.rate || 1}/pt
                    </div>
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
