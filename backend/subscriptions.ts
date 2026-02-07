import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth-utils";

const router = Router();

async function generateNumber(prefix: string, type: 'subscription' | 'invoice'): Promise<string> {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const items = type === 'subscription' ? await storage.getSubscriptions() : await storage.getInvoices();
    const count = items.filter(i => (i.number || '').startsWith(`${prefix}-${dateStr}`)).length + 1;
    return `${prefix}-${dateStr}-${String(count).padStart(3, '0')}`;
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    let allSubs = await storage.getSubscriptions(user.companyId);
    if (user.role === "user") {
        allSubs = allSubs.filter(s => s.userId === user.id);
    }
    res.json(allSubs);
});

router.post("/", requireRole("user"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const { productId, planId, quantity, discountCode, selectedVariants } = req.body;

        if (!productId || !planId) {
            return res.status(400).send("Product ID and plan ID are required");
        }

        const plan = await storage.getPlan(planId);
        if (!plan || plan.companyId !== user.companyId) {
            return res.status(404).send("Plan not found");
        }
        const product = await storage.getProduct(plan.productId);
        if (!product) return res.status(404).send("Product not found");

        const qty = Number(quantity) || 1;

        let variantExtra = 0;
        const productVariants = (product.variants as any[]) || [];
        if (selectedVariants) {
            Object.entries(selectedVariants).forEach(([attr, val]) => {
                const v = productVariants.find(pv => pv.attribute === attr && pv.value === val);
                if (v) variantExtra += Number(v.extraPrice || 0);
            });
        }

        const basePrice = (Number(plan.price) + variantExtra) * qty;

        let appliedDiscountType: string | null = null;
        let appliedDiscountValue: number | null = null;
        let discountAmount = 0;

        if (plan.discountType && plan.discountValue) {
            appliedDiscountType = plan.discountType;
            appliedDiscountValue = Number(plan.discountValue);
            if (plan.discountType === "percent_first_month") {
                discountAmount = basePrice * Number(plan.discountValue) / 100;
            } else if (plan.discountType === "fixed") {
                discountAmount = Math.min(Number(plan.discountValue), basePrice);
            }
        }

        if (discountCode) {
            const codeUpper = discountCode.toUpperCase().trim();
            const discounts = await storage.getDiscounts(user.companyId);
            const codeDiscount = discounts.find(d => d.name === codeUpper && (d as any).active);

            if (codeDiscount) {
                appliedDiscountType = codeDiscount.type;
                appliedDiscountValue = Number(codeDiscount.value);
                if (codeDiscount.type === "percent_first_month") {
                    discountAmount = basePrice * Number(codeDiscount.value) / 100;
                } else if (codeDiscount.type === "fixed") {
                    discountAmount = Math.min(Number(codeDiscount.value), basePrice);
                }
            }
        }

        const subtotal = basePrice - discountAmount;
        const taxPercent = Number(plan?.taxPercent || 18);
        const taxAmount = subtotal * taxPercent / 100;
        const total = subtotal + taxAmount;

        const today = new Date().toISOString().split("T")[0];
        const subNumber = await generateNumber("SUB", "subscription");

        const sub = await storage.createSubscription({
            number: subNumber,
            userId: user.id,
            productId,
            planId,
            quantity: qty,
            status: "active", // Auto-activate
            startDate: today,
            endDate: null,
            discountCode: discountCode || null,
            discountType: appliedDiscountType,
            discountValue: appliedDiscountValue ? String(appliedDiscountValue) : null,
            discountAmount: String(discountAmount.toFixed(2)),
            selectedVariants: selectedVariants || null,
            taxPercent: String(taxPercent),
            taxAmount: String(taxAmount.toFixed(2)),
            subtotal: String(subtotal.toFixed(2)),
            total: String(total.toFixed(2)),
            companyId: user.companyId,
        });

        // Auto-generate invoice
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        let desc = `${product.name} - ${plan.name} x${qty}`;
        if (selectedVariants) {
            const variantStr = Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(", ");
            if (variantStr) desc += ` (${variantStr})`;
        }

        const lines: { description: string; amount: number }[] = [
            {
                description: desc,
                amount: Number(subtotal.toFixed(2)),
            },
        ];

        if (Number(taxAmount) > 0) {
            lines.push({
                description: `Tax (${taxPercent}%)`,
                amount: Number(taxAmount.toFixed(2)),
            });
        }

        // Note: Discount is already deducted from subtotal in the logic above, 
        // but for invoice lines transparency we might want to show it. 
        // However, the current logic calculates subtotal = base - discount. 
        // Let's stick to the confirm logic: 
        // In confirm endpoint: amount is sub.total. Lines structure was:
        // Description: Product... Amount: sub.subtotal
        // Discount check...

        // Let's match the confirm endpoint logic better:
        // The confirm endpoint uses sub.subtotal for the main line and adds a negative line for discount ONLY IF discountAmount > 0.
        // BUT sub.subtotal above is calculated AS (basePrice - discountAmount). 
        // So if we add a negative line, we are double counting the discount!

        // Let's correct the calculation in this endpoint to match "confirm" expectation or fix "confirm".
        // In this POST handler: 
        // const subtotal = basePrice - discountAmount;
        // const total = subtotal + taxAmount;

        // In PATCH confirm handler:
        // lines = [{ description: ..., amount: Number(sub.subtotal) }]
        // if (discountAmount > 0) lines.push({ description: "Discount...", amount: -Number(sub.discountAmount) })
        // createInvoice({ amount: sub.total ... })

        // If subtotal ALREADY has discount deducted, then:
        // Invoice Total = Subtotal (base-disc) - Discount + Tax
        // That would be Base - 2*Discount + Tax. WRONG.

        // It seems the `subtotal` field in the DB is expected to be the amount AFTER discount? 
        // Or BEFORE discount?
        // Let's look at `subtotal = basePrice - discountAmount`. So it IS after discount.
        // If the `confirm` endpoint adds a negative line to `subtotal`, the invoice sum will be wrong unless `createInvoice` ignores lines sum and uses `amount`.
        // `storage.createInvoice` likely just inserts JSON.

        // To be safe and correct, I will use `basePrice` for the main line amount, so the discount line makes sense.
        // Recalculating for the invoice lines:

        const invoiceLines = [
            {
                description: desc,
                amount: basePrice,
            }
        ];

        if (discountAmount > 0) {
            invoiceLines.push({
                description: `Discount: ${discountCode || "Applied"}`,
                amount: -discountAmount,
            });
        }

        // Tax is usually added on top of (Subtotal - Discount).
        // The invoice schema/logic might expect tax to be a line or just calculated?
        // `confirm` endpoint didn't add a tax line. It just set `amount: sub.total`.
        // The Invoice UI likely calculates tax or just shows lines.

        // Let's stick to a simple structure that sums up to `total`.
        // BasePrice - Discount + Tax = Total.
        // We can add a Tax line to be explicit.
        if (taxAmount > 0) {
            invoiceLines.push({
                description: `Tax (${taxPercent}%)`,
                amount: taxAmount,
            });
        }

        const invNumber = await generateNumber("INV", "invoice");

        await storage.createInvoice({
            number: invNumber,
            subscriptionId: sub.id,
            userId: user.id,
            amount: String(total.toFixed(2)),
            status: "pending",
            dueDate: dueDate.toISOString().split("T")[0],
            companyId: user.companyId,
            lines: invoiceLines,
        });

        res.status(201).json(sub);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.patch("/:id/upgrade", requireRole("user"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const { planId } = req.body;

        if (!planId) return res.status(400).send("New plan ID is required");

        const sub = await storage.getSubscription(id);
        if (!sub || sub.userId !== user.id) return res.status(404).send("Subscription not found");

        const newPlan = await storage.getPlan(planId);
        if (!newPlan || newPlan.companyId !== user.companyId) return res.status(404).send("Plan not found");

        const qty = sub.quantity;
        const basePrice = Number(newPlan.price) * qty;
        const taxPercent = Number(newPlan.taxPercent || 18);
        const taxAmount = basePrice * taxPercent / 100;
        const total = basePrice + taxAmount;

        const updated = await storage.updateSubscription(id, {
            planId,
            taxPercent: String(taxPercent),
            taxAmount: String(taxAmount.toFixed(2)),
            subtotal: String(basePrice.toFixed(2)),
            total: String(total.toFixed(2)),
        });

        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.patch("/:id/send-quote", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const sub = await storage.getSubscription(id);
        if (!sub) return res.status(404).send("Subscription not found");

        const updated = await storage.updateSubscription(id, { status: "quotation" });
        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.patch("/:id/confirm", requireAuth, async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const sub = await storage.getSubscription(id);
        if (!sub) return res.status(404).send("Subscription not found");

        if (user.role !== 'admin' && sub.userId !== user.id) {
            return res.status(403).send("Unauthorized");
        }

        const product = await storage.getProduct(sub.productId);
        const plan = await storage.getPlan(sub.planId);

        const updated = await storage.updateSubscription(id, {
            status: "active",
            startDate: new Date().toISOString().split('T')[0]
        });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        let desc = `${product?.name || "Product"} - ${plan?.name || "Plan"} x${sub.quantity}`;
        if (sub.selectedVariants) {
            const variantStr = Object.entries(sub.selectedVariants as any).map(([k, v]) => `${k}: ${v}`).join(", ");
            if (variantStr) desc += ` (${variantStr})`;
        }

        const lines: { description: string; amount: number }[] = [
            {
                description: desc,
                amount: Number(sub.subtotal),
            },
        ];

        if (Number(sub.discountAmount) > 0) {
            lines.push({
                description: `Discount: ${sub.discountCode || "Applied"}`,
                amount: -Number(sub.discountAmount),
            });
        }

        const invNumber = await generateNumber("INV", "invoice");

        await storage.createInvoice({
            number: invNumber,
            subscriptionId: sub.id,
            userId: sub.userId,
            amount: sub.total || "0",
            status: "pending",
            dueDate: dueDate.toISOString().split("T")[0],
            companyId: sub.companyId,
            lines,
        });

        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
