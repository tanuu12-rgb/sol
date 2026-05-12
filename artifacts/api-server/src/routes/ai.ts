import { Router, type IRouter } from "express";
import {
  ClassifyEmergencyBody,
  GenerateDebriefParams,
  GenerateWellnessParams,
  RecommendActionsParams,
  TranslateTextBody,
} from "@workspace/api-zod";
import { store } from "../lib/store";
import {
  classifyEmergency,
  debriefReport,
  recommendActions,
  socialRadarSummary,
  translate,
  wellnessMessage,
} from "../lib/ai";

const router: IRouter = Router();

router.post("/ai/classify", async (req, res) => {
  const body = ClassifyEmergencyBody.parse(req.body);
  const result = await classifyEmergency(body.description);
  res.json(result);
});

router.post("/ai/translate", async (req, res) => {
  const body = TranslateTextBody.parse(req.body);
  const translated = await translate(body.text, body.targetLanguage);
  res.json({ translated });
});

router.post("/ai/debrief/:incidentId", async (req, res) => {
  const { incidentId } = GenerateDebriefParams.parse(req.params);
  const incident = store.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const report = await debriefReport(incident);
  res.json({ incidentId, ...report });
});

router.post("/ai/wellness/:incidentId", async (req, res) => {
  const { incidentId } = GenerateWellnessParams.parse(req.params);
  const incident = store.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const guest = incident.guestId
    ? store.guests.find((g) => g.id === incident.guestId)
    : null;
  const result = await wellnessMessage(
    guest?.name ?? "Guest",
    guest?.language ?? "en",
    incident.type,
  );
  store.addActivity(
    "wellness",
    `Wellness message sent to ${guest?.name ?? "guest"} (${result.language})`,
  );
  res.json(result);
});

const radarPosts = [
  { handle: "@gridcity_local", text: "Smoke smell drifting near Grand Hotel right now #emergency", timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString() },
  { handle: "@cityscanner", text: "Two fire trucks heading toward downtown, possible incident at large hotel", timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString() },
  { handle: "@stayhive", text: "Anyone else hearing alarms near the convention center hotels?", timestamp: new Date(Date.now() - 1000 * 60 * 13).toISOString() },
  { handle: "@traveltips", text: "Lobby was crowded but staff handled check-in quickly tonight", timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString() },
];

router.post("/ai/recommend/:incidentId", async (req, res) => {
  const { incidentId } = RecommendActionsParams.parse(req.params);
  const incident = store.incidents.find((i) => i.id === incidentId);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  const result = await recommendActions(incident);
  res.json(result);
});

router.get("/ai/social-radar", async (_req, res) => {
  const summary = await socialRadarSummary(radarPosts);
  res.json({ ...summary, posts: radarPosts });
});

export default router;
