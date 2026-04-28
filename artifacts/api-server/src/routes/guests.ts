import { Router, type IRouter } from "express";
import { CreateGuestBody, GetGuestParams } from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/guests", (_req, res) => {
  res.json(store.guests);
});

router.post("/guests", (req, res) => {
  try {
    const body = CreateGuestBody.parse(req.body);
    const guest = store.createGuest(body);
    res.json(guest);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to create guest" 
    });
  }
});

router.get("/guests/:id", (req, res) => {
  const { id } = GetGuestParams.parse(req.params);
  const guest = store.guests.find((g) => g.id === id);
  if (!guest) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }
  res.json(guest);
});

router.post("/guests/:id/checkout", (req, res) => {
  const { id } = GetGuestParams.parse(req.params);
  const success = store.checkoutGuest(id);
  if (!success) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
