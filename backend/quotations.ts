import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getQuotationTemplates(user.companyId);
    res.json(all);
});

router.post("/", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const { name, validityDays, recurringPlanId, productLines } = req.body;

        if (!name) return res.status(400).send("Template name is required");

        const template = await storage.createQuotationTemplate({
            name,
            validityDays: Number(validityDays) || 30,
            recurringPlanId: recurringPlanId || null,
            productLines: productLines || [],
            adminId: user.id,
            companyId: user.companyId,
            createdAt: new Date().toISOString().split("T")[0],
        });
        res.json(template);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.delete("/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const template = await storage.getQuotationTemplate(id);
        if (!template || template.companyId !== user.companyId) return res.status(404).send("Template not found");

        await storage.deleteQuotationTemplate(id);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
