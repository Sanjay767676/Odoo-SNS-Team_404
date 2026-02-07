import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth } from "./auth-utils";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        // In this app, "plans" are often associated with products or company-wide.
        // If there are no company plans, return an empty array or 404 text.
        const allPlans = await storage.getPlans(user.companyId);

        if (!allPlans || allPlans.length === 0) {
            // The user wanted "No products" displayed if no products/plans exist.
            // We return an empty array so the frontend can handle it gracefully.
            return res.json([]);
        }

        res.json(allPlans);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const {
            productId,
            name,
            price,
            billingPeriod,
            minQuantity,
            startDate,
            endDate,
            pausable,
            renewable,
            closable,
            autoClose,
            discountType,
            discountValue,
            taxPercent
        } = req.body;

        if (!productId || !name || !price || !billingPeriod) {
            return res.status(400).send("Product ID, name, price, and billing period are required");
        }

        const plan = await storage.createPlan({
            productId,
            name,
            price: price.toString(),
            billingPeriod,
            minQuantity: minQuantity || 1,
            startDate: startDate || null,
            endDate: endDate || null,
            pausable: pausable || false,
            renewable: renewable !== false, // Default to true
            closable: closable !== false, // Default to true
            autoClose: autoClose || false,
            discountType: discountType || null,
            discountValue: discountValue ? discountValue.toString() : null,
            taxPercent: taxPercent ? taxPercent.toString() : "18",
            companyId: user.companyId,
        });

        res.json(plan);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
