import { Router, type IRouter } from "express";
import { SubmitSurveyBody } from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/survey/questions", (_req, res) => {
  res.json(store.surveyQuestions);
});

router.post("/survey/submit", (req, res) => {
  try {
    const body = SubmitSurveyBody.parse(req.body);
    const result = store.submitSurvey(body.guestId, body.answers);
    res.json(result);
  } catch (error) {
    console.error("Survey submission error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to submit survey" 
    });
  }
});

export default router;
