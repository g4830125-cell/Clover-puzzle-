import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, UserPlus, Search, User, MessageCircle, Sword, Zap, Check, Clock } from 'lucide-react';
import { socialService } from '../../services/socialService';
import { Friend, FriendRequest, SocialState, GameInvite } from '../../types';

interface FriendsOverlayProps {
  onClose: () => void;
  userId: string;
  userEmail?: string;
}

const FriendItem = ({ friend, onInvite }: any) => {
  const [showInviteMenu, setShowInviteMenu] = useState(false);

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-black rounded-2xl flex items-center justify-center text-slate-500 font-display font-black text-lg border border-white/5">
            {friend.name.charAt(0)}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0c] ${
            friend.status === 'online' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 
            friend.status === 'in-game' ? 'bg-arcane-purple shadow-[0_0_10px_#8b5cf6]' : 
            'bg-slate-600'
          }`} />
        </div>
        <div>
          <div className="text-sm font-bold text-white uppercase tracking-wider">{friend.name}</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1.5 flex items-center gap-2">
             LVL {friend.level} • <span className={friend.status === 'online' ? 'text-green-500/70' : ''}>{friend.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {friend.status === 'online' && (
          <div className="relative">
            <button 
              onClick={() => setShowInviteMenu(!showInviteMenu)}
              className="p-3 bg-arcane-purple/10 text-arcane-purple rounded-xl hover:bg-arcane-purple/20 transition-all group-hover:scale-105 active:scale-95"
            >
              <Sword size={18} />
            </button>
            
            <AnimatePresence>
              {showInviteMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-32 bg-[#121216] border border-white/10 rounded-xl shadow-2xl p-2 z-50"
                >
                  <button 
                    onClick={() => { socialService.sendGameInvite(friend.userId, '1v1'); setShowInviteMenu(false); }}
                    className="w-full text-left p-2 hover:bg-white/5 rounded-lg text-[9px] font-black uppercase text-white tracking-widest mb-1 transition-colors"
                  >
                    1V1 Battle
                  </button>
                  <button 
                    onClick={() => { socialService.sendGameInvite(friend.userId, '2v2'); setShowInviteMenu(false); }}
                    className="w-full text-left p-2 hover:bg-white/5 rounded-lg text-[9px] font-black uppercase text-arcane-gold tracking-widest transition-colors"
                  >
                    2V2 Co-op
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <button className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100">
          <MessageCircle size={18} />
        </button>
      </div>
    </div>
  );
}

const RequestItem = ({ request }: any) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    socialService.acceptFriendRequest(request.fromId);
    setAccepted(true);
  };

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black">
          {request.fromName.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-bold text-white uppercase tracking-wide">{request.fromName}</div>
          <div className="text-[9px] text-arcane-gold font-bold uppercase tracking-widest leading-none mt-1">Incoming Signal</div>
        </div>
      </div>
      
      {accepted ? (
        <div className="flex items-center gap-2 text-green-500 px-4 py-2 bg-green-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest">
          <Check size={14} /> Accepted
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button 
            onClick={handleAccept}
            className="p-3 bg-arcane-purple/20 text-arcane-purple rounded-xl hover:bg-arcane-purple/30 transition-all active:scale-90 touch-manipulation flex items-center justify-center"
          >
            <Check size={18} className="pointer-events-none" />
          </button>
          <button className="p-3 bg-white/5 text-slate-500 rounded-xl hover:bg-white/10 transition-all active:scale-90 touch-manipulation flex items-center justify-center">
            <X size={18} className="pointer-events-none" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function FriendsOverlay({ onClose, userId, userEmail }: FriendsOverlayProps) {
  const [state, setState] = useState<SocialState>({ friends: [], requests: [], invites: [] });
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search' | 'bots'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isTester = userEmail === 'g4830125@gmail.com';

  const testBots: Friend[] = [
    { userId: 'bot_asta', name: 'Asta (Test)', level: 42, status: 'online' },
  ];

  useEffect(() => {
    socialService.setListeners(
      (newState) => setState(newState),
      (invite) => {
        // Invite received handling managed by service but we can add local UI triggers here
      }
    );
    socialService.refreshSocialData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await socialService.searchUsers(searchQuery);
      // Filter out self
      setSearchResults(results.filter(u => u.userId !== userId));
    } catch (err: any) {
      setSearchError(err.message || 'Connection failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = (targetId: string) => {
    socialService.sendFriendRequest(targetId);
    // Basic feedback
    setSearchResults(prev => prev.map(u => u.userId === targetId ? { ...u, requested: true } : u));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 backdrop-blur-xl bg-black/40"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-lg h-full max-h-[min(650px,90vh)] bg-[#0a0a0c] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-arcane-purple/20 rounded-xl text-arcane-purple">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-wider">Social Hub</h3>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connect with other mages</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white transition-all active:scale-90 touch-manipulation flex items-center justify-center -mr-2">
            <X size={24} className="pointer-events-none" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-white/[0.01] overflow-x-auto no-scrollbar shrink-0">
          <div className="flex px-4 md:px-8 min-w-full md:min-w-0">
            {[
              { id: 'friends', label: 'Mages', icon: <Users size={16} />, count: state.friends.length },
              { id: 'requests', label: 'Requests', icon: <UserPlus size={16} />, count: state.requests.length },
              { id: 'search', label: 'Search', icon: <Search size={16} />, count: null },
              ...(isTester ? [{ id: 'bots', label: 'Test Bots', icon: <Zap size={16} />, count: testBots.length }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap active:scale-95 touch-manipulation ${
                  activeTab === tab.id ? 'text-arcane-gold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'search' && <span className="sm:hidden">{tab.label}</span>}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-arcane-purple text-white text-[8px] rounded-full">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-arcane-gold" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {state.friends.length === 0 ? (
                  <div className="text-center py-12 md:py-20">
                    <Users className="mx-auto text-slate-800 mb-4" size={48} />
                    <p className="text-slate-500 text-sm font-medium">Your circle of mages is empty.</p>
                    <button 
                      onClick={() => setActiveTab('search')}
                      className="mt-4 text-arcane-gold text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Find friends
                    </button>
                  </div>
                ) : (
                  state.friends.map(friend => (
                    <FriendItem key={friend.userId} friend={friend} onInvite={() => {}} />
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {state.requests.length === 0 ? (
                  <div className="text-center py-12 md:py-20">
                    <UserPlus className="mx-auto text-slate-800 mb-4" size={48} />
                    <p className="text-slate-500 text-sm font-medium">No incoming requests.</p>
                  </div>
                ) : (
                  state.requests.map(req => (
                    <RequestItem key={req.fromId} request={req} />
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search username or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white text-sm focus:outline-none focus:border-arcane-purple/50 transition-colors"
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="absolute right-2 p-2.5 bg-arcane-purple/20 text-arcane-purple rounded-xl hover:bg-arcane-purple/30 transition-all active:scale-90 touch-manipulation"
                  >
                    {isSearching ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Search size={20} className="pointer-events-none" />}
                  </button>
                </div>

                <div className="space-y-3 pb-4">
                  {searchResults.map(user => (
                    <div key={user.userId} className="p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-slate-400 font-black shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white uppercase tracking-wide truncate">{user.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1 flex items-center gap-2">
                             Lvl {user.level} • <span className="opacity-50 truncate">{user.userId}</span>
                          </div>
                        </div>
                      </div>
                      
                      {user.requested ? (
                        <div className="flex items-center gap-2 text-arcane-gold px-3 py-2 bg-arcane-gold/10 rounded-xl shrink-0">
                          <Clock size={14} />
                          <span className="text-[9px] font-black uppercase tracking-widest hidden xs:inline">Pending</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => sendRequest(user.userId)}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 md:px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                          <UserPlus size={14} />
                          <span className="hidden xs:inline">Enlist</span>
                        </button>
                      )}
                    </div>
                  ))}
                  {searchError && (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/10">
                      <p className="text-red-400 text-sm font-bold uppercase tracking-widest">{searchError}</p>
                      <button 
                        onClick={handleSearch}
                        className="mt-3 text-[9px] font-black text-white/40 hover:text-white uppercase tracking-[0.2em] transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  {searchQuery && !isSearching && !searchError && searchResults.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm italic">No players discovered with that handle.</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'bots' && (
              <motion.div
                key="bots"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="p-4 bg-arcane-gold/5 border border-arcane-gold/20 rounded-2xl mb-6">
                  <p className="text-[9px] font-bold text-arcane-gold uppercase tracking-[0.2em] mb-1">Testing Chamber</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-medium tracking-wider">
                    Invite these spirit constructs to verify your social links and combat protocols.
                  </p>
                </div>
                {testBots.map(bot => (
                  <FriendItem key={bot.userId} friend={bot} onInvite={() => {}} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
