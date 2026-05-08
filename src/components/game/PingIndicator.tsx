import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff } from 'lucide-react';
import { multiplayerService } from '../../services/multiplayerService';
import { GameState } from '../../types';

interface PingIndicatorProps {
  settings: GameState['settings'];
}

export const PingIndicator: React.FC<PingIndicatorProps> = ({ settings }) => {
  const [ping, setPing] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!settings.showPing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPing(null);
      return;
    }

    const unsubPing = multiplayerService.on('ping_update', (value: number) => {
      setPing(value);
    });

    const socket = multiplayerService.getSocket();
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => {
      setIsConnected(false);
      setPing(null);
    };

    if (socket) {
      setIsConnected(socket.connected);
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      
      // Trigger immediate ping
      if (socket.connected) {
        multiplayerService.ping();
      }
      
      // Start pinging every 2.5 seconds for optimal balance of real-time vs stability
      intervalRef.current = setInterval(() => {
        if (socket.connected) {
          multiplayerService.ping();
        }
      }, 2500);
    }

    return () => {
      unsubPing();
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [settings.showPing]);

  if (!settings.showPing) return null;

  const getStatusColor = () => {
    if (!ping) return 'text-white/20';
    if (ping < 100) return 'text-green-400';
    if (ping < 250) return 'text-arcane-gold';
    return 'text-red-400';
  };

  const getGlowColor = () => {
    if (!ping) return '';
    if (ping < 100) return 'shadow-[0_0_10px_rgba(74,222,128,0.2)]';
    if (ping < 250) return 'shadow-[0_0_10px_rgba(251,191,36,0.2)]';
    return 'shadow-[0_0_10px_rgba(248,113,113,0.2)]';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-[4.5rem] right-6 sm:bottom-[4.5rem] sm:right-4 z-[100] flex items-center gap-2 px-3 py-1.5 bg-[#09090b]/60 backdrop-blur-md border border-white/10 rounded-full pointer-events-none select-none transition-all duration-300 ${getGlowColor()}`}
    >
      <div className={`flex items-center justify-center ${getStatusColor()}`}>
        {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className={`text-[11px] font-black font-mono tracking-tighter tabular-nums ${getStatusColor()}`}>
          {ping !== null ? ping : '--'}
        </span>
        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">
          MS
        </span>
      </div>

      <div className="relative flex h-1.5 w-1.5 ml-0.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          !ping ? 'bg-white/20' : ping < 100 ? 'bg-green-500' : ping < 250 ? 'bg-arcane-gold' : 'bg-red-500'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
          !ping ? 'bg-white/20' : ping < 100 ? 'bg-green-500' : ping < 250 ? 'bg-arcane-gold' : 'bg-red-500'
        }`}></span>
      </div>
    </motion.div>
  );
};
