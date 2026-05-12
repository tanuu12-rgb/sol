import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useListGuests } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { UserCheck, ArrowLeft, ShieldCheck } from "lucide-react";

export default function GuestSignin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: existingGuests } = useListGuests();
  const [signInRoom, setSignInRoom] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const room = signInRoom.trim();
    if (!room) return;
    
    const match = existingGuests?.find(
      (g) => g.room.toLowerCase() === room.toLowerCase(),
    );
    
    if (!match) {
      toast({
        title: "Room not found",
        description: "We couldn't find a guest checked in to that room. Please register first.",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem("crisis_guest_id", match.id);
    toast({
      title: "Welcome back!",
      description: `Signed in to Room ${match.room}.`,
    });
    setLocation("/guest");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Link href="/checkin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to selection
          </Link>
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Guest Sign In</h1>
          <p className="mt-2 text-muted-foreground">Enter your room number to access your portal.</p>
        </motion.div>

        <Card className="bg-card/50 backdrop-blur border-2 border-blue-500/20 shadow-xl overflow-hidden">
          <div className="h-2 bg-blue-500" />
          <CardHeader>
            <CardTitle className="text-xl">Access Portal</CardTitle>
            <CardDescription>Authentication required for emergency features.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Enter Room Number (e.g. 412)"
                    value={signInRoom}
                    onChange={(e) => setSignInRoom(e.target.value)}
                    className="h-14 pl-12 text-lg"
                    data-testid="input-signin-room"
                  />
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 font-bold" data-testid="button-signin">
                Enter Portal
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don't have a profile? <Link href="/checkin/register" className="text-primary hover:underline">Register now</Link>
        </p>
      </div>
    </div>
  );
}
