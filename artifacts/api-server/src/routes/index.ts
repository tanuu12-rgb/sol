import { Router, type IRouter } from "express";
import healthRouter from "./health";
import guestsRouter from "./guests";
import staffRouter from "./staff";
import incidentsRouter from "./incidents";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";
import surveyRouter from "./survey";

const router: IRouter = Router();

router.use(healthRouter);
router.use(guestsRouter);
router.use(staffRouter);
router.use(incidentsRouter);
router.use(aiRouter);
router.use(dashboardRouter);
router.use(surveyRouter);

export default router;
