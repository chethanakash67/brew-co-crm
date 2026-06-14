import { Router } from "express";
import { receiveCallback } from "../controllers/receipts.controller.js";

const router = Router();

router.post("/callback", receiveCallback);

export default router;
