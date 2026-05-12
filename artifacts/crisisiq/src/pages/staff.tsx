import { useState } from "react";
import { useLocation } from "wouter";
import { 
  useListIncidents, getListIncidentsQueryKey,
  useUpdateIncidentStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, ShieldAlert, AlertCircle, Accessibility, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function StaffView() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Mock staff session
  const staffRole = "Security Responder";
  const staffStatus = "dispatched";

  const { data: incidents = [] } = useListIncidents(undefined, {
    query: { refetchInterval: 3000, queryKey: getListIncidentsQueryKey() }
  });
  
  const updateIncident = useUpdateIncidentStatus();

  // Staff only see active or accepted incidents assigned to them (mocking assigned logic here by just showing active/accepted)
  const activeTasks = incidents.filter(i => i.status !== 'resolved');

  const handleStatusChange = (id: string, status: 'accepted' | 'resolved') => {
    updateIncident.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Mobile Top Bar */}
      <header className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="font-bold text-lg">{staffRole}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-blue-400 uppercase tracking-wider">{staffStatus}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-xs font-bold">JD</span>
          </div>
        </Button>
      </header>

      {/* Geolocation Mock */}
      <div className="bg-zinc-900/50 p-3 flex items-center justify-center gap-2 text-xs text-zinc-500 border-b border-zinc-800">
        <Navigation className="w-3 h-3" /> GPS Tracking Active • Accuracy: 2.1m
      </div>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Assigned Tasks ({activeTasks.length})</h2>

        <AnimatePresence>
          {activeTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
              <p>No active tasks.</p>
              <p className="text-xs mt-1">Stand by for dispatch.</p>
            </motion.div>
          ) : (
            activeTasks.map((task) => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
              >
                <Card className={`border-2 bg-zinc-900 overflow-hidden ${task.status === 'active' ? 'border-red-500/50' : 'border-blue-500/50'}`}>
                  <div className={`h-2 ${task.status === 'active' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${task.type === 'Fire' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                          {task.type === 'Fire' ? <AlertCircle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{task.type} Alert</h3>
                          <Badge variant="outline" className="mt-1 bg-zinc-800 border-zinc-700">{task.status}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950 rounded-xl p-4 mb-4 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase">Location</p>
                        <p className="text-2xl font-bold mt-1">Room {task.room}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase">Floor</p>
                        <p className="text-2xl font-bold mt-1">{task.floor}</p>
                      </div>
                    </div>

                    {task.accessibility && Object.values(task.accessibility).some(v => v) && (
                      <div className="bg-purple-950/30 border border-purple-900/50 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                          <Accessibility className="w-4 h-4" />
                          <span className="font-bold text-sm">GUEST REQUIRES ASSISTANCE</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(task.accessibility).map(([key, val]) => {
                            if (val) return <Badge key={key} className="bg-purple-600 hover:bg-purple-700">{key}</Badge>
                            return null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      {task.status === 'active' ? (
                        <Button size="lg" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusChange(task.id, 'accepted')}>
                          Accept Task
                        </Button>
                      ) : (
                        <Button size="lg" variant="outline" className="w-full h-14 text-lg font-bold border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => handleStatusChange(task.id, 'resolved')}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
