import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getCompanies();
    if (user.role === "admin") {
        return res.json(all.filter(c => c.id === user.companyId));
    }
    res.json(all);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const company = await storage.getCompany(id);
    if (!company) return res.status(404).send("Company not found");
    res.json(company);
});

router.patch("/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        if (user.companyId !== id) return res.status(403).send("Not your company");

        const { name, logoUrl, primaryColor } = req.body;
        const updated = await storage.updateCompany(id, { name, logoUrl, primaryColor });
        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
