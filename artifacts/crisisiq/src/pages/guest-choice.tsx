import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserPlus, UserCheck, ArrowRight, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function GuestChoice() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(var(--primary)) 0%, transparent 40%)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle at 80% 70%, hsl(var(--primary)) 0%, transparent 40%)' }} />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 z-10"
      >
        <div className="inline-flex items-center justify-center p-3 mb-6 bg-primary/10 rounded-full">
          <ShieldAlert className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Guest Access</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Welcome to CrisisIQ. Please select an option to continue to your emergency portal.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full z-10">
        {/* Path 1: New Guest */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/checkin/register" className="block group">
            <Card className="h-full border-2 border-transparent group-hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur shadow-lg hover:shadow-primary/10">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-2">New Registration</CardTitle>
                <CardDescription className="text-base">
                  Yet to check in? Create your safety profile and register your room.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <div className="flex items-center gap-2 text-primary font-bold group-hover:translate-x-2 transition-transform">
                  Start Registration <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Path 2: Returning Guest */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/checkin/signin" className="block group">
            <Card className="h-full border-2 border-transparent group-hover:border-blue-500/50 transition-all duration-300 bg-card/50 backdrop-blur shadow-lg hover:shadow-blue-500/10">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-10 h-10 text-blue-500" />
                </div>
                <CardTitle className="text-2xl mb-2">Returning Guest</CardTitle>
                <CardDescription className="text-base">
                  Already checked in? Sign in with your room number to access your portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <div className="flex items-center gap-2 text-blue-500 font-bold group-hover:translate-x-2 transition-transform">
                  Go to Portal <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors underline underline-offset-4">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
