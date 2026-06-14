import { Router } from "express";
import { createStore, listStores } from "../controllers/stores.controller.js";

const router = Router();

router.get("/", listStores);
router.post("/", createStore);

export default router;
