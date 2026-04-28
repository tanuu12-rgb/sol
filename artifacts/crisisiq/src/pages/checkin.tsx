import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateGuest, useListGuests } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Ear, EyeOff, Brain, MessageSquareOff, Accessibility, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Mandarin", "Japanese", "Korean", "Arabic", "Hindi", "Russian", "Portuguese", "Italian"
];

export default function Checkin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createGuest = useCreateGuest();
  const { data: existingGuests } = useListGuests();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    room: "",
    floor: "1",
    language: "English"
  });

  const [accessibility, setAccessibility] = useState({
    deaf: false,
    wheelchair: false,
    visuallyImpaired: false,
    nonVerbal: false,
    cognitive: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and room number.",
        variant: "destructive"
      });
      return;
    }

    createGuest.mutate({
      data: {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        room: formData.room,
        language: formData.language,
        accessibility
      }
    }, {
      onSuccess: (guest) => {
        localStorage.setItem("crisis_guest_id", guest.id);
        setLocation("/guest");
      },
      onError: (error: any) => {
        toast({
          title: "Registration Failed",
          description: error.message || "There was an error registering your profile. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleToggle = (key: keyof typeof accessibility) => {
    setAccessibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Link href="/checkin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to selection
          </Link>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Guest Registration</h1>
          <p className="mt-2 text-lg text-muted-foreground">Help us provide the best assistance during your stay.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="bg-card/50 backdrop-blur border-2">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="John Doe" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="john@example.com" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="+1 234 567 890" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room Number</Label>
                <Input 
                  id="room" 
                  value={formData.room} 
                  onChange={e => setFormData({...formData, room: e.target.value})} 
                  placeholder="e.g. 402" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Select value={formData.floor} onValueChange={v => setFormData({...formData, floor: v})}>
                  <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(f => (
                      <SelectItem key={f} value={f.toString()}>Floor {f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select value={formData.language} onValueChange={v => setFormData({...formData, language: v})}>
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-2">
            <CardHeader>
              <CardTitle>Accessibility Profile</CardTitle>
              <CardDescription>Select any that apply to help us tailor our emergency response to your needs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <button type="button" onClick={() => handleToggle('deaf')} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${accessibility.deaf ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80 bg-background/50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${accessibility.deaf ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Ear className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Deaf / Hard of Hearing</div>
                    <div className="text-sm text-muted-foreground">Visual alerts & haptics</div>
                  </div>
                </div>
                {accessibility.deaf && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

              <button type="button" onClick={() => handleToggle('wheelchair')} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${accessibility.wheelchair ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80 bg-background/50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${accessibility.wheelchair ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Accessibility className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Wheelchair User</div>
                    <div className="text-sm text-muted-foreground">Accessible routing</div>
                  </div>
                </div>
                {accessibility.wheelchair && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

              <button type="button" onClick={() => handleToggle('visuallyImpaired')} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${accessibility.visuallyImpaired ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80 bg-background/50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${accessibility.visuallyImpaired ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <EyeOff className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Visually Impaired</div>
                    <div className="text-sm text-muted-foreground">Audio & voice guidance</div>
                  </div>
                </div>
                {accessibility.visuallyImpaired && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

              <button type="button" onClick={() => handleToggle('nonVerbal')} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${accessibility.nonVerbal ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80 bg-background/50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${accessibility.nonVerbal ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <MessageSquareOff className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Non-Verbal</div>
                    <div className="text-sm text-muted-foreground">Pictogram communication</div>
                  </div>
                </div>
                {accessibility.nonVerbal && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

              <button type="button" onClick={() => handleToggle('cognitive')} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left sm:col-span-2 ${accessibility.cognitive ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80 bg-background/50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${accessibility.cognitive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Cognitive Disability</div>
                    <div className="text-sm text-muted-foreground">Simplified instructions & Calm Coach</div>
                  </div>
                </div>
                {accessibility.cognitive && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={createGuest.isPending}>
            {createGuest.isPending ? "Registering..." : "Complete Check-in"}
          </Button>

        </form>
      </div>
    </div>
  );
}
