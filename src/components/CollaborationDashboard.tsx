import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CollaborationDashboardProps {
  currentSessionId: string;
  onParameterSync?: (params: { n: number; deltaPhase: number }) => void;
}

interface ActiveSession {
  session_id: string;
  cascade_level: number;
  tdf_value: number | null;
  q_ent: number | null;
  status: string;
  updated_at: string;
}

const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({
  currentSessionId,
  onParameterSync
}) => {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sharedBreakthroughs, setSharedBreakthroughs] = useState(0);

  useEffect(() => {
    // Load active sessions
    const loadActiveSessions = async () => {
      const { data } = await supabase
        .from('cti_sessions')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (data) {
        setActiveSessions(data);
      }
    };

    loadActiveSessions();

    // Subscribe to session updates
    const channel = supabase
      .channel('collaboration-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cti_sessions',
          filter: 'status=eq.active'
        },
        () => {
          loadActiveSessions();
        }
      )
      .subscribe();

    // Count shared breakthroughs
    const countBreakthroughs = async () => {
      const { data } = await supabase
        .from('cascade_updates')
        .select('id')
        .gt('efficiency', 0.92)
        .gt('q_ent', 0.88);
      
      setSharedBreakthroughs(data?.length || 0);
    };

    countBreakthroughs();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSyncParameters = (session: ActiveSession) => {
    if (onParameterSync && session.cascade_level && session.tdf_value) {
      onParameterSync({
        n: session.cascade_level,
        deltaPhase: Number(session.tdf_value)
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Multi-User Collaboration</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-secondary/20 rounded-lg">
          <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">{activeSessions.length}</div>
          <div className="text-sm text-muted-foreground">Active Sessions</div>
        </div>
        
        <div className="text-center p-4 bg-secondary/20 rounded-lg">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">{sharedBreakthroughs}</div>
          <div className="text-sm text-muted-foreground">Shared Breakthroughs</div>
        </div>

        <div className="text-center p-4 bg-secondary/20 rounded-lg">
          <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">
            {activeSessions.filter(s => s.session_id !== currentSessionId).length}
          </div>
          <div className="text-sm text-muted-foreground">Peer Researchers</div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Active Research Sessions</h4>
        {activeSessions.slice(0, 5).map((session) => (
          <div
            key={session.session_id}
            className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer"
            onClick={() => handleSyncParameters(session)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {session.session_id === currentSessionId ? 'You' : session.session_id.slice(0, 8)}
                </span>
                {session.session_id === currentSessionId && (
                  <Badge variant="outline" className="text-xs">Current</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                n={session.cascade_level} | TDF={session.tdf_value?.toFixed(4) || 'N/A'} | Q_ent={session.q_ent?.toFixed(4) || 'N/A'}
              </div>
            </div>
            <Badge variant={session.q_ent && session.q_ent > 0.88 ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CollaborationDashboard;
