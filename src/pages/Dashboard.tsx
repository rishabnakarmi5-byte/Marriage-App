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
import { Users, Loader2, Sparkles, Zap, Crown, Settings2, PlusCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { playTap, playSuccess, playJoin } from '../lib/sounds';
import { useLanguage } from '../lib/LanguageContext';

export function Dashboard({ user }: { user: User }) {
  const { t } = useLanguage();
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

  const handleCreateDemo = async () => {
    playTap();
    setLoading(true);
    try {
      // 1. Create Game
      const gameRef = await addDoc(collection(db, 'games'), {
        ownerId: user.uid,
        status: 'playing',
        playerIds: [user.uid, 'bot-1', 'bot-2', 'bot-3'],
        players: {
          [user.uid]: { name: user.displayName || 'You', totalScore: 35 },
          'bot-1': { name: 'Aayush', totalScore: -12 },
          'bot-2': { name: 'Sujal', totalScore: 18 },
          'bot-3': { name: 'Prajwol', totalScore: -41 }
        },
        currentMatch: 3,
        rules: rules,
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Add Dummy Matches
      const matchesRef = collection(db, 'games', gameRef.id, 'matches');
      await addDoc(matchesRef, {
        matchNumber: 1,
        type: 'normal',
        isFault: false,
        faultPlayerIds: [],
        scores: {
          [user.uid]: { points: 25, maal: 12, seen: true, winner: true, details: { gamePoints: 13, maalPoints: 12 } },
          'bot-1': { points: -5, maal: 5, seen: true, winner: false, details: { gamePoints: -3, maalPoints: -2 } },
          'bot-2': { points: -8, maal: 2, seen: true, winner: false, details: { gamePoints: -3, maalPoints: -5 } },
          'bot-3': { points: -12, maal: 0, seen: false, winner: false, details: { gamePoints: -7, maalPoints: -5 } }
        },
        createdAt: Date.now() - 100000,
        updatedAt: Date.now() - 100000
      });

      playSuccess();
      navigate(`/game/${gameRef.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to create demo');
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
      className="space-y-10 mt-4 relative"
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
          {t('readyToPlay')}
        </h2>
        <p className="text-slate-400 text-lg mb-6">
          {t('configureRules')}
        </p>
      </motion.div>

      {/* Action cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateOpen(true)}
          className="cursor-pointer"
        >
          <Card className="card-glow bg-gradient-to-br from-slate-800/80 to-slate-900/80 h-full flex flex-col overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
            <CardHeader className="relative z-10">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20"
              >
                <PlusCircle className="text-amber-400 w-7 h-7" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-white">{t('createGame')}</CardTitle>
              <CardDescription className="text-base text-slate-400">
                {t('configureRules')}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto relative z-10">
              <Button
                size="lg"
                className="w-full text-lg h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-500/20 border-0"
              >
                <Settings2 className="w-5 h-5 mr-2" />
                {t('gameRules')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card className="card-glow bg-gradient-to-br from-slate-800/80 to-slate-900/80 h-full flex flex-col overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />

            <CardHeader className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <Users className="text-emerald-400 w-7 h-7" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">{t('joinGame')}</CardTitle>
              <CardDescription className="text-base text-slate-400">
                {t('enterRoomId')}
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
                  {t('joinGame')}
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
          {t('standings')}
        </h2>
        {ongoingGames.length === 0 ? (
          <div className="p-10 text-center bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700/50">
            <div className="text-4xl mb-3">🎴</div>
            <p className="text-slate-500 font-medium text-lg">{t('noMatches')}</p>
          </div>
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
                  onClick={() => { playJoin(); navigate(`/game/${game.id}`); }}
                  className="cursor-pointer card-glow bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-5 rounded-2xl transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
                      {game.id?.substring(0, 8)}...
                    </div>
                    <div className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      game.status === 'waiting' ? 'badge-waiting' : 'badge-playing'
                    }`}>
                      {game.status === 'waiting' ? `⏳ ${t('waiting')}` : `🎮 ${t('playing')}`}
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

      {/* Rules Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Settings2 className="text-amber-500" />
                    {t('gameRules')}
                  </h3>
                  <p className="text-sm text-slate-400">{t('configureRules')}</p>
                </div>
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <Label className="text-amber-400 font-bold text-sm uppercase tracking-wider">{t('nprPerPoint')}</Label>
                  <Input 
                    type="number" 
                    value={rules.rate} 
                    onChange={(e) => setRules({...rules, rate: parseFloat(e.target.value) || 0})}
                    className="bg-slate-900 border-slate-700 h-12 text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <h3 className="font-black text-rose-500 text-xs uppercase tracking-widest">{t('normalGame')}</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">{t('seenPenalty')}</Label>
                        <Input type="number" value={rules.normalSeen} onChange={(e) => setRules({...rules, normalSeen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">{t('unseenPenalty')}</Label>
                        <Input type="number" value={rules.normalUnseen} onChange={(e) => setRules({...rules, normalUnseen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <h3 className="font-black text-amber-500 text-xs uppercase tracking-widest">{t('dubliGame')}</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">{t('seenPenalty')}</Label>
                        <Input type="number" value={rules.dubliSeen} onChange={(e) => setRules({...rules, dubliSeen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">{t('unseenPenalty')}</Label>
                        <Input type="number" value={rules.dubliUnseen} onChange={(e) => setRules({...rules, dubliUnseen: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20">
                  <h3 className="font-black text-rose-400 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3" /> {t('faultPenalty')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">{t('normalGame')} {t('fault')}</Label>
                      <Input type="number" value={rules.faultNormal} onChange={(e) => setRules({...rules, faultNormal: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 h-10" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">{t('dubliGame')} {t('fault')}</Label>
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
                    <Label htmlFor="cancelMaal" className="text-xs text-slate-300 cursor-pointer">{t('cancelMaalOnFault')}</Label>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-800/50 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-[10px] text-slate-500 italic max-w-[200px]">Rules will be saved for this session.</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button 
                    variant="outline"
                    onClick={handleCreateDemo} 
                    disabled={loading}
                    className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 px-6 h-14 rounded-2xl"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('tryDemo')}
                  </Button>
                  <Button 
                    onClick={handleCreateGame} 
                    disabled={loading}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-10 h-14 rounded-2xl border-0 shadow-lg shadow-amber-500/20"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Zap className="w-4 h-4 mr-2" fill="currentColor" />}
                    {t('confirmAndCreate')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
