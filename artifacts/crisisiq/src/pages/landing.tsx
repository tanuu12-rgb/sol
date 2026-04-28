import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, User, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 50%)', filter: 'blur(100px)' }} />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10 mb-12"
      >
        <div className="inline-flex items-center justify-center p-3 mb-6 bg-primary/10 rounded-full">
          <ShieldAlert className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">CrisisIQ</h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto">
          Every second counts. Every guest matters.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link href="/login?role=manager" className="block h-full transition-transform hover:-translate-y-2 focus-visible:-translate-y-2 outline-none">
            <Card className="h-full border-2 hover:border-primary transition-colors bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <ShieldAlert className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Manager Dashboard</CardTitle>
                <CardDescription className="text-base">Operations cockpit for hotel security and management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-primary font-medium mt-4">
                  Enter Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Link href="/login?role=staff" className="block h-full transition-transform hover:-translate-y-2 focus-visible:-translate-y-2 outline-none">
            <Card className="h-full border-2 hover:border-blue-500 transition-colors bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">Staff View</CardTitle>
                <CardDescription className="text-base">Mobile task tracking and emergency routing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-blue-500 font-medium mt-4">
                  Enter Staff Portal <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Link href="/checkin" className="block h-full transition-transform hover:-translate-y-2 focus-visible:-translate-y-2 outline-none">
            <Card className="h-full border-2 hover:border-green-500 transition-colors bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Guest Portal</CardTitle>
                <CardDescription className="text-base">Accessibility-first emergency assistance & check-in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-green-500 font-medium mt-4">
                  Enter Guest Portal <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
