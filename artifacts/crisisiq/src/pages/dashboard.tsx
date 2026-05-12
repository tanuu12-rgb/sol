import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { 
  useListIncidents, getListIncidentsQueryKey,
  useUpdateIncidentStatus,
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetActivityFeed, getGetActivityFeedQueryKey,
  useGetSocialRadar, getGetSocialRadarQueryKey,
  useListStaff, getListStaffQueryKey,
  useListGuests,
  useGenerateDebrief,
  useRecommendActions,
  customFetch,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, ShieldAlert, HeartPulse, AlertCircle, Activity, 
  Users, Map, Camera, Twitter, FileText, CheckCircle2,
  Clock, MapPin, Search, Brain, Radio, Flame, Zap, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const RADIO_LINES = [
  { unit: "Security-3", text: "East stairwell clear, moving to lobby." },
  { unit: "Medical-1", text: "EMT bag staged at floor 4 elevator bank." },
  { unit: "Concierge", text: "Two guests escorted to assembly point Bravo." },
  { unit: "Engineering", text: "HVAC dampers cycled on tower B, awaiting confirmation." },
  { unit: "Front-Desk", text: "Switchboard rerouting to mobile, all lines hot." },
  { unit: "Security-1", text: "Camera 12 has visual on suspect package, no movement." },
  { unit: "Floor-Captain-4", text: "Room sweep 401-412 complete, all accounted for." },
  { unit: "Medical-2", text: "Vitals stable on guest in 308, transporting now." },
  { unit: "Ops", text: "All units, switch to channel 4 for command net." },
  { unit: "Valet", text: "Drive lane cleared, ambulance has straight shot." },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [wheelchairMode, setWheelchairMode] = useState(false);
  const [anomalyScanActive, setAnomalyScanActive] = useState(false);
  const [scanScore, setScanScore] = useState(0);

  // Poll for live updates
  const { data: incidents = [] } = useListIncidents(undefined, {
    query: { refetchInterval: 3000, queryKey: getListIncidentsQueryKey() }
  });
  const { data: summary } = useGetDashboardSummary({
    query: { refetchInterval: 5000, queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: activity = [] } = useGetActivityFeed({
    query: { refetchInterval: 5000, queryKey: getGetActivityFeedQueryKey() }
  });
  const { data: radar } = useGetSocialRadar({
    query: { refetchInterval: 10000, queryKey: getGetSocialRadarQueryKey() }
  });
  const { data: staff = [] } = useListStaff({
    query: { refetchInterval: 5000, queryKey: getListStaffQueryKey() }
  });

  const { data: guests = [] } = useListGuests();
  const updateIncident = useUpdateIncidentStatus();
  const generateDebrief = useGenerateDebrief();
  const recommendActions = useRecommendActions();
  const [recommendation, setRecommendation] = useState<{
    severity: string;
    priorityScore: number;
    eta: string;
    actions: { title: string; detail: string }[];
  } | null>(null);
  const [recommendingId, setRecommendingId] = useState<string | null>(null);

  // Live radio chatter ticker
  const [radioFeed, setRadioFeed] = useState<{ id: string; unit: string; text: string; timestamp: string }[]>(
    () =>
      RADIO_LINES.slice(0, 3).map((l, i) => ({
        ...l,
        id: `seed-${i}`,
        timestamp: new Date(Date.now() - i * 12000).toISOString(),
      })),
  );
  const radioIdx = useRef(3);
  useEffect(() => {
    const t = setInterval(() => {
      const next = RADIO_LINES[radioIdx.current % RADIO_LINES.length];
      radioIdx.current += 1;
      setRadioFeed((prev) =>
        [
          {
            ...next,
            id: `r-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 12),
      );
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const checkoutGuest = useMutation({
    mutationFn: async (id: string) => {
      return customFetch<{ success: boolean }>(`/api/guests/${id}/checkout`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({ title: "Guest checked out", description: "The room is now available for new check-ins." });
    }
  });

  const { toast } = useToast();

  const handleUpdateStatus = (id: string, status: 'accepted' | 'resolved') => {
    updateIncident.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleGenerateDebrief = (id: string) => {
    generateDebrief.mutate({ incidentId: id }, {
      onSuccess: (report) => {
        alert("Debrief Generated: " + report.executiveSummary);
      }
    });
  };

  const handleRunScan = () => {
    if (anomalyScanActive) return;
    setAnomalyScanActive(true);
    setScanScore(0);
    
    let score = 0;
    const interval = setInterval(() => {
      score += Math.random() * 15;
      if (score >= 87) {
        setScanScore(87);
        clearInterval(interval);
        setTimeout(() => setAnomalyScanActive(false), 3000);
      } else {
        setScanScore(score);
      }
    }, 200);
  };

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  // Predictive risk heatmap: weight per-floor by active incidents, accessibility guests, social threat
  const radarWeight = radar?.threatLevel === 'High' ? 25 : radar?.threatLevel === 'Medium' ? 12 : 4;
  const floors = [1, 2, 3, 4, 5];
  const floorRisk = floors.map((f) => {
    const inc = activeIncidents.filter((i) => i.floor === f);
    const accGuests = guests.filter(
      (g) =>
        g.floor === f &&
        g.accessibility &&
        Object.values(g.accessibility).some(Boolean),
    ).length;
    const fireBoost = inc.some((i) => i.type === 'Fire') ? 35 : 0;
    const score = Math.min(
      100,
      inc.length * 22 + accGuests * 6 + fireBoost + Math.round(radarWeight / 2),
    );
    return { floor: f, score, incidents: inc.length, accGuests };
  });
  const overallThreat = Math.min(
    100,
    activeIncidents.length * 18 +
      radarWeight +
      (activeIncidents.some((i) => i.type === 'Fire') ? 30 : 0) +
      (activeIncidents.some((i) => i.accessibility && Object.values(i.accessibility).some(Boolean)) ? 12 : 0),
  );
  const threatLabel =
    overallThreat >= 70 ? 'CRITICAL' : overallThreat >= 40 ? 'ELEVATED' : overallThreat >= 15 ? 'GUARDED' : 'CALM';
  const threatColor =
    overallThreat >= 70
      ? 'text-destructive'
      : overallThreat >= 40
      ? 'text-orange-400'
      : overallThreat >= 15
      ? 'text-yellow-400'
      : 'text-green-500';

  // Auto-load AI recommendation when an incident is selected
  useEffect(() => {
    if (!selectedIncidentId) {
      setRecommendation(null);
      setRecommendingId(null);
      return;
    }
    if (recommendingId === selectedIncidentId) return;
    setRecommendingId(selectedIncidentId);
    setRecommendation(null);
    recommendActions.mutate(
      { incidentId: selectedIncidentId },
      {
        onSuccess: (r) => setRecommendation(r),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIncidentId]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CrisisIQ Ops Center</h1>
            <div className="text-xs text-muted-foreground">Grand Hotel Continental • {format(new Date(), 'HH:mm:ss')}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-3 h-9 rounded-md border border-border bg-card/60">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Threat Index</div>
            <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full ${overallThreat >= 70 ? 'bg-destructive' : overallThreat >= 40 ? 'bg-orange-400' : overallThreat >= 15 ? 'bg-yellow-400' : 'bg-green-500'}`}
                animate={{ width: `${overallThreat}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <div className={`text-xs font-bold font-mono ${threatColor}`}>{overallThreat}</div>
            <Badge variant="outline" className={`text-[10px] font-mono ${threatColor} border-current`}>
              {threatLabel}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {activeIncidents.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
            )}
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")}>Exit Demo</Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 overflow-hidden flex flex-col">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <h3 className="text-2xl font-bold text-destructive">{summary?.activeIncidents || 0}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <h3 className="text-2xl font-bold text-primary">{summary?.avgResponseSeconds || 0}s</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Staff Available</p>
                <h3 className="text-2xl font-bold text-green-500">{summary?.staffAvailable || 0}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Accessibility Guests</p>
                <h3 className="text-2xl font-bold text-purple-500">{summary?.accessibilityGuests || 0}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                <h3 className="text-2xl font-bold text-muted-foreground">{summary?.resolvedToday || 0}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
          
          {/* Left Col: Floor Plan & Routing */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col border-border relative overflow-hidden group">
              <CardHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between z-10 bg-card">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Map className="w-5 h-5 text-primary" /> Live Floor Plan</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={wheelchairMode ? 'bg-purple-500/20 text-purple-400 border-purple-500' : ''}
                  onClick={() => setWheelchairMode(!wheelchairMode)}
                >
                  {wheelchairMode ? 'Wheelchair Routing Active' : 'Enable Wheelchair Routing'}
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 relative bg-zinc-950/50">
                {/* Custom CSS Grid Floor Plan Mockup */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-2 p-8" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  {/* Corridors */}
                  <div className="col-span-6 row-start-2 row-span-1 bg-zinc-900/30 rounded-lg border border-white/5 flex items-center justify-center">
                    <span className="text-zinc-600 font-mono text-sm tracking-[0.5em] uppercase">MAIN CORRIDOR</span>
                  </div>
                  
                  {/* Rooms top row */}
                  {[1,2,3,4,5,6].map(i => {
                    const roomNum = `40${i}`;
                      const activeIncident = incidents.find(inc => inc.room === roomNum && inc.status !== 'resolved');
                      const hasStaff = staff.find(s => s.status === 'dispatched' && s.x === i && s.y === 1);
                      const isOccupied = guests.some(g => g.room === roomNum);
                      
                      return (
                        <div key={i} 
                          className={`border rounded-lg p-2 relative transition-colors cursor-pointer ${
                            activeIncident ? 'bg-destructive/10 border-destructive shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 
                            isOccupied ? 'bg-zinc-800 border-zinc-700 opacity-80' :
                            'bg-card border-border hover:bg-card/80'
                          }`}
                          onClick={() => activeIncident && setSelectedIncidentId(activeIncident.id)}
                        >
                          <div className="text-xs text-muted-foreground font-mono flex justify-between items-center">
                            {roomNum}
                            {isOccupied && !activeIncident && <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" title="Occupied" />}
                          </div>
                        {activeIncident && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center animate-pulse">
                              {activeIncident.type === 'Fire' ? <AlertCircle className="w-4 h-4 text-white" /> : <ShieldAlert className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        )}
                        {activeIncident?.accessibility && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500" />
                        )}
                        {hasStaff && (
                          <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_blue]" />
                        )}
                      </div>
                    )
                  })}

                  {/* Rooms bottom row */}
                  {[7,8,9,10,11,12].map(i => {
                    const roomNum = `4${(i).toString().padStart(2, '0')}`;
                    const activeIncident = incidents.find(inc => inc.room === roomNum && inc.status !== 'resolved');
                    const isOccupied = guests.some(g => g.room === roomNum);
                    
                    return (
                      <div key={i} className={`row-start-3 border rounded-lg p-2 relative transition-colors cursor-pointer ${
                        activeIncident ? 'bg-destructive/10 border-destructive shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 
                        isOccupied ? 'bg-zinc-800 border-zinc-700 opacity-80' :
                        'bg-card border-border'
                      }`}>
                        <div className="text-xs text-muted-foreground font-mono flex justify-between items-center">
                          {roomNum}
                          {isOccupied && !activeIncident && <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" title="Occupied" />}
                        </div>
                        {activeIncident && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center animate-pulse">
                              <AlertCircle className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Exits */}
                  <div className="row-start-4 col-start-1 col-span-2 border-t-4 border-green-500/50 mt-4 flex justify-center text-xs font-mono text-green-500/50 pt-1">STAIRS A</div>
                  <div className="row-start-4 col-start-5 col-span-2 border-t-4 border-green-500/50 mt-4 flex justify-center text-xs font-mono text-green-500/50 pt-1">
                    {wheelchairMode ? <span className="text-purple-500">RAMP / ELEV B</span> : 'STAIRS B'}
                  </div>
                </div>

                {/* Routing Overlay */}
                {wheelchairMode && activeIncidents.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                    <path d="M 150 100 L 150 200 L 600 200 L 600 350" stroke="var(--color-purple-500)" strokeWidth="4" strokeDasharray="8 8" fill="none" className="animate-[dash_1s_linear_infinite]" />
                  </svg>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6 h-64 shrink-0">
              {/* Camera Feed */}
              <Card className="border-border overflow-hidden">
                <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-card">
                  <CardTitle className="text-sm flex items-center gap-2"><Camera className="w-4 h-4" /> Lobby Cam 04</CardTitle>
                  <Badge variant={anomalyScanActive ? "destructive" : "outline"} className="text-xs font-mono">
                    {anomalyScanActive ? `SCAN: ${scanScore.toFixed(0)}% THREAT` : 'LIVE'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 relative h-full bg-black group">
                  {/* Simulated Camera Noise */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
                  {/* Camera overlay UI */}
                  <div className="absolute top-4 left-4 text-white/50 font-mono text-xs">REC • {format(new Date(), 'HH:mm:ss:SS')}</div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    <Button variant="secondary" onClick={handleRunScan}>
                      <Search className="w-4 h-4 mr-2" /> Run Anomaly Scan
                    </Button>
                  </div>
                  {anomalyScanActive && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-destructive transition-all duration-200" style={{ width: `${scanScore}%` }} />
                      </div>
                      <div className="text-destructive font-mono text-xs mt-2 text-center">ANALYZING PATTERNS...</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Radar */}
              <Card className="border-border flex flex-col">
                <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-card shrink-0">
                  <CardTitle className="text-sm flex items-center gap-2"><Twitter className="w-4 h-4 text-blue-400" /> Social Radar</CardTitle>
                  <Badge className={`bg-${radar?.threatLevel === 'High' ? 'destructive' : radar?.threatLevel === 'Medium' ? 'orange-500' : 'green-500'}`}>
                    Threat: {radar?.threatLevel || 'Low'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden relative">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {radar?.posts.map((post, i) => (
                        <div key={i} className="text-sm border-l-2 border-blue-500/30 pl-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-muted-foreground">{post.handle}</span>
                            <span className="text-xs text-muted-foreground/50">{post.timestamp}</span>
                          </div>
                          <p>{post.text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Col: Incident Details & Feed */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Active Incident Details Panel */}
            <Card className={`border-2 flex-1 flex flex-col overflow-hidden transition-all duration-300 ${selectedIncident ? 'border-primary shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-primary/20' : 'border-border'}`}>
              <CardHeader className="p-4 border-b bg-card shrink-0">
                <CardTitle className="text-lg">Incident Details</CardTitle>
                {selectedIncident ? (
                  <CardDescription>ID: {selectedIncident.id.substring(0,8)}</CardDescription>
                ) : (
                  <CardDescription>Select an incident on the map</CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden relative">
                {selectedIncident ? (
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-6">
                      
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="destructive" className="mb-2 uppercase tracking-wider">{selectedIncident.type}</Badge>
                          <h3 className="text-2xl font-bold">Room {selectedIncident.room}</h3>
                          <p className="text-muted-foreground">Floor {selectedIncident.floor}</p>
                        </div>
                        <Badge variant="outline" className={`px-3 py-1 uppercase ${selectedIncident.status === 'resolved' ? 'border-green-500 text-green-500' : selectedIncident.status === 'accepted' ? 'border-primary text-primary' : 'border-destructive text-destructive'}`}>
                          {selectedIncident.status}
                        </Badge>
                      </div>

                      {selectedIncident.guestName && (
                        <div className="bg-card border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1 uppercase font-mono">Guest Info</p>
                          <p className="font-medium">{selectedIncident.guestName}</p>
                          {selectedIncident.accessibility && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {Object.entries(selectedIncident.accessibility).map(([key, value]) => {
                                if (value) return <Badge key={key} variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">{key}</Badge>
                                return null;
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {selectedIncident.aiSummary && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs text-primary mb-1 uppercase font-mono flex items-center gap-1"><Activity className="w-3 h-3" /> AI Summary</p>
                          <p className="text-sm">{selectedIncident.aiSummary}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase font-mono">Action Log</p>
                        <div className="border-l-2 border-border ml-2 pl-4 space-y-4 relative">
                          {selectedIncident.log.map((entry, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-muted-foreground ring-4 ring-background" />
                              <p className="text-xs text-muted-foreground mb-0.5">{format(new Date(entry.timestamp), 'HH:mm:ss')}</p>
                              <p className="text-sm">{entry.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 p-6 text-center">
                    <MapPin className="w-12 h-12 mb-4" />
                    <p>No incident selected.</p>
                    <p className="text-sm">Click an active alert on the floor plan to view details.</p>
                  </div>
                )}
              </CardContent>
              {selectedIncident && (
                <div className="p-4 border-t bg-card shrink-0 space-y-2">
                  {selectedIncident.status === 'active' && (
                    <Button className="w-full" onClick={() => handleUpdateStatus(selectedIncident.id, 'accepted')}>
                      Accept & Dispatch Staff
                    </Button>
                  )}
                  {selectedIncident.status === 'accepted' && (
                    <Button variant="outline" className="w-full border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved')}>
                      Mark Resolved
                    </Button>
                  )}
                  {selectedIncident.status === 'resolved' && (
                    <Button variant="secondary" className="w-full" onClick={() => handleGenerateDebrief(selectedIncident.id)}>
                      <FileText className="w-4 h-4 mr-2" /> Generate AI Debrief
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* AI Command Center */}
            <Card className="border-border shrink-0 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
              <CardHeader className="p-3 border-b bg-card/80 shrink-0 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> AI Command Center
                  {recommendActions.isPending && (
                    <span className="text-[10px] font-mono text-primary animate-pulse">analyzing…</span>
                  )}
                </CardTitle>
                {recommendation && (
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] uppercase ${
                      recommendation.severity === 'critical'
                        ? 'border-destructive text-destructive'
                        : recommendation.severity === 'high'
                        ? 'border-orange-400 text-orange-400'
                        : recommendation.severity === 'medium'
                        ? 'border-yellow-400 text-yellow-400'
                        : 'border-green-500 text-green-500'
                    }`}
                  >
                    {recommendation.severity} · P{recommendation.priorityScore}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-3 max-h-72 overflow-auto">
                {!selectedIncident && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                    <Zap className="w-3.5 h-3.5" /> Select an incident to receive AI-driven response playbook.
                  </div>
                )}
                {selectedIncident && !recommendation && (
                  <div className="space-y-2 py-2">
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                )}
                {selectedIncident && recommendation && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA {recommendation.eta}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Score {recommendation.priorityScore}</span>
                    </div>
                    <ol className="space-y-2">
                      {recommendation.actions.map((a, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex gap-3 items-start"
                        >
                          <div className="w-6 h-6 rounded-md bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-snug">{a.title}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{a.detail}</p>
                          </div>
                        </motion.li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Feeds: Activity / Radio / Heatmap tabs */}
            <Card className="h-72 flex flex-col border-border shrink-0 overflow-hidden">
              <Tabs defaultValue="activity" className="flex-1 flex flex-col">
                <CardHeader className="p-2 border-b bg-card shrink-0">
                  <TabsList className="grid grid-cols-4 h-8">
                    <TabsTrigger value="activity" className="text-xs">
                      <Activity className="w-3.5 h-3.5 mr-1" /> Feed
                    </TabsTrigger>
                    <TabsTrigger value="radio" className="text-xs">
                      <Radio className="w-3.5 h-3.5 mr-1" /> Radio
                    </TabsTrigger>
                    <TabsTrigger value="heatmap" className="text-xs">
                      <Flame className="w-3.5 h-3.5 mr-1" /> Heatmap
                    </TabsTrigger>
                    <TabsTrigger value="guests" className="text-xs">
                      <Users className="w-3.5 h-3.5 mr-1" /> Guests
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden relative">
                  <TabsContent value="activity" className="h-full m-0">
                    <ScrollArea className="h-full p-3">
                      <div className="space-y-3">
                        <AnimatePresence>
                          {activity.map((item) => (
                            <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-start gap-3 text-sm"
                            >
                              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                item.kind === 'alert' ? 'bg-destructive' : 
                                item.kind === 'system' ? 'bg-primary' : 'bg-muted-foreground'
                              }`} />
                              <div>
                                <span className="text-muted-foreground text-xs mr-2">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                                <span className={item.kind === 'alert' ? 'text-foreground font-medium' : 'text-muted-foreground'}>{item.message}</span>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="radio" className="h-full m-0">
                    <ScrollArea className="h-full p-3">
                      <div className="space-y-2 font-mono text-xs">
                        <AnimatePresence initial={false}>
                          {radioFeed.map((line) => (
                            <motion.div
                              key={line.id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-start gap-2 border-l-2 border-primary/40 pl-2 py-1"
                            >
                              <Radio className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  <span className="text-primary">{line.unit}</span>
                                  <span>{format(new Date(line.timestamp), 'HH:mm:ss')}</span>
                                </div>
                                <div className="text-foreground/90 leading-snug">{line.text}</div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="heatmap" className="h-full m-0 p-3">
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground flex items-center justify-between">
                        <span>Predictive Floor Risk</span>
                        <span>incidents · access · social</span>
                      </div>
                      {floorRisk.map((f) => {
                        const color =
                          f.score >= 70
                            ? 'bg-destructive'
                            : f.score >= 40
                            ? 'bg-orange-400'
                            : f.score >= 15
                            ? 'bg-yellow-400'
                            : 'bg-green-500';
                        return (
                          <div key={f.floor} className="flex items-center gap-2">
                            <div className="w-12 text-xs font-mono text-muted-foreground">FL {f.floor}</div>
                            <div className="flex-1 h-3 rounded bg-muted overflow-hidden relative">
                              <motion.div
                                className={`h-full ${color}`}
                                animate={{ width: `${Math.max(4, f.score)}%` }}
                                transition={{ duration: 0.6 }}
                              />
                              {f.incidents > 0 && (
                                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.08)_4px,rgba(255,255,255,0.08)_8px)]" />
                              )}
                            </div>
                            <div className="w-8 text-right text-xs font-mono">{f.score}</div>
                            <div className="w-16 text-[10px] text-muted-foreground font-mono">
                              {f.incidents}i · {f.accGuests}a
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Model: gemini-pred-v2</span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> live
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="guests" className="h-full m-0">
                    <ScrollArea className="h-full p-3">
                      <div className="space-y-3">
                        {guests.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground text-sm">No guests checked in.</div>
                        ) : (
                          guests.map((guest) => (
                            <div key={guest.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
                              <div>
                                <div className="font-bold text-sm">{guest.name}</div>
                                <div className="text-xs text-muted-foreground">Room {guest.room} · Fl {guest.floor}</div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] border-destructive/30 text-destructive hover:bg-destructive hover:text-white"
                                onClick={() => checkoutGuest.mutate(guest.id)}
                                disabled={checkoutGuest.isPending}
                              >
                                Checkout
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash { to { stroke-dashoffset: -16; } }
      `}} />
    </div>
  );
}
