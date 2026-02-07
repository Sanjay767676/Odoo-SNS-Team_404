import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import cron from "node-cron";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashedPassword, "hex"), buf);
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    (req as any).currentUser = user;
    next();
  };
}

const VALID_DISCOUNT_CODES: Record<string, { type: string; value: number; label: string }> = {
  "FIRST10": { type: "percent_first_month", value: 10, label: "10% off first month" },
  "SAVE200": { type: "fixed", value: 200, label: "Flat 200 off" },
  "WELCOME15": { type: "percent_first_month", value: 15, label: "15% off first month" },
  "FLAT500": { type: "fixed", value: 500, label: "Flat 500 off" },
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "subsmanager-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!["admin", "internal", "user"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must be 8+ chars with uppercase, lowercase, and special character" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        role,
      });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/users/internals", requireRole("admin"), async (_req: Request, res: Response) => {
    const internals = await storage.getInternalUsers();
    const safe = internals.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  app.get("/api/products", requireAuth, async (_req: Request, res: Response) => {
    const allProducts = await storage.getProducts();
    res.json(allProducts);
  });

  app.post("/api/products", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const { name, type, salesPrice, costPrice, variants, companyName } = req.body;

      if (!name || !type || !salesPrice || !costPrice) {
        return res.status(400).json({ message: "Name, type, sales price, and cost price are required" });
      }

      const product = await storage.createProduct({
        name,
        type,
        salesPrice,
        costPrice,
        variants: variants || [],
        adminId: user.id,
        status: "draft",
        companyName: companyName || null,
      });
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/products/:id/assign", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const product = await storage.getProduct(id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (product.adminId !== user.id) {
        return res.status(403).json({ message: "Not your product" });
      }

      const { internalId } = req.body;
      if (!internalId) {
        return res.status(400).json({ message: "Internal ID is required" });
      }

      const updated = await storage.updateProduct(id, {
        assignedInternalId: internalId,
        status: "assigned",
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/products/:id/publish", requireRole("internal"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const product = await storage.getProduct(id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (product.assignedInternalId !== user.id) {
        return res.status(403).json({ message: "Not assigned to you" });
      }

      const updated = await storage.updateProduct(id, {
        status: "published",
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/plans", requireAuth, async (_req: Request, res: Response) => {
    const allPlans = await storage.getPlans();
    res.json(allPlans);
  });

  app.post("/api/plans", requireRole("internal"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const { productId, name, price, billingPeriod, minQuantity, startDate, endDate, pausable, renewable, closable, autoClose, discountType, discountValue, taxPercent } = req.body;

      if (!productId || !name || !price || !billingPeriod) {
        return res.status(400).json({ message: "Product ID, name, price, and billing period are required" });
      }

      const product = await storage.getProduct(productId);
      if (!product || product.assignedInternalId !== user.id) {
        return res.status(403).json({ message: "Not assigned to you" });
      }

      const plan = await storage.createPlan({
        productId,
        name,
        price,
        billingPeriod,
        minQuantity: Number(minQuantity) || 1,
        startDate: startDate || null,
        endDate: endDate || null,
        pausable: !!pausable,
        renewable: renewable !== false,
        closable: closable !== false,
        autoClose: !!autoClose,
        discountType: discountType || null,
        discountValue: discountValue ? String(discountValue) : null,
        taxPercent: taxPercent ? String(taxPercent) : "18",
      });
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/subscriptions", requireAuth, async (_req: Request, res: Response) => {
    const allSubs = await storage.getSubscriptions();
    res.json(allSubs);
  });

  app.post("/api/subscriptions", requireRole("user"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const { productId, planId, quantity, discountCode } = req.body;

      if (!productId || !planId) {
        return res.status(400).json({ message: "Product ID and plan ID are required" });
      }

      const plan = (await storage.getPlans()).find((p) => p.id === planId);
      const product = plan ? await storage.getProduct(plan.productId) : null;
      const qty = Number(quantity) || 1;
      const basePrice = Number(plan?.price || 0) * qty;

      let appliedDiscountType: string | null = null;
      let appliedDiscountValue: number | null = null;
      let discountAmount = 0;
      let discountLabel: string | null = null;

      if (plan?.discountType && plan?.discountValue) {
        appliedDiscountType = plan.discountType;
        appliedDiscountValue = Number(plan.discountValue);
        if (plan.discountType === "percent_first_month") {
          discountAmount = basePrice * Number(plan.discountValue) / 100;
          discountLabel = `${plan.discountValue}% off first month`;
        } else if (plan.discountType === "fixed") {
          discountAmount = Math.min(Number(plan.discountValue), basePrice);
          discountLabel = `Flat ${plan.discountValue} off`;
        }
      }

      if (discountCode) {
        const codeUpper = discountCode.toUpperCase().trim();
        const codeDiscount = VALID_DISCOUNT_CODES[codeUpper];
        if (codeDiscount) {
          appliedDiscountType = codeDiscount.type;
          appliedDiscountValue = codeDiscount.value;
          discountLabel = codeDiscount.label;
          if (codeDiscount.type === "percent_first_month") {
            discountAmount = basePrice * codeDiscount.value / 100;
          } else if (codeDiscount.type === "fixed") {
            discountAmount = Math.min(codeDiscount.value, basePrice);
          }
        }
      }

      const subtotal = basePrice - discountAmount;
      const taxPercent = Number(plan?.taxPercent || 18);
      const taxAmount = subtotal * taxPercent / 100;
      const total = subtotal + taxAmount;

      const today = new Date().toISOString().split("T")[0];
      const sub = await storage.createSubscription({
        userId: user.id,
        productId,
        planId,
        quantity: qty,
        status: "active",
        startDate: today,
        discountCode: discountCode || null,
        discountType: appliedDiscountType,
        discountValue: appliedDiscountValue ? String(appliedDiscountValue) : null,
        discountAmount: String(discountAmount.toFixed(2)),
        taxPercent: String(taxPercent),
        taxAmount: String(taxAmount.toFixed(2)),
        subtotal: String(subtotal.toFixed(2)),
        total: String(total.toFixed(2)),
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const lines: { description: string; amount: number }[] = [
        {
          description: `${product?.name || "Product"} - ${plan?.name || "Plan"} x${qty}`,
          amount: basePrice,
        },
      ];

      if (discountAmount > 0 && discountLabel) {
        lines.push({
          description: `Discount: ${discountLabel}`,
          amount: -discountAmount,
        });
      }

      await storage.createInvoice({
        subscriptionId: sub.id,
        userId: user.id,
        amount: String(total.toFixed(2)),
        status: "pending",
        dueDate: dueDate.toISOString().split("T")[0],
        lines,
        tax: String(taxAmount.toFixed(2)),
        discountAmount: String(discountAmount.toFixed(2)),
        discountLabel: discountLabel,
        taxPercent: String(taxPercent),
      });

      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/discount-codes/validate", requireRole("user"), async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: "Code is required" });
    }
    const codeUpper = code.toUpperCase().trim();
    const discount = VALID_DISCOUNT_CODES[codeUpper];
    if (discount) {
      res.json({ valid: true, ...discount });
    } else {
      res.json({ valid: false, message: "Invalid discount code" });
    }
  });

  app.get("/api/invoices", requireAuth, async (_req: Request, res: Response) => {
    const allInvoices = await storage.getInvoices();
    res.json(allInvoices);
  });

  app.patch("/api/invoices/:id/pay", requireRole("user"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (invoice.userId !== user.id) {
        return res.status(403).json({ message: "Not your invoice" });
      }

      const today = new Date().toISOString().split("T")[0];
      const updated = await storage.updateInvoice(id, {
        status: "paid",
        paidDate: today,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/quotation-templates", requireRole("admin"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getQuotationTemplates();
    const mine = all.filter((t) => t.adminId === user.id);
    res.json(mine);
  });

  app.post("/api/quotation-templates", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const { name, validityDays, recurringPlanId, productLines } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Template name is required" });
      }

      const template = await storage.createQuotationTemplate({
        name,
        validityDays: Number(validityDays) || 30,
        recurringPlanId: recurringPlanId || null,
        productLines: productLines || [],
        adminId: user.id,
        createdAt: new Date().toISOString().split("T")[0],
      });
      res.json(template);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/quotation-templates/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const template = await storage.getQuotationTemplate(id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (template.adminId !== user.id) {
        return res.status(403).json({ message: "Not your template" });
      }

      await storage.deleteQuotationTemplate(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/companies", requireAuth, async (_req, res) => {
    const all = await storage.getCompanies();
    res.json(all);
  });

  app.post("/api/companies", requireRole("admin"), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const { name, logoUrl, primaryColor } = req.body;
      if (!name) return res.status(400).json({ message: "Company name is required" });
      const company = await storage.createCompany({ name, logoUrl: logoUrl || null, primaryColor: primaryColor || null, createdById: user.id });
      res.json(company);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/payments", requireAuth, async (_req, res) => {
    const all = await storage.getPayments();
    res.json(all);
  });

  app.post("/api/payments", requireRole("user"), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const { invoiceId, amount, method } = req.body;
      if (!invoiceId || !amount || !method) return res.status(400).json({ message: "Invoice ID, amount, and method are required" });

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.userId !== user.id) return res.status(403).json({ message: "Not your invoice" });

      const payment = await storage.createPayment({ invoiceId, amount: String(amount), method, date: new Date().toISOString().split("T")[0] });

      await storage.updateInvoice(invoiceId, { status: "paid", paidDate: new Date().toISOString().split("T")[0] });

      res.json(payment);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/discounts", requireAuth, async (_req, res) => {
    const all = await storage.getDiscounts();
    res.json(all);
  });

  app.post("/api/discounts", requireRole("admin"), async (req, res) => {
    try {
      const { name, type, value, companyId, minPurchase, minQuantity, startDate, endDate, limitUsage } = req.body;
      if (!name || !type || !value) return res.status(400).json({ message: "Name, type, and value are required" });
      const discount = await storage.createDiscount({
        name, type, value: String(value), companyId: companyId || null,
        minPurchase: minPurchase ? String(minPurchase) : null, minQuantity: minQuantity || null,
        startDate: startDate || null, endDate: endDate || null, limitUsage: limitUsage || null, usedCount: 0,
      });
      res.json(discount);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/discounts/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteDiscount(req.params.id as string);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/taxes", requireAuth, async (_req, res) => {
    const all = await storage.getTaxes();
    res.json(all);
  });

  app.post("/api/taxes", requireRole("admin"), async (req, res) => {
    try {
      const { name, percentage, type, companyId } = req.body;
      if (!name || !percentage || !type) return res.status(400).json({ message: "Name, percentage, and type are required" });
      const tax = await storage.createTax({ name, percentage: String(percentage), type, companyId: companyId || null });
      res.json(tax);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/taxes/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteTax(req.params.id as string);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[CRON] Running daily invoice generation...");
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
          const basePrice = Number(plan.price) * qty;
          const taxPercent = Number(plan.taxPercent || 18);
          const taxAmount = basePrice * taxPercent / 100;
          const total = basePrice + taxAmount;

          const dueDate = new Date();
          if (plan.billingPeriod === "monthly") dueDate.setMonth(dueDate.getMonth() + 1);
          else if (plan.billingPeriod === "yearly") dueDate.setFullYear(dueDate.getFullYear() + 1);
          else if (plan.billingPeriod === "weekly") dueDate.setDate(dueDate.getDate() + 7);
          else dueDate.setDate(dueDate.getDate() + 1);

          await storage.createInvoice({
            subscriptionId: sub.id,
            userId: sub.userId,
            amount: String(total.toFixed(2)),
            status: "pending",
            dueDate: dueDate.toISOString().split("T")[0],
            lines: [{ description: `${product?.name || "Product"} - ${plan.name} x${qty}`, amount: basePrice }],
            tax: String(taxAmount.toFixed(2)),
            taxPercent: String(taxPercent),
          });
          generated++;
        }
      }
      console.log(`[CRON] Generated ${generated} invoices`);
    } catch (err) {
      console.error("[CRON] Invoice generation error:", err);
    }
  });

  return httpServer;
}
