import cron from "node-cron";
import { storage } from "./storage";

async function generateNumber(prefix: string, type: 'subscription' | 'invoice'): Promise<string> {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const items = type === 'subscription' ? await storage.getSubscriptions() : await storage.getInvoices();
    const count = items.filter(i => (i.number || '').startsWith(`${prefix}-${dateStr}`)).length + 1;
    return `${prefix}-${dateStr}-${String(count).padStart(3, '0')}`;
}

export function setupCron() {
    cron.schedule("0 0 * * *", async () => {
        try {
            console.log("[CRON] Running daily invoice generation...");
            const allSubs = await storage.getSubscriptions();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let closed = 0;
            for (const sub of allSubs) {
                if (sub.status === "active" && sub.endDate && new Date(sub.endDate) < today) {
                    await storage.updateSubscription(sub.id, { status: "closed" });
                    closed++;
                }
            }
            if (closed > 0) console.log(`[CRON] Closed ${closed} expired subscriptions`);

            const activeSubs = await storage.getActiveSubscriptions();
            const plans = await storage.getPlans();
            let generated = 0;

            for (const sub of activeSubs) {
                const plan = plans.find(p => p.id === sub.planId);
                if (!plan) continue;

                const existingInvoices = await storage.getInvoices();
                const subInvoices = existingInvoices.filter(inv => inv.subscriptionId === sub.id);
                const lastInvoice = subInvoices.sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];

                if (!lastInvoice) continue;

                const lastDue = new Date(lastInvoice.dueDate);

                let shouldGenerate = false;
                if (plan.billingPeriod === "monthly") {
                    const nextDue = new Date(lastDue);
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    shouldGenerate = today >= nextDue;
                } else if (plan.billingPeriod === "yearly") {
                    const nextDue = new Date(lastDue);
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                    shouldGenerate = today >= nextDue;
                } else if (plan.billingPeriod === "weekly") {
                    const nextDue = new Date(lastDue);
                    nextDue.setDate(nextDue.getDate() + 7);
                    shouldGenerate = today >= nextDue;
                } else if (plan.billingPeriod === "daily") {
                    const nextDue = new Date(lastDue);
                    nextDue.setDate(nextDue.getDate() + 1);
                    shouldGenerate = today >= nextDue;
                }

                if (shouldGenerate) {
                    const product = await storage.getProduct(sub.productId);
                    const qty = sub.quantity;

                    let variantExtra = 0;
                    const productVariants = (product?.variants as any[]) || [];
                    if (sub.selectedVariants) {
                        Object.entries(sub.selectedVariants as any).forEach(([attr, val]) => {
                            const v = productVariants.find(pv => pv.attribute === attr && pv.value === val);
                            if (v) variantExtra += Number(v.extraPrice || 0);
                        });
                    }
                    const currentBasePrice = (Number(plan.price) + variantExtra) * qty;

                    const taxPercent = Number(plan.taxPercent || 18);
                    const taxAmount = currentBasePrice * taxPercent / 100;
                    const total = currentBasePrice + taxAmount;

                    const dueDate = new Date();
                    if (plan.billingPeriod === "monthly") dueDate.setMonth(dueDate.getMonth() + 1);
                    else if (plan.billingPeriod === "yearly") dueDate.setFullYear(dueDate.getFullYear() + 1);
                    else if (plan.billingPeriod === "weekly") dueDate.setDate(dueDate.getDate() + 7);
                    else dueDate.setDate(dueDate.getDate() + 1);

                    const invNumber = await generateNumber("INV", "invoice");

                    await storage.createInvoice({
                        number: invNumber,
                        subscriptionId: sub.id,
                        userId: sub.userId,
                        amount: String(total.toFixed(2)),
                        status: "pending",
                        dueDate: dueDate.toISOString().split("T")[0],
                        lines: [{ description: `${product?.name || "Product"} - ${plan.name} x${qty}`, amount: currentBasePrice }],
                        tax: String(taxAmount.toFixed(2)),
                        taxPercent: String(taxPercent),
                        companyId: sub.companyId,
                    });
                    generated++;
                }
            }
            console.log(`[CRON] Generated ${generated} invoices`);
        } catch (err) {
            console.error("[CRON] Invoice generation error:", err);
        }
    });
}
