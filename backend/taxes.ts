import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getTaxes(user.companyId);
    res.json(all);
});

router.post("/", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const { name, percentage, type } = req.body;
        if (!name || percentage === undefined || !type) return res.status(400).send("Name, percentage, and type are required");

        const tax = await storage.createTax({
            name,
            percentage: String(percentage),
            type,
            companyId: user.companyId,
        });
        res.json(tax);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.delete("/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const tax = await storage.getTax(id);
        if (!tax || tax.companyId !== user.companyId) return res.status(404).send("Tax not found");

        await storage.deleteTax(id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
