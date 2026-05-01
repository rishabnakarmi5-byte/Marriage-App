import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, collection, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GameData, MatchData, PlayerScore } from '../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Trophy, AlertTriangle, Play, UserPlus, ArrowLeft, History, Calculator, Crown, Zap, Trash2, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { playTap, playSuccess, playError, playToggle, playTick, playFanfare, playCardDeal, playNav } from '../lib/sounds';
import { useLanguage } from '../lib/LanguageContext';

export function GameRoom({ user }: { user: User }) {
  const { t } = useLanguage();
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameData | null>(null);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  // Match Input State
  const [currentMaalInputs, setCurrentMaalInputs] = useState<Record<string, string>>({});
  const [seenStatus, setSeenStatus] = useState<Record<string, boolean>>({});
  const [winnerId, setWinnerId] = useState<string>('');
  const [isDubli, setIsDubli] = useState(false);
  const [faultPlayers, setFaultPlayers] = useState<string[]>([]);
  const [submittingMatch, setSubmittingMatch] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, 'games', gameId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameData;
        setGame({ ...data, id: docSnap.id });
      } else {
        toast.error('Game not found');
        navigate('/');
      }
      setLoading(false);
    });

    const matchesRef = collection(db, 'games', gameId, 'matches');
    const q = query(matchesRef, orderBy('createdAt', 'desc'));
    const unsubMatches = onSnapshot(q, (snap) => {
      const m = snap.docs.map(d => ({ ...d.data(), id: d.id } as MatchData));
      setMatches(m);
    });

    return () => {
      unsubGame();
      unsubMatches();
    };
  }, [gameId, navigate]);

  useEffect(() => {
    if (game && game.playerIds) {
      const actSeen = { ...seenStatus };
      game.playerIds.forEach(pid => {
        if (actSeen[pid] === undefined) actSeen[pid] = true;
      });
      setSeenStatus(actSeen);
    }
  }, [game?.playerIds]);

  const toggleFault = (pid: string) => {
    playToggle();
    setFaultPlayers(prev => 
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
    if (!faultPlayers.includes(pid)) setWinnerId(''); 
  };

  const joinGame = async () => {
    playTap();
    if (!gameId || !game) return;
    if (game.playerIds.includes(user.uid)) return;
    if (game.playerIds.length >= 5) {
      toast.error('Game is full (max 5 players)');
      return;
    }
    try {
      await updateDoc(doc(db, 'games', gameId), {
        playerIds: arrayUnion(user.uid),
        [`players.${user.uid}`]: { name: user.displayName || 'Player', totalScore: 0 },
        updatedAt: serverTimestamp()
      });
      playSuccess();
    } catch (e) {
      toast.error('Failed to join game');
    }
  };

  const startGame = async () => {
    playTap();
    if (!gameId || !game || game.ownerId !== user.uid) return;
    if (game.playerIds.length < 2) {
      toast.error('Need at least 2 players');
      return;
    }
    await updateDoc(doc(db, 'games', gameId), {
      status: 'playing',
      currentMatch: 1,
      updatedAt: serverTimestamp()
    });
    playCardDeal();
  };

  const calculatePoints = useCallback(() => {
    if (!game) return null;
    const scores: Record<string, PlayerScore> = {};
    const pids = game.playerIds;
    const rules = game.rules || {
      normalSeen: 3,
      normalUnseen: 10,
      dubliSeen: 6,
      dubliUnseen: 20,
      faultNormal: 15,
      faultDubli: 30,
      cancelMaalOnFault: true
    };
    
    const parsedMaal: Record<string, number> = {};
    pids.forEach(pid => {
      parsedMaal[pid] = parseInt(currentMaalInputs[pid] || '0', 10);
      if (isNaN(parsedMaal[pid])) parsedMaal[pid] = 0;
    });

    // Case: Multiple Faults
    if (faultPlayers.length > 0) {
      const faultPenalty = isDubli ? (rules.faultDubli || rules.faultNormal * 2) : rules.faultNormal;
      const nonFaulters = pids.filter(pid => !faultPlayers.includes(pid));
      
      pids.forEach(pid => {
        const isFaulter = faultPlayers.includes(pid);
        scores[pid] = {
          maal: rules.cancelMaalOnFault ? 0 : parsedMaal[pid],
          seen: true,
          winner: false,
          points: isFaulter ? (-faultPenalty * nonFaulters.length) : (faultPenalty * faultPlayers.length),
          details: {
            gamePoints: isFaulter ? (-faultPenalty * nonFaulters.length) : (faultPenalty * faultPlayers.length),
            maalPoints: 0
          }
        };
      });
      return scores;
    }

    if (!winnerId) return null;

    // Standard Math using Rules
    const seenPenalty = isDubli ? rules.dubliSeen : rules.normalSeen;
    const unseenPenalty = isDubli ? rules.unseenPenalty || rules.normalUnseen : rules.normalUnseen;

    const gamePoints: Record<string, number> = {};
    const maalPoints: Record<string, number> = {};
    pids.forEach(pid => {
      gamePoints[pid] = 0;
      maalPoints[pid] = 0;
      scores[pid] = {
        maal: parsedMaal[pid],
        seen: seenStatus[pid] || pid === winnerId,
        winner: pid === winnerId,
        points: 0
      };
    });

    let winnerGamePointsTally = 0;
    pids.forEach(pid => {
      if (pid !== winnerId) {
        const penalty = (seenStatus[pid] || pid === winnerId) ? seenPenalty : unseenPenalty;
        gamePoints[pid] -= penalty;
        winnerGamePointsTally += penalty;
      }
    });
    gamePoints[winnerId] += winnerGamePointsTally;

    // Maal difference tally
    for (let i = 0; i < pids.length; i++) {
        const A = pids[i];
        for (let j = 0; j < pids.length; j++) {
            if (i === j) continue;
            const B = pids[j];
            const validMaalA = scores[A].seen ? scores[A].maal : 0;
            const validMaalB = scores[B].seen ? scores[B].maal : 0;
            
            if (i < j) {
                const diff = validMaalA - validMaalB;
                maalPoints[A] += diff;
                maalPoints[B] -= diff;
            }
        }
    }

    pids.forEach(pid => {
      scores[pid].points = gamePoints[pid] + maalPoints[pid];
      scores[pid].details = {
        gamePoints: gamePoints[pid],
        maalPoints: maalPoints[pid]
      };
    });

    return scores;
  }, [game, currentMaalInputs, seenStatus, winnerId, isDubli, faultPlayers]);

  const previewScores = useMemo(() => calculatePoints(), [calculatePoints]);

  const submitMatch = async () => {
    playTap();
    if (!game || !gameId) return;
    if (faultPlayers.length === 0 && !winnerId) {
      toast.error('Must select a winner or record a fault.');
      playError();
      return;
    }
    
    const calculatedScores = calculatePoints();
    if (!calculatedScores) {
      toast.error('Error calculating scores');
      playError();
      return;
    }

    setSubmittingMatch(true);
    try {
      const matchDoc = {
        matchNumber: matches.length + 1,
        type: isDubli ? 'dubli' : 'normal',
        isFault: faultPlayers.length > 0,
        faultPlayerIds: faultPlayers,
        scores: calculatedScores,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await addDoc(collection(db, 'games', gameId, 'matches'), matchDoc);

      const playersUpdate = { ...game.players };
      game.playerIds.forEach(pid => {
        playersUpdate[pid].totalScore += calculatedScores[pid].points;
      });

      await updateDoc(doc(db, 'games', gameId), {
        players: playersUpdate,
        currentMatch: matches.length + 2,
        lastWinnerId: winnerId || null,
        updatedAt: serverTimestamp()
      });

      // Reset
      setCurrentMaalInputs({});
      setWinnerId('');
      setIsDubli(false);
      setFaultPlayers([]);
      const resetSeen: Record<string, boolean> = {};
      game.playerIds.forEach(pid => resetSeen[pid] = true);
      setSeenStatus(resetSeen);

      playFanfare();
      toast.success('Match recorded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit match');
      playError();
    } finally {
      setSubmittingMatch(false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!window.confirm(t('deleteMatch'))) return;
    playTap();
    try {
      const matchRef = doc(db, 'games', gameId!, 'matches', matchId);
      const matchData = matches.find(m => m.id === matchId);
      
      if (matchData && game) {
        const playersUpdate = { ...game.players };
        game.playerIds.forEach(pid => {
          playersUpdate[pid].totalScore -= (matchData.scores[pid]?.points || 0);
        });
        
        await updateDoc(doc(db, 'games', gameId!), {
          players: playersUpdate,
          updatedAt: serverTimestamp()
        });
        await deleteDoc(matchRef);
        toast.success('Match deleted and scores reverted');
      }
    } catch (e) {
      toast.error('Failed to delete match');
    }
  };

  const handleQuitSession = async () => {
    if (!game || !gameId) return;
    playTap();
    const currentExits = game.exitRequests || [];
    if (currentExits.includes(user.uid)) {
      toast.info('You have already requested to quit. Waiting for others.');
      return;
    }

    const newExits = [...currentExits, user.uid];
    const allReady = newExits.length >= game.playerIds.length;

    try {
      await updateDoc(doc(db, 'games', gameId), {
        exitRequests: newExits,
        status: allReady ? 'completed' : 'playing',
        updatedAt: serverTimestamp()
      });
      if (allReady) {
        playFanfare();
        toast.success('Session closed by consensus!');
      } else {
        toast.info(`Quit request sent (${newExits.length}/${game.playerIds.length})`);
      }
    } catch (e) {
      toast.error('Failed to request quit');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      <p className="text-slate-400 font-medium">{t('waiting')}</p>
    </div>
  );
  
  if (!game) return (
    <div className="text-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
      <Button onClick={() => navigate('/')} variant="outline" className="mt-4">{t('dashboard')}</Button>
    </div>
  );

  const inGame = game.playerIds.includes(user.uid);
  const isOwner = game.ownerId === user.uid;
  const rate = game.rules?.rate || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{t('matchCenter')}</h2>
              <p className="text-xs font-mono text-slate-500">{t('roomId')}: {game.id?.substring(0, 8).toUpperCase()}</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex flex-col items-end px-4 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('rate')}</span>
               <span className="text-lg font-black text-white">Rs. {rate}/pt</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => { playNav(); navigate('/'); }} className="border-slate-700 bg-transparent text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('dashboard')}
            </Button>
         </div>
      </div>

      {/* Exit Consensus Alert */}
      {game.status === 'playing' && game.exitRequests && game.exitRequests.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
             <p className="text-sm font-bold text-amber-500 uppercase tracking-tight">
               {t('quitRequested')}: {game.exitRequests.length} / {game.playerIds.length} {t('players')}
             </p>
          </div>
          <div className="text-xs text-slate-500 italic">
            {t('allReadyToQuit')}
          </div>
        </motion.div>
      )}

      {game.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border-2 border-amber-500/50 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-10" />
          <Crown className="w-20 h-20 text-amber-500 mx-auto mb-6 drop-shadow-glow" fill="currentColor" />
          <h2 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter">{t('sessionComplete')}</h2>
          <p className="text-slate-400 text-xl mb-10 max-w-md mx-auto">{t('finalSettlement')} (Rs. {rate}/pt)</p>
          
          <div className="grid gap-4 max-w-xl mx-auto mb-10">
            {game.playerIds
              .sort((a, b) => (game.players[b].totalScore || 0) - (game.players[a].totalScore || 0))
              .map((pid, idx) => (
                <div key={pid} className="flex justify-between items-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-slate-600">#{idx + 1}</span>
                    <span className="text-xl font-bold text-white">{game.players[pid].name}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${game.players[pid].totalScore > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {game.players[pid].totalScore > 0 ? '+' : ''}{game.players[pid].totalScore}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase">Rs. {(game.players[pid].totalScore * rate).toFixed(0)}</p>
                  </div>
                </div>
              ))}
          </div>

          <Button size="lg" onClick={() => navigate('/')} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black px-12 h-16 rounded-2xl shadow-xl">
            {t('returnToLobby')}
          </Button>
        </motion.div>
      )}

      {game.status === 'waiting' && (
        <Card className="card-glow bg-slate-900/60 border-slate-800 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full" />
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <UserPlus className="text-amber-500" />
              {t('players')} ({game.playerIds.length}/5)
            </CardTitle>
            <CardDescription className="text-slate-400">{t('configureRules')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {game.playerIds.map((pid, idx) => (
                <div 
                  key={pid}
                  className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30"
                >
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-900">
                     {game.players[pid]?.name.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex-1">
                     <p className="font-bold text-white">{game.players[pid]?.name}</p>
                     {pid === game.ownerId && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase">{t('host')}</span>}
                   </div>
                   {pid === user.uid && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
              ))}
            </div>
            
            <div className="flex flex-col gap-3">
              {!inGame && game.playerIds.length < 5 && (
                <Button onClick={joinGame} size="lg" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-6 rounded-2xl">
                  {t('joinTable')}
                </Button>
              )}
              {isOwner && (
                <Button onClick={startGame} size="lg" disabled={game.playerIds.length < 2} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 rounded-2xl shadow-lg shadow-emerald-900/20">
                  <Play className="w-5 h-5 mr-2" /> {t('startGame')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {game.status === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <Card className="card-glow bg-slate-900/60 border-slate-800 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 to-transparent" />
               <CardHeader className="border-b border-slate-800/50 bg-slate-800/20">
                 <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-2xl font-black text-white flex items-center gap-2">
                        <Calculator className="text-amber-500" />
                        {t('saveMatch')} #{matches.length + 1}
                      </CardTitle>
                      <CardDescription className="text-slate-500">{t('configureRules')}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2 bg-slate-800/50 p-2 px-3 rounded-xl border border-slate-700/50">
                           <Checkbox 
                             id="dubli" 
                             checked={isDubli} 
                             onCheckedChange={(c) => { playToggle(); setIsDubli(!!c); }} 
                             className="border-rose-500 data-[state=checked]:bg-rose-500"
                           />
                           <Label htmlFor="dubli" className="font-bold text-rose-500 text-sm cursor-pointer select-none">{t('dubliGame')} (x2)</Label>
                        </div>
                    </div>
                 </div>
               </CardHeader>
               
               <CardContent className="pt-6 space-y-6">
                 <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      <Label className="font-bold text-slate-300">{t('penaltyFaultTracker')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      {faultPlayers.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-500 px-3 py-1 bg-rose-500/10 rounded-lg">
                            {faultPlayers.length} {t('faulters')}
                          </span>
                          <Button variant="ghost" size="xs" onClick={() => setFaultPlayers([])} className="text-[10px] text-slate-500 hover:text-white underline">{t('clear')}</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">{t('noFaults')}</span>
                      )}
                    </div>
                 </div>

                 <div className="space-y-3">
                    {game.playerIds.map(pid => (
                      <motion.div 
                        key={pid}
                        layout
                        className={`player-row p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 ${
                          winnerId === pid ? 'is-winner' : faultPlayers.includes(pid) ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/40 border-slate-700/30'
                        }`}
                      >
                         <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold relative ${
                              winnerId === pid ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {game.players[pid].name.charAt(0).toUpperCase()}
                              {winnerId === pid && <Crown className="absolute -top-3 -right-2 w-5 h-5 text-amber-400 animate-crown" fill="currentColor" />}
                            </div>
                            <div>
                               <p className="font-bold text-white">{game.players[pid].name}</p>
                               {previewScores && (
                                 <div className="flex items-center gap-2">
                                   <p className={`text-xs font-mono font-bold ${previewScores[pid].points > 0 ? 'text-emerald-400' : previewScores[pid].points < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                     {previewScores[pid].points > 0 ? '+' : ''}{previewScores[pid].points} {t('points')}
                                   </p>
                                   <p className="text-[10px] text-slate-500 font-mono">
                                     (Rs. {(previewScores[pid].points * rate).toFixed(0)})
                                   </p>
                                 </div>
                               )}
                            </div>
                         </div>

                         <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                            <div className="flex flex-col items-center gap-1.5 px-3 border-r border-slate-700/50">
                              <Label className="text-[10px] font-black uppercase text-rose-500 tracking-tighter">{t('fault')}</Label>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleFault(pid)}
                                className={`w-8 h-8 rounded-lg transition-all ${
                                  faultPlayers.includes(pid) 
                                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                                  : 'bg-slate-800 text-slate-600 hover:text-rose-400'
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                            </div>

                            {faultPlayers.length === 0 && (
                              <>
                                <div className="flex flex-col items-center gap-1.5 px-3">
                                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{t('seen')}</Label>
                                  <Checkbox 
                                    checked={seenStatus[pid] || winnerId === pid} 
                                    onCheckedChange={(c) => { playToggle(); setSeenStatus(prev => ({ ...prev, [pid]: !!c })); }} 
                                    disabled={winnerId === pid}
                                    className="w-6 h-6 border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1.5 px-3 border-x border-slate-700/50">
                                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{t('winner')}</Label>
                                  <Checkbox 
                                    checked={winnerId === pid} 
                                    onCheckedChange={(c) => {
                                      playToggle();
                                      if (c) {
                                        setWinnerId(pid);
                                        setSeenStatus(prev => ({...prev, [pid]: true}));
                                      } else if (winnerId === pid) {
                                        setWinnerId('');
                                      }
                                    }} 
                                    className="w-6 h-6 border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                  />
                                </div>
                              </>
                            )}
                            
                            <div className="flex flex-col items-start gap-1 w-24">
                              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{t('maal')}</Label>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder="0"
                                className="h-10 bg-slate-800 border-slate-700 text-white rounded-xl text-center font-bold"
                                disabled={faultPlayers.length > 0 && game.rules?.cancelMaalOnFault}
                                value={currentMaalInputs[pid] || ''}
                                onChange={e => { playTick(); setCurrentMaalInputs(prev => ({ ...prev, [pid]: e.target.value })); }}
                              />
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 <div className="pt-4">
                    <Button 
                      onClick={submitMatch} 
                      disabled={submittingMatch || (faultPlayers.length === 0 && !winnerId)} 
                      className={`w-full py-8 text-xl font-black rounded-2xl shadow-2xl transition-all duration-300 ${
                        (faultPlayers.length === 0 && !winnerId) 
                        ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 animate-pulse-glow border-0'
                      }`}
                    >
                       {submittingMatch ? <Loader2 className="animate-spin w-8 h-8" /> : (
                         <div className="flex items-center gap-3">
                           <Zap fill="currentColor" className="w-6 h-6" />
                           {t('saveMatch')}
                         </div>
                       )}
                    </Button>
                 </div>
               </CardContent>
            </Card>

            <Card className="card-glow bg-slate-900/60 border-slate-800 overflow-hidden shadow-xl">
               <CardHeader className="border-b border-slate-800/50 bg-slate-800/10">
                 <CardTitle className="text-xl flex items-center gap-2">
                   <History className="text-slate-400" />
                   {t('recentHistory')}
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-0 overflow-x-auto">
                 <Table>
                   <TableHeader className="bg-slate-800/30">
                     <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="w-[80px] font-bold text-slate-400">#</TableHead>
                        <TableHead className="w-[100px] font-bold text-slate-400">{t('type')}</TableHead>
                        {game.playerIds.map(pid => (
                          <TableHead key={pid} className="text-right font-bold text-slate-400">{game.players[pid].name}</TableHead>
                        ))}
                        <TableHead className="w-[60px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {matches.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={game.playerIds.length + 3} className="text-center py-20">
                            <div className="opacity-20 mb-4 flex justify-center">
                               <History className="w-16 h-16" />
                            </div>
                            <p className="text-slate-500 font-medium italic">{t('noMatches')}</p>
                         </TableCell>
                       </TableRow>
                     ) : (
                       matches.map((m, idx) => (
                        <TableRow key={m.id || idx} className="border-slate-800/50 hover:bg-slate-800/20 group transition-colors">
                          <TableCell className="font-mono font-bold text-slate-500">#{m.matchNumber}</TableCell>
                          <TableCell>
                             {m.isFault ? (
                               <span className="text-[10px] bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded-full font-black uppercase border border-rose-500/30">{t('fault')}</span>
                             ) : m.type === 'dubli' ? (
                               <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-black uppercase border border-amber-500/30">{t('dubli')}</span>
                             ) : (
                               <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase">{t('normal')}</span>
                             )}
                          </TableCell>
                          {game.playerIds.map(pid => {
                            const pScore = m.scores[pid];
                            return (
                              <TableCell key={pid} className="text-right font-mono">
                                <div className="flex flex-col items-end">
                                  <div className="flex items-center gap-1">
                                    <span className={`text-sm font-bold ${pScore?.points > 0 ? 'text-emerald-400' : pScore?.points < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                      {pScore?.points > 0 ? '+' : ''}{pScore?.points ?? 0}
                                    </span>
                                    {pScore?.winner && <Trophy className="w-3 h-3 text-amber-500" fill="currentColor" />}
                                  </div>
                                  {pScore?.details && (
                                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                                      <span>G: {pScore.details.gamePoints > 0 ? '+' : ''}{pScore.details.gamePoints}</span>
                                      <span>|</span>
                                      <span>M: {pScore.details.maalPoints > 0 ? '+' : ''}{pScore.details.maalPoints}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" onClick={() => deleteMatch(m.id!)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10">
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <Card className="card-glow bg-slate-900/60 border-slate-800 sticky top-24 shadow-2xl">
               <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent border-b border-slate-800/50">
                 <CardTitle className="text-xl flex items-center gap-3">
                   <Crown className="text-amber-500" fill="currentColor" />
                   {t('standings')}
                 </CardTitle>
                 <CardDescription className="text-slate-500 italic">{t('totalScore')} & NPR {t('rate')}</CardDescription>
               </CardHeader>
               <CardContent className="pt-6">
                 <div className="space-y-4">
                    {game.playerIds
                      .sort((a, b) => (game.players[b].totalScore || 0) - (game.players[a].totalScore || 0))
                      .map((pid, idx) => {
                        const pts = game.players[pid].totalScore;
                        return (
                          <div 
                            key={pid} 
                            className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-500 ${
                              idx === 0 ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5' : 'bg-slate-800/30 border-slate-700/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                 idx === 0 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400'
                               }`}>
                                 {idx + 1}
                               </div>
                               <div>
                                 <p className="font-bold text-white text-sm">{game.players[pid].name}</p>
                                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                   Rs. {(pts * rate).toFixed(0)}
                                 </p>
                               </div>
                            </div>
                            <div className={`text-xl font-black font-mono ${pts > 0 ? 'text-emerald-400' : pts < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {pts > 0 ? '+' : ''}{pts}
                            </div>
                          </div>
                        );
                      })
                    }
                 </div>
               </CardContent>
               <div className="p-4 bg-slate-800/20 border-t border-slate-800/50 rounded-b-3xl space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-bold uppercase tracking-widest justify-center">
                    <Banknote className="w-3 h-3" />
                    {t('valueBasedOn')} Rs. {rate}/pt
                  </div>
                  {game.status === 'playing' && (
                    <Button 
                      onClick={handleQuitSession}
                      variant="outline" 
                      className="w-full border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                    >
                      {game.exitRequests?.includes(user.uid) ? t('waitOthers') : t('quitSession')}
                    </Button>
                  )}
               </div>
             </Card>
          </div>
        </div>
      )}
    </div>
  );
}
