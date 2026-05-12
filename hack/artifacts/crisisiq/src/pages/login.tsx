import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const defaultRole = searchParams.get("role") || "manager";
  
  const [email, setEmail] = useState(defaultRole === "manager" ? "manager@hotel.com" : "staff@hotel.com");
  const [password, setPassword] = useState("demo123");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes("manager")) {
      setLocation("/dashboard");
    } else {
      setLocation("/staff");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, hsl(var(--primary)) 0%, transparent 40%)', filter: 'blur(80px)' }} />
      
      <Button 
        variant="ghost" 
        className="absolute top-6 left-6 text-muted-foreground hover:text-foreground"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-2 shadow-2xl bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">System Login</CardTitle>
            <CardDescription className="text-base">
              Authorized personnel only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@hotel.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="bg-background/50"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-medium mt-6">
                Authenticate
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <Button variant="link" className="text-muted-foreground hover:text-primary" onClick={() => setLocation("/checkin")}>
              Continue as Guest
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
