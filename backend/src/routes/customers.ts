import { Router } from "express";
import { getCustomer, listCustomers, createCustomer, bulkCreateCustomers } from "../controllers/customers.controller.js";

const router = Router();

router.get("/", listCustomers);
router.post("/", createCustomer);
router.post("/bulk", bulkCreateCustomers);
router.get("/:id", getCustomer);

export default router;
