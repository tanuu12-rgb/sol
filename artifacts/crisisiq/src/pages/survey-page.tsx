import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetSurveyQuestions, useSubmitSurvey, useGetGuest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2, XCircle, Award, ArrowRight, Home, Flame, HeartPulse, Shield, Zap, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Confetti from "react-confetti";
import { getGetGuestQueryKey } from "@workspace/api-client-react";

export default function SurveyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const guestId = localStorage.getItem("crisis_guest_id");

useGetGuest(guestId!, {
  query: {
    enabled: !!guestId,
    queryKey: getGetGuestQueryKey(guestId!),
  },
});
  const { data: questions, isLoading } = useGetSurveyQuestions();
  const submitSurvey = useSubmitSurvey();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [surveyResult, setSurveyResult] = useState<{
    score: number;
    rewardPointsEarned: number;
    totalRewardPoints: number;
    passed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!guestId) {
      setLocation("/checkin");
    }
  }, [guestId, setLocation]);

  if (isLoading || !questions) {
    return <div className="min-h-screen flex items-center justify-center">Loading survey...</div>;
  }

  const handleOptionSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    if (!showExplanation) {
      setShowExplanation(true);
      return;
    }

    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    setSelectedOption(null);
    setShowExplanation(false);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit survey
      submitSurvey.mutate({
        data: {
          guestId: guestId!,
          answers: newAnswers
        }
      }, {
        onSuccess: (data) => {
          setSurveyResult(data);
          setSurveyCompleted(true);
        },
        onError: (err: any) => {
          toast({
            title: "Submission Failed",
            description: err.message || "Failed to submit survey results.",
            variant: "destructive"
          });
        }
      });
    }
  };

  if (surveyCompleted && surveyResult) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 flex flex-col items-center justify-center">
        {surveyResult.passed && <Confetti recycle={false} numberOfPieces={500} />}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center overflow-hidden border-2 border-primary/20 shadow-2xl">
            <div className={`h-3 ${surveyResult.passed ? 'bg-green-500' : 'bg-orange-500'}`} />
            <CardHeader>
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                {surveyResult.passed ? (
                  <Award className="w-12 h-12 text-primary" />
                ) : (
                  <Info className="w-12 h-12 text-orange-500" />
                )}
              </div>
              <CardTitle className="text-3xl font-bold">Survey Complete!</CardTitle>
              <CardDescription className="text-lg">
                {surveyResult.passed 
                  ? "Great job! You're a safety expert." 
                  : "You've completed the survey. Keep practicing!"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-xl">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Your Score</div>
                  <div className="text-4xl font-black text-primary">{surveyResult.score}%</div>
                </div>
                <div className="p-4 bg-muted rounded-xl">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Points Earned</div>
                  <div className="text-4xl font-black text-green-500">+{surveyResult.rewardPointsEarned}</div>
                </div>
              </div>

              {surveyResult.passed && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-4 text-left">
                  <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                  <div>
                    <div className="font-bold text-green-700">Certificate Unlocked!</div>
                    <div className="text-sm text-green-600/80">You can now download your Safety Hero certificate from the portal.</div>
                  </div>
                </div>
              )}

              <p className="text-muted-foreground">
                Your reward points have been added to your profile and can be used for complimentary food or future bookings.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setLocation("/guest")} 
                className="w-full h-14 text-lg font-bold"
              >
                <Home className="w-5 h-5 mr-2" /> Return to Portal
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
  const progress = ((currentStep + (showExplanation ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              Emergency Safety Survey
            </h1>
            <p className="text-muted-foreground">Earn rewards while learning to stay safe.</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Question</div>
            <div className="text-2xl font-black">{currentStep + 1} / {questions.length}</div>
          </div>
        </div>

        <Progress value={progress} className="h-3" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep + (showExplanation ? "-exp" : "-q")}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 shadow-xl overflow-hidden">
              <CardHeader className="bg-primary/5 pb-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    {currentStep === 0 && <Flame className="w-6 h-6" />}
                    {currentStep === 1 && <HeartPulse className="w-6 h-6" />}
                    {currentStep === 2 && <Shield className="w-6 h-6" />}
                    {currentStep === 3 && <Zap className="w-6 h-6" />}
                    {currentStep >= 4 && <Info className="w-6 h-6" />}
                  </div>
                </div>
                <CardTitle className="text-2xl leading-tight">
                  {currentQuestion.question}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-8 space-y-4">
                <div className="grid gap-3">
                  {currentQuestion.options.map((option, idx) => {
                    let variant = "outline";
                    let icon = null;

                    if (selectedOption === idx) {
                      if (showExplanation) {
                        if (isCorrect) {
                          variant = "success";
                          icon = <CheckCircle2 className="w-5 h-5" />;
                        } else {
                          variant = "destructive";
                          icon = <XCircle className="w-5 h-5" />;
                        }
                      } else {
                        variant = "primary";
                      }
                    } else if (showExplanation && idx === currentQuestion.correctAnswerIndex) {
                      variant = "success-outline";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={showExplanation}
                        className={`
                          flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left text-lg font-medium
                          ${variant === "outline" ? "border-border hover:border-primary/50 hover:bg-primary/5" : ""}
                          ${variant === "primary" ? "border-primary bg-primary/10 text-primary" : ""}
                          ${variant === "success" ? "border-green-500 bg-green-500 text-white" : ""}
                          ${variant === "destructive" ? "border-red-500 bg-red-500 text-white" : ""}
                          ${variant === "success-outline" ? "border-green-500/50 bg-green-50 text-green-700" : ""}
                          ${showExplanation && selectedOption !== idx && idx !== currentQuestion.correctAnswerIndex ? "opacity-50" : ""}
                        `}
                      >
                        <span>{option}</span>
                        {icon}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-6 p-6 bg-slate-100 dark:bg-slate-800 rounded-xl border-l-4 border-primary"
                    >
                      <h4 className="font-bold flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-primary" />
                        Why this matters:
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300">
                        {currentQuestion.explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t p-6">
                <Button 
                  onClick={handleNext} 
                  disabled={selectedOption === null || submitSurvey.isPending}
                  className="ml-auto h-12 px-8 text-lg font-bold"
                >
                  {submitSurvey.isPending ? "Submitting..." : (
                    <>
                      {showExplanation ? (currentStep === questions.length - 1 ? "Finish Survey" : "Next Question") : "Check Answer"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3">
          <Award className="w-5 h-5 text-primary" />
          <p className="text-sm text-primary/80 font-medium">
            Tip: Correct answers earn you 10 hotel reward points each! Get 75% or higher to earn a Safety Hero certificate.
          </p>
        </div>
      </div>
    </div>
  );
}
