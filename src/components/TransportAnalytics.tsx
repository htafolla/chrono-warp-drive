import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Clock, Target, Activity, AlertTriangle, CheckCircle, Award } from 'lucide-react';

interface TransportResult {
  id: string;
  timestamp: Date;
  originCoords: { ra: number; dec: number; z: number };
  destinationCoords: { ra: number; dec: number; z: number };
  transportEfficiency: number;
  energyConsumption: number;
  temporalStability: number;
  neuralSyncScore: number;
  rippelHarmonics: string;
  status: 'success' | 'partial' | 'failed';
  anomalies: string[];
  temporalDestination?: {
    targetMJD: number;
    targetUTC: Date;
    temporalOffset: number;
    yearsAgo?: number;
    emissionEra?: string;
    lightTravelTimeYears?: number;
  };
}

interface TransportAnalyticsProps {
  transportHistory: TransportResult[];
  onClearHistory?: () => void;
  onExportHistory?: () => void;
}

interface AnalyticsMetrics {
  totalTransports: number;
  successRate: number;
  averageEfficiency: number;
  averageEnergyConsumption: number;
  mostCommonAnomalies: { anomaly: string; count: number }[];
  performanceTrend: 'improving' | 'declining' | 'stable';
  bestTransport: TransportResult | null;
  worstTransport: TransportResult | null;
  recentActivity: TransportResult[];
}

export const TransportAnalytics = ({
  transportHistory,
  onClearHistory,
  onExportHistory
}: TransportAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'recent' | 'today'>('all');

  // Calculate analytics metrics
  const metrics: AnalyticsMetrics = React.useMemo(() => {
    if (transportHistory.length === 0) {
      return {
        totalTransports: 0,
        successRate: 0,
        averageEfficiency: 0,
        averageEnergyConsumption: 0,
        mostCommonAnomalies: [],
        performanceTrend: 'stable',
        bestTransport: null,
        worstTransport: null,
        recentActivity: []
      };
    }

    // Filter data based on selected period
    const now = new Date();
    const filteredHistory = transportHistory.filter(transport => {
      switch (selectedPeriod) {
        case 'today':
          return transport.timestamp.toDateString() === now.toDateString();
        case 'recent':
          return now.getTime() - transport.timestamp.getTime() < 24 * 60 * 60 * 1000; // Last 24 hours
        default:
          return true;
      }
    });

    const totalTransports = filteredHistory.length;
    const successfulTransports = filteredHistory.filter(t => t.status === 'success').length;
    const successRate = totalTransports > 0 ? (successfulTransports / totalTransports) * 100 : 0;

    const averageEfficiency = filteredHistory.length > 0 
      ? filteredHistory.reduce((sum, t) => sum + t.transportEfficiency, 0) / filteredHistory.length * 100
      : 0;

    const averageEnergyConsumption = filteredHistory.length > 0
      ? filteredHistory.reduce((sum, t) => sum + t.energyConsumption, 0) / filteredHistory.length
      : 0;

    // Anomaly analysis
    const anomalyMap = new Map<string, number>();
    filteredHistory.forEach(transport => {
      transport.anomalies.forEach(anomaly => {
        anomalyMap.set(anomaly, (anomalyMap.get(anomaly) || 0) + 1);
      });
    });
    
    const mostCommonAnomalies = Array.from(anomalyMap.entries())
      .map(([anomaly, count]) => ({ anomaly, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Performance trend analysis
    let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (filteredHistory.length >= 4) {
      const recentTransports = filteredHistory.slice(-3);
      const olderTransports = filteredHistory.slice(-6, -3);
      
      if (recentTransports.length === 3 && olderTransports.length === 3) {
        const recentAvgEfficiency = recentTransports.reduce((sum, t) => sum + t.transportEfficiency, 0) / 3;
        const olderAvgEfficiency = olderTransports.reduce((sum, t) => sum + t.transportEfficiency, 0) / 3;
        
        if (recentAvgEfficiency > olderAvgEfficiency + 0.05) performanceTrend = 'improving';
        else if (recentAvgEfficiency < olderAvgEfficiency - 0.05) performanceTrend = 'declining';
      }
    }

    // Best and worst transports
    const bestTransport = filteredHistory.length > 0 
      ? filteredHistory.reduce((best, current) => 
          current.transportEfficiency > best.transportEfficiency ? current : best)
      : null;

    const worstTransport = filteredHistory.length > 0
      ? filteredHistory.reduce((worst, current) => 
          current.transportEfficiency < worst.transportEfficiency ? current : worst)
      : null;

    const recentActivity = transportHistory.slice(0, 5); // Last 5 transports

    return {
      totalTransports,
      successRate,
      averageEfficiency,
      averageEnergyConsumption,
      mostCommonAnomalies,
      performanceTrend,
      bestTransport,
      worstTransport,
      recentActivity
    };
  }, [transportHistory, selectedPeriod]);

  const getStatusIcon = (status: TransportResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: TransportResult['status']) => {
    switch (status) {
      case 'success': return 'default';
      case 'partial': return 'secondary';
      case 'failed': return 'destructive';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDistance = (coords: { ra: number; dec: number; z: number }) => {
    if (coords.z < 0.001) return 'Local';
    if (coords.z < 0.1) return `${(coords.z * 3000).toFixed(0)} Mpc`;
    return `${coords.z.toFixed(3)}z`;
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (transportHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Transport Analytics
            <Badge variant="outline">No Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transport history available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Execute your first transport to see analytics here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Transport Analytics
            <Badge variant="outline">{metrics.totalTransports} transports</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedPeriod === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={selectedPeriod === 'recent' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('recent')}
            >
              24h
            </Button>
            <Button
              size="sm"
              variant={selectedPeriod === 'today' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('today')}
            >
              Today
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{metrics.totalTransports}</div>
                <div className="text-xs text-muted-foreground">Total Transports</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.averageEfficiency.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Avg Efficiency</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.averageEnergyConsumption.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Energy</div>
              </div>
            </div>

            {/* Performance Trend */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getTrendIcon(metrics.performanceTrend)}
                <span className="font-medium">Performance Trend</span>
                <Badge variant={metrics.performanceTrend === 'improving' ? 'default' : 
                              metrics.performanceTrend === 'declining' ? 'destructive' : 'outline'}>
                  {metrics.performanceTrend}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {metrics.performanceTrend === 'improving' && "System performance is improving over recent transports."}
                {metrics.performanceTrend === 'declining' && "Recent transports show declining efficiency."}
                {metrics.performanceTrend === 'stable' && "Transport performance is stable."}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Best/Worst Transports */}
            {metrics.bestTransport && (
              <div className="space-y-3">
                <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Best Transport</span>
                    <Badge variant="default">{(metrics.bestTransport.transportEfficiency * 100).toFixed(1)}%</Badge>
                  </div>
                  <div className="text-sm text-green-700">
                    {metrics.bestTransport.timestamp.toLocaleDateString()} • 
                    {formatDistance(metrics.bestTransport.destinationCoords)} • 
                    {metrics.bestTransport.temporalDestination?.emissionEra || 'Unknown Era'}
                  </div>
                </div>

                {metrics.worstTransport && metrics.worstTransport.id !== metrics.bestTransport.id && (
                  <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Needs Improvement</span>
                      <Badge variant="destructive">{(metrics.worstTransport.transportEfficiency * 100).toFixed(1)}%</Badge>
                    </div>
                    <div className="text-sm text-red-700">
                      {metrics.worstTransport.timestamp.toLocaleDateString()} • 
                      {formatDistance(metrics.worstTransport.destinationCoords)} • 
                      {metrics.worstTransport.anomalies.length} anomalies
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Rate Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-sm text-muted-foreground">{metrics.successRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.successRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Efficiency</span>
                <span className="text-sm text-muted-foreground">{metrics.averageEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.averageEfficiency} className="h-2" />
            </div>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            {metrics.mostCommonAnomalies.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Most Common Issues</h4>
                {metrics.mostCommonAnomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{anomaly.anomaly}</span>
                    <Badge variant="outline">{anomaly.count} occurrences</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No anomalies detected in recent transports. System is operating optimally.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-2">
              {metrics.recentActivity.map((transport) => (
                <div key={transport.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(transport.status)}
                    <div>
                      <div className="text-sm font-medium">
                        Transport to {formatDistance(transport.destinationCoords)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {transport.timestamp.toLocaleString()} • {formatTimeAgo(transport.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusColor(transport.status) as any}>
                      {(transport.transportEfficiency * 100).toFixed(0)}%
                    </Badge>
                    {transport.anomalies.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {transport.anomalies.length} issue{transport.anomalies.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              {onExportHistory && (
                <Button size="sm" variant="outline" onClick={onExportHistory}>
                  Export History
                </Button>
              )}
              {onClearHistory && (
                <Button size="sm" variant="outline" onClick={onClearHistory}>
                  Clear History
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};