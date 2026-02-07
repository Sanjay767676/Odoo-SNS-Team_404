import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    let allInvoices = await storage.getInvoices(user.companyId);
    if (user.role === "user") {
        allInvoices = allInvoices.filter(i => i.userId === user.id);
    }
    res.json(allInvoices);
});

router.patch("/:id/pay", requireRole("user"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const invoice = await storage.getInvoice(id);

        if (!invoice) return res.status(404).send("Invoice not found");
        if (invoice.userId !== user.id) return res.status(403).send("Not your invoice");

        const today = new Date().toISOString().split("T")[0];
        const updated = await storage.updateInvoice(id, {
            status: "paid",
            paidDate: today,
        });
        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.patch("/:id/confirm", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const invoice = await storage.getInvoice(id);
        if (!invoice || invoice.companyId !== user.companyId) return res.status(404).send("Invoice not found");
        const updated = await storage.updateInvoice(id, { status: "confirmed" });
        res.json(updated);
    } catch (err: any) { res.status(500).send(err.message); }
});

router.patch("/:id/cancel", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const invoice = await storage.getInvoice(id);
        if (!invoice || invoice.companyId !== user.companyId) return res.status(404).send("Invoice not found");
        const updated = await storage.updateInvoice(id, { status: "cancelled" });
        res.json(updated);
    } catch (err: any) { res.status(500).send(err.message); }
});

router.patch("/:id/send", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const invoice = await storage.getInvoice(id);
        if (!invoice || invoice.companyId !== user.companyId) return res.status(404).send("Invoice not found");
        const updated = await storage.updateInvoice(id, { status: "sent" });
        res.json(updated);
    } catch (err: any) { res.status(500).send(err.message); }
});

router.patch("/:id/print", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const invoice = await storage.getInvoice(id);
        if (!invoice || invoice.companyId !== user.companyId) return res.status(404).send("Invoice not found");
        const updated = await storage.updateInvoice(id, { status: "printed" });
        res.json(updated);
    } catch (err: any) { res.status(500).send(err.message); }
});

export default router;
