import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getDiscounts(user.companyId);
    res.json(all);
});

router.post("/", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const { name, type, value, active } = req.body;
        if (!name || !type || value === undefined) return res.status(400).send("Name, type, and value are required");

        const discount = await storage.createDiscount({
            name: name.toUpperCase().trim(),
            type,
            value: String(value),
            active: active !== false,
            companyId: user.companyId,
        });
        res.json(discount);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.delete("/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const discount = await storage.getDiscount(id);
        if (!discount || discount.companyId !== user.companyId) return res.status(404).send("Discount not found");

        await storage.deleteDiscount(id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
