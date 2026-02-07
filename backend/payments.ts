import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getPayments(user.companyId);
    res.json(all);
});

router.post("/", requireRole("user"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const { invoiceId, amount, method } = req.body;
        if (!invoiceId || !amount || !method) return res.status(400).send("Invoice ID, amount, and method are required");

        const invoice = await storage.getInvoice(invoiceId);
        if (!invoice) return res.status(404).send("Invoice not found");
        if (invoice.userId !== user.id) return res.status(403).send("Not your invoice");

        const payment = await storage.createPayment({
            invoiceId,
            amount: String(amount),
            method,
            date: new Date().toISOString().split("T")[0],
            companyId: user.companyId,
        });

        await storage.updateInvoice(invoiceId, { status: "paid", paidDate: new Date().toISOString().split("T")[0] });

        res.json(payment);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
