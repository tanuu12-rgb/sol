import { Router, type IRouter } from "express";
import {
  UpdateStaffLocationBody,
  UpdateStaffLocationParams,
  UpdateStaffStatusBody,
  UpdateStaffStatusParams,
} from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

router.get("/staff", (_req, res) => {
  res.json(store.staff);
});

router.post("/staff/:id/location", (req, res) => {
  const { id } = UpdateStaffLocationParams.parse(req.params);
  const body = UpdateStaffLocationBody.parse(req.body);
  const member = store.staff.find((s) => s.id === id);
  if (!member) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }
  member.floor = body.floor;
  member.x = body.x;
  member.y = body.y;
  res.json(member);
});

router.post("/staff/:id/status", (req, res) => {
  const { id } = UpdateStaffStatusParams.parse(req.params);
  const body = UpdateStaffStatusBody.parse(req.body);
  const member = store.staff.find((s) => s.id === id);
  if (!member) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }
  member.status = body.status;
  res.json(member);
});

export default router;
