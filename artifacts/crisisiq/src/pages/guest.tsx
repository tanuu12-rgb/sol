import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  useGetGuest, 
  getGetGuestQueryKey, 
  useCreateIncident, 
  usePostCoachMessage, 
  useUpdateIncidentStatus,
  useTranslateText
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, HeartPulse, ShieldAlert, Phone, MapPin, CheckCircle, Send, XCircle, Brain, Accessibility, Languages, LogOut, Gift, Trophy, HelpCircle, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

const LANGUAGES = ["English", "Spanish", "French", "German", "Mandarin", "Japanese", "Korean", "Arabic", "Hindi", "Russian", "Portuguese", "Italian"];

const BASE_STRINGS = {
  tap: "Tap in case of emergency",
  what: "What is your emergency?",
  fire: "Fire / Smoke",
  medical: "Medical Emergency",
  security: "Security Threat",
  cancel: "Cancel",
  emergencyReported: "Emergency Reported",
  imSafe: "I'm Safe Now",
  accessibleRoute: "Accessible Evacuation Route",
  calmCoach: "Calm Coach AI",
  typeMessage: "Type a message...",
  remainCalm: "REMAIN CALM. HELP IS DISPATCHED.",
  instructions: "INSTRUCTIONS:",
  proceed: "Proceed to nearest exit",
  noElevators: "Do not use elevators",
  followStaff: "Follow staff guidance",
  iAmSafe: "I AM SAFE NOW",
  initialCoach: "Emergency reported. Help is on the way. Are you safe right now?",
};

export default function GuestPortal() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const guestId = localStorage.getItem("crisis_guest_id");
  
  const { data: guest, isLoading } = useGetGuest(guestId || "", {
    query: { enabled: !!guestId, queryKey: getGetGuestQueryKey(guestId || "") }
  });

  const createIncident = useCreateIncident();
  const postCoachMessage = usePostCoachMessage();
  const updateIncident = useUpdateIncidentStatus();
  const translateText = useTranslateText();

  const [lang, setLang] = useState<string>("English");
  const [t, setT] = useState(BASE_STRINGS);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (guest?.language && guest.language !== lang) {
      setLang(guest.language);
    }
  }, [guest?.language]);

  useEffect(() => {
    let cancelled = false;
    if (!lang || lang === "English") {
      setT(BASE_STRINGS);
      return;
    }
    setTranslating(true);
    const entries = Object.entries(BASE_STRINGS);
    Promise.all(
      entries.map(([k, v]) =>
        translateText
          .mutateAsync({ data: { text: v, targetLanguage: lang } })
          .then((r) => [k, r.translated || v] as const)
          .catch(() => [k, v] as const),
      ),
    ).then((arr) => {
      if (cancelled) return;
      setT(Object.fromEntries(arr) as typeof BASE_STRINGS);
      setTranslating(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const handleSignOut = () => {
    localStorage.removeItem("crisis_guest_id");
    setLocation("/checkin");
  };

  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [incidentTypeSelectorOpen, setIncidentTypeSelectorOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<{role: 'guest'|'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isVibrating, setIsVibrating] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestId && !isLoading) {
      setLocation("/checkin");
    }
  }, [guestId, isLoading, setLocation]);

  useEffect(() => {
    if (guest?.accessibility?.deaf && activeIncidentId && !isVibrating) {
      setIsVibrating(true);
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 1000]);
        const interval = setInterval(() => {
          navigator.vibrate([500, 200, 500, 200, 1000]);
        }, 5000);
        return () => clearInterval(interval);
      }
    }
    return undefined;
  }, [guest?.accessibility?.deaf, activeIncidentId, isVibrating]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [coachMessages]);

  const handleSos = (type: 'Fire' | 'Medical' | 'Security' | 'Other') => {
    if (!guest) return;
    
    createIncident.mutate({
      data: {
        type,
        room: guest.room,
        floor: guest.floor,
        guestId: guest.id,
      }
    }, {
      onSuccess: async (incident) => {
        setActiveIncidentId(incident.id);
        setIncidentTypeSelectorOpen(false);
        let initial = t.initialCoach;
        if (lang && lang !== "English") {
          try {
            const r = await translateText.mutateAsync({
              data: { text: BASE_STRINGS.initialCoach, targetLanguage: lang },
            });
            if (r.translated) initial = r.translated;
          } catch {}
        }
        setCoachMessages([{ role: 'ai', text: initial }]);
      }
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeIncidentId) return;

    const userText = chatInput;
    setChatInput("");
    setCoachMessages(prev => [...prev, { role: 'guest', text: userText }]);

    postCoachMessage.mutate({
      id: activeIncidentId,
      data: { text: userText, language: lang }
    }, {
      onSuccess: (res) => {
        setCoachMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
      }
    });
  };

  const handleImSafe = () => {
    if (!activeIncidentId) return;
    updateIncident.mutate({
      id: activeIncidentId,
      data: { status: 'resolved' }
    }, {
      onSuccess: () => {
        setActiveIncidentId(null);
        setCoachMessages([]);
        setIsVibrating(false);
        if (navigator.vibrate) navigator.vibrate(0);
      }
    });
  };

  if (isLoading || !guest) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // --- ACCESSIBILITY VIEWS ---

  if (guest.accessibility.deaf && activeIncidentId) {
    return (
      <div className="fixed inset-0 z-50 animate-flashing flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-32 h-32 mb-8" />
        <h1 className="text-6xl font-black uppercase mb-4 tracking-tighter">EMERGENCY</h1>
        <p className="text-3xl font-bold mb-12">{t.remainCalm}</p>
        <div className="bg-black/20 p-8 rounded-2xl backdrop-blur max-w-md w-full mb-12">
          <p className="text-xl font-bold mb-4">{t.instructions}</p>
          <ul className="text-left text-lg font-medium space-y-4">
            <li className="flex items-center gap-3"><MapPin /> {t.proceed}</li>
            <li className="flex items-center gap-3"><XCircle /> {t.noElevators}</li>
            <li className="flex items-center gap-3"><CheckCircle /> {t.followStaff}</li>
          </ul>
        </div>
        <Button size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold" onClick={handleImSafe}>
          {t.iAmSafe}
        </Button>
      </div>
    );
  }

  if (guest.accessibility.visuallyImpaired && activeIncidentId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-12">
          <div className="mx-auto w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse-fast opacity-50" />
            <Phone className="w-16 h-16 text-primary" />
          </div>
          <h2 className="text-2xl text-zinc-400 font-medium mb-2">CrisisIQ Audio Guide</h2>
          <p className="text-4xl text-white font-light tracking-wider">Connected</p>
        </div>
        
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-zinc-900 rounded-2xl p-6 text-center border border-zinc-800">
            <div className="flex justify-center mb-4 space-x-2">
              <div className="w-2 h-8 bg-primary rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
              <div className="w-2 h-12 bg-primary rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.2s]" />
              <div className="w-2 h-6 bg-primary rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.4s]" />
              <div className="w-2 h-10 bg-primary rounded-full animate-[pulse_1.1s_ease-in-out_infinite_0.1s]" />
            </div>
            <p className="text-zinc-300 text-lg">"Take 5 steps forward. The door is on your left."</p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 w-full max-w-sm">
          <Button variant="outline" size="lg" className="h-20 rounded-full border-zinc-800 text-zinc-300 bg-zinc-900" onClick={() => {}}>
            Repeat
          </Button>
          <Button variant="destructive" size="lg" className="h-20 rounded-full font-bold" onClick={handleImSafe}>
            I'm Safe
          </Button>
        </div>
      </div>
    );
  }

  // --- STANDARD VIEW ---

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b flex justify-between items-center bg-card gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-primary w-6 h-6" />
          <span className="font-bold text-lg">CrisisIQ</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-9 w-[140px]" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {translating && <span className="text-xs text-muted-foreground">…</span>}
          </div>
          <div className="text-right">
            <div className="font-semibold">{guest.name}</div>
            <div className="text-sm text-muted-foreground">Room {guest.room} • Fl {guest.floor}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" data-testid="button-signout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 flex flex-col max-w-2xl mx-auto w-full">
        
        {!activeIncidentId ? (
          <div className="flex-1 flex flex-col justify-center pb-20">
            {/* Rewards & Safety Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Gift className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-white border-white/30 bg-white/10 px-3 py-1">
                      Guest Rewards
                    </Badge>
                  </div>
                  <div className="text-3xl font-black mb-1">{guest.rewardPoints}</div>
                  <div className="text-sm text-blue-100 font-medium uppercase tracking-wider">Available Points</div>
                  <div className="mt-4 text-xs text-blue-200">
                    Use points for complimentary food or next booking discounts.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white overflow-hidden border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-white border-white/30 bg-white/10 px-3 py-1">
                      Safety Status
                    </Badge>
                  </div>
                  
                  {guest.hasTakenSurvey ? (
                    <div>
                      <div className="text-xl font-bold mb-1">Safety Certified</div>
                      <div className="text-sm text-emerald-100">Score: {guest.surveyScore}%</div>
                      {guest.surveyScore && guest.surveyScore >= 75 && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="mt-4 w-full bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
                          onClick={() => {
                            toast.success("Certificate Generated", {
                              description: "Your Safety Hero certificate has been downloaded to your device.",
                            });
                          }}
                        >
                          <Award className="w-4 h-4 mr-2" /> Download Certificate
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-bold mb-1">Safety Training</div>
                      <div className="text-sm text-emerald-100">Earn up to 50 points!</div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="mt-4 w-full bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
                        onClick={() => setLocation("/guest/survey")}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" /> Take Safety Survey
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {guest.accessibility.nonVerbal ? (
              <div className="grid grid-cols-2 gap-4 h-[60vh]">
                <button onClick={() => handleSos('Fire')} className="bg-orange-500 hover:bg-orange-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-colors">
                  <AlertCircle className="w-20 h-20" />
                  <span className="text-3xl font-bold">FIRE</span>
                </button>
                <button onClick={() => handleSos('Medical')} className="bg-red-500 hover:bg-red-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-colors">
                  <HeartPulse className="w-20 h-20" />
                  <span className="text-3xl font-bold">MEDICAL</span>
                </button>
                <button onClick={() => handleSos('Other')} className="bg-blue-500 hover:bg-blue-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-colors">
                  <ShieldAlert className="w-20 h-20" />
                  <span className="text-3xl font-bold">HELP</span>
                </button>
                <button onClick={() => handleSos('Security')} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-colors">
                  <AlertCircle className="w-20 h-20" />
                  <span className="text-3xl font-bold">UNSAFE</span>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <AnimatePresence>
                  {!incidentTypeSelectorOpen ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <button 
                        onClick={() => setIncidentTypeSelectorOpen(true)}
                        className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-full bg-destructive text-destructive-foreground flex flex-col items-center justify-center shadow-[0_0_50px_rgba(255,0,0,0.3)] hover:shadow-[0_0_80px_rgba(255,0,0,0.5)] transition-all transform hover:scale-105 active:scale-95"
                      >
                        <ShieldAlert className="w-24 h-24 mb-4" />
                        <span className="text-5xl font-black tracking-widest">SOS</span>
                      </button>
                      <p className="mt-8 text-xl text-muted-foreground font-medium">{t.tap}</p>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <h2 className="text-2xl font-bold mb-6">{t.what}</h2>
                      <Button size="lg" className="w-full h-16 text-xl bg-orange-600 hover:bg-orange-700" onClick={() => handleSos('Fire')}>
                        <AlertCircle className="mr-3 w-6 h-6" /> {t.fire}
                      </Button>
                      <Button size="lg" className="w-full h-16 text-xl bg-red-600 hover:bg-red-700" onClick={() => handleSos('Medical')}>
                        <HeartPulse className="mr-3 w-6 h-6" /> {t.medical}
                      </Button>
                      <Button size="lg" className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700" onClick={() => handleSos('Security')}>
                        <ShieldAlert className="mr-3 w-6 h-6" /> {t.security}
                      </Button>
                      <Button variant="outline" size="lg" className="w-full h-16 text-xl mt-4" onClick={() => setIncidentTypeSelectorOpen(false)}>
                        {t.cancel}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col h-full relative">
            <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="font-bold text-lg">{t.emergencyReported}</span>
              </div>
              <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={handleImSafe}>
                {t.imSafe}
              </Button>
            </div>

            {guest.accessibility.wheelchair && (
              <Card className="mb-6 border-primary/50 overflow-hidden">
                <div className="bg-primary/10 p-3 border-b border-primary/20 flex items-center gap-2 text-primary font-medium">
                  <Accessibility className="w-5 h-5" /> {t.accessibleRoute}
                </div>
                <div className="h-48 bg-card flex items-center justify-center relative">
                  <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <div className="w-3/4 h-2 bg-muted rounded-full relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_blue]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500">
                      <div className="w-3 h-3 bg-green-500 rounded-sm" />
                    </div>
                    <div className="h-full bg-primary rounded-full w-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '20px 20px', animation: 'slide 1s linear infinite' }} />
                  </div>
                </div>
              </Card>
            )}

            <Card className="flex-1 flex flex-col border-2 overflow-hidden shadow-xl mb-4">
              <div className="bg-muted p-3 border-b flex items-center gap-2 font-medium">
                <Brain className="w-5 h-5 text-primary" /> {t.calmCoach}
              </div>
              <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {coachMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'ai' ? 'bg-primary/20 text-foreground rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex gap-2">
                <Input 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder={t.typeMessage} 
                  className="flex-1 bg-background"
                />
                <Button type="submit" size="icon" disabled={!chatInput.trim() || postCoachMessage.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Card>

          </motion.div>
        )}
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide { from { background-position: 0 0; } to { background-position: 20px 0; } }
      `}} />
    </div>
  );
}
