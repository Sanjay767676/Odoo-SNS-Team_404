import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const subs = await storage.getSubscriptions(user.companyId);
        const invoices = await storage.getInvoices(user.companyId);
        const payments = await storage.getPayments(user.companyId);

        const activeSubs = subs.filter(s => s.status === "active").length;
        const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const overdueAmount = invoices
            .filter(i => i.status === "pending" && new Date(i.dueDate) < new Date())
            .reduce((sum, i) => sum + Number(i.amount), 0);

        const monthlyRevenue: Record<string, number> = {};
        payments.forEach(p => {
            const month = p.date.substring(0, 7);
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(p.amount);
        });

        res.json({
            activeSubs,
            totalRevenue: String(totalRevenue.toFixed(2)),
            overdueAmount: String(overdueAmount.toFixed(2)),
            monthlyRevenue,
        });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
