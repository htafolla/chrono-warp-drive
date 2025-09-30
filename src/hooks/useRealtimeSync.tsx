// Realtime Supabase Sync for CTI Cascade Updates (Codex v4.7 Phase 2)
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CTIUpdate {
  session_id: string;
  cti_value: number;
  cascade_index: number;
  q_ent: number;
  delta_phase: number;
  n: number;
  tdf_value: number;
  efficiency: number;
  timestamp: number;
}

export interface RealtimeSyncOptions {
  sessionId: string;
  enabled?: boolean;
  onUpdate?: (update: CTIUpdate) => void;
  broadcastDelay?: number; // ms between broadcasts (default: 100ms for 120 FPS compliance)
}

/**
 * Realtime synchronization hook for CTI cascade updates
 * Implements Codex v4.7 Phase 2: Realtime Supabase Integration
 */
export function useRealtimeSync(options: RealtimeSyncOptions) {
  const { sessionId, enabled = true, onUpdate, broadcastDelay = 100 } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [peersCount, setPeersCount] = useState(0);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const channelName = `cti-cascade-${sessionId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: sessionId }
      }
    });

    channelRef.current = channel;

    // Subscribe to CTI updates
    channel
      .on('broadcast', { event: 'cti-update' }, ({ payload }) => {
        if (onUpdate && payload) {
          onUpdate(payload as CTIUpdate);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPeersCount(Object.keys(state).length);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime Sync] Connected to channel: ${channelName}`);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId, enabled, onUpdate]);

  /**
   * Broadcast CTI update to all peers
   * Throttled to maintain 120 FPS (broadcastDelay ms between updates)
   */
  const broadcastUpdate = (update: Omit<CTIUpdate, 'session_id' | 'timestamp'>) => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < broadcastDelay) {
      return; // Throttle to prevent overwhelming the channel
    }

    if (!channelRef.current || !isConnected) {
      console.warn('[Realtime Sync] Cannot broadcast - not connected');
      return;
    }

    const fullUpdate: CTIUpdate = {
      ...update,
      session_id: sessionId,
      timestamp: now
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'cti-update',
      payload: fullUpdate
    });

    lastBroadcastRef.current = now;
  };

  /**
   * Track presence in the channel
   */
  const trackPresence = async (metadata: Record<string, any> = {}) => {
    if (!channelRef.current || !isConnected) return;

    await channelRef.current.track({
      online_at: new Date().toISOString(),
      ...metadata
    });
  };

  return {
    isConnected,
    peersCount,
    broadcastUpdate,
    trackPresence
  };
}
