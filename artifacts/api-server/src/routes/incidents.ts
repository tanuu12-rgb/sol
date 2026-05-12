import { Router, type IRouter } from "express";
import {
  CreateIncidentBody,
  GetIncidentParams,
  ListIncidentsQueryParams,
  PostCoachMessageBody,
  PostCoachMessageParams,
  UpdateIncidentStatusBody,
  UpdateIncidentStatusParams,
} from "@workspace/api-zod";
import { store } from "../lib/store";
import { calmCoachReply, classifyEmergency } from "../lib/ai";
import type { Guest } from "../lib/store";

const router: IRouter = Router();

router.get("/incidents", (req, res) => {
  const params = ListIncidentsQueryParams.parse(req.query);
  let list = store.incidents;
  if (params.status) {
    list = list.filter((i) => i.status === params.status);
  }
  res.json(list);
});

router.post("/incidents", async (req, res) => {
  const body = CreateIncidentBody.parse(req.body);
  const incident = store.createIncident(body);
  if (body.description) {
    classifyEmergency(body.description)
      .then((c) => store.setAiSummary(incident.id, c.summary))
      .catch(() => {});
  }
  res.json(incident);
});

router.get("/incidents/:id", (req, res) => {
  const { id } = GetIncidentParams.parse(req.params);
  const incident = store.incidents.find((i) => i.id === id);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

router.post("/incidents/:id/status", (req, res) => {
  const { id } = UpdateIncidentStatusParams.parse(req.params);
  const body = UpdateIncidentStatusBody.parse(req.body);
  const incident = store.updateIncidentStatus(id, body.status);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

router.post("/incidents/:id/coach-message", async (req, res) => {
  const { id } = PostCoachMessageParams.parse(req.params);
  const body = PostCoachMessageBody.parse(req.body);
  const incident = store.incidents.find((i) => i.id === id);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  store.appendCoach(id, "guest", body.text);
  const guest: Guest | null = incident.guestId
    ? store.guests.find((g) => g.id === incident.guestId) ?? null
    : null;
  const language = body.language ?? guest?.language ?? null;
  const { reply, spatialMode } = await calmCoachReply({
    type: incident.type,
    room: incident.room,
    language,
    accessibility: incident.accessibility,
    history: incident.coachMessages.map((m) => ({ role: m.role, text: m.text })),
    guestText: body.text,
  });
  store.appendCoach(id, "ai", reply);
  res.json({ reply, spatialMode });
});

export default router;
