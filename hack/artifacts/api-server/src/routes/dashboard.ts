import { Router, type IRouter } from "express";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/dashboard/summary", (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resolvedToday = store.incidents.filter(
    (i) => i.resolvedAt && new Date(i.resolvedAt) >= today,
  );
  const responseTimes = resolvedToday
    .map((i) =>
      i.resolvedAt
        ? (new Date(i.resolvedAt).getTime() -
            new Date(i.createdAt).getTime()) /
          1000
        : 0,
    )
    .filter((n) => n > 0);
  const avg =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  res.json({
    activeIncidents: store.incidents.filter((i) => i.status !== "resolved")
      .length,
    resolvedToday: resolvedToday.length,
    staffAvailable: store.staff.filter((s) => s.status === "available").length,
    staffDispatched: store.staff.filter((s) => s.status === "dispatched")
      .length,
    accessibilityGuests: store.guests.filter(
      (g) =>
        g.accessibility.deaf ||
        g.accessibility.wheelchair ||
        g.accessibility.visuallyImpaired ||
        g.accessibility.nonVerbal ||
        g.accessibility.cognitive,
    ).length,
    avgResponseSeconds: Math.round(avg),
  });
});

router.get("/dashboard/activity", (_req, res) => {
  res.json(store.activity);
});

export default router;
