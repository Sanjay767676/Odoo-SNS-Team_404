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

async function generateNumber(prefix: string, type: 'subscription' | 'invoice'): Promise<string> {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const items = type === 'subscription' ? await storage.getSubscriptions() : await storage.getInvoices();
  const count = items.filter(i => (i.number || '').startsWith(`${prefix}-${dateStr}`)).length + 1;
  return `${prefix}-${dateStr}-${String(count).padStart(3, '0')}`;
}

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

      let companyId: string | undefined;
      if (role === "admin") {
        // Create a default company for the first admin
        const company = await storage.createCompany({
          name: `${name}'s Company`,
          createdById: "temp", // will update after user creation
        });
        companyId = company.id;
      }

      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        role,
        companyId,
      });

      if (role === "admin" && companyId) {
        // Update company createdById
        const companies = await storage.getCompanies();
        const company = companies.find(c => c.id === companyId);
        if (company) {
          // This is a bit hacky, normally storage would have updateCompany
          // I will add updateCompany to IStorage later if needed
        }
      }

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

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if user exists
        return res.json({ message: "If an account exists with this email, a reset link will be sent." });
      }

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600000); // 1 hour
      await storage.setUserResetToken(email, token, expiry);

      // In real app, send actual email. Here we just log to console.
      console.log(`[AUTH] Password reset requested for ${email}`);
      console.log(`[AUTH] Reset Link: http://localhost:5000/reset-password?token=${token}`);

      res.json({ message: "If an account exists with this email, a reset link will be sent." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and password are required" });

      const user = await storage.getUserByResetToken(token);
      if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must be 8+ chars with uppercase, lowercase, and special character" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password has been reset successfully." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/internals", requireRole("admin"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const internals = await storage.getInternalUsers(user.companyId);
    const safe = internals.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  app.get("/api/users", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const allUsers = await storage.getUsers(user.companyId);
      const safe = allUsers.map(({ password: _, ...u }) => u);
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users/internals", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const admin = (req as any).currentUser;
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
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
        role: "internal",
        companyId: admin.companyId,
      });

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/products", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const allProducts = await storage.getProducts(user.companyId);
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
        companyId: user.companyId,
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

  app.get("/api/plans", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const allPlans = await storage.getPlans(user.companyId);
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
        companyId: user.companyId,
      });
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/subscriptions", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    let allSubs = await storage.getSubscriptions(user.companyId);
    if (user.role === "user") {
      allSubs = allSubs.filter(s => s.userId === user.id);
    }
    res.json(allSubs);
  });

  app.post("/api/subscriptions", requireRole("user"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const { productId, planId, quantity, discountCode, selectedVariants } = req.body;

      if (!productId || !planId) {
        return res.status(400).json({ message: "Product ID and plan ID are required" });
      }

      const plan = await storage.getPlan(planId);
      if (!plan || plan.companyId !== user.companyId) {
        return res.status(404).json({ message: "Plan not found" });
      }
      const product = await storage.getProduct(plan.productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

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
      let discountLabel: string | null = null;

      if (plan.discountType && plan.discountValue) {
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
        const discounts = await storage.getDiscounts(user.companyId);
        const codeDiscount = discounts.find(d => d.name === codeUpper && (d as any).active);

        if (codeDiscount) {
          appliedDiscountType = codeDiscount.type;
          appliedDiscountValue = Number(codeDiscount.value);
          discountLabel = `${codeDiscount.name} - ${codeDiscount.type.includes('percent') ? codeDiscount.value + '%' : '$' + codeDiscount.value} off`;
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
        status: "draft",
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

      res.status(201).json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/subscriptions/:id/upgrade", requireRole("user"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const { planId } = req.body;

      if (!planId) return res.status(400).json({ message: "New plan ID is required" });

      const sub = await storage.getSubscription(id);
      if (!sub || sub.userId !== user.id) return res.status(404).json({ message: "Subscription not found" });

      const newPlan = await storage.getPlan(planId);
      if (!newPlan || newPlan.companyId !== user.companyId) return res.status(404).json({ message: "Plan not found" });

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
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/subscriptions/:id/send-quote", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const sub = await storage.getSubscription(id);
      if (!sub) return res.status(404).json({ message: "Subscription not found" });

      const updated = await storage.updateSubscription(id, { status: "quotation" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/subscriptions/:id/confirm", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const sub = await storage.getSubscription(id);
      if (!sub) return res.status(404).json({ message: "Subscription not found" });

      if (user.role !== 'admin' && sub.userId !== user.id) {
        return res.status(403).json({ message: "Unauthorized" });
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
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/discount-codes/validate", requireRole("user"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: "Code is required" });
    }
    const codeUpper = code.toUpperCase().trim();
    const discounts = await storage.getDiscounts(user.companyId);
    const discount = discounts.find(d => d.name === codeUpper && (d as any).active);

    if (discount) {
      res.json({
        valid: true,
        label: `${discount.name} - ${discount.type.includes('percent') ? discount.value + '%' : '$' + discount.value} off`,
        type: discount.type,
        value: Number(discount.value)
      });
    } else {
      res.json({ valid: false, message: "Invalid discount code" });
    }
  });

  app.get("/api/invoices", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    let allInvoices = await storage.getInvoices(user.companyId);
    if (user.role === "user") {
      allInvoices = allInvoices.filter(i => i.userId === user.id);
    }
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

  app.patch("/api/invoices/:id/confirm", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const invoice = await storage.getInvoice(id);
      if (!invoice || invoice.companyId !== user.companyId) return res.status(404).json({ message: "Invoice not found" });
      const updated = await storage.updateInvoice(id, { status: "confirmed" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/invoices/:id/cancel", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const invoice = await storage.getInvoice(id);
      if (!invoice || invoice.companyId !== user.companyId) return res.status(404).json({ message: "Invoice not found" });
      const updated = await storage.updateInvoice(id, { status: "cancelled" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/invoices/:id/send", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const invoice = await storage.getInvoice(id);
      if (!invoice || invoice.companyId !== user.companyId) return res.status(404).json({ message: "Invoice not found" });
      const updated = await storage.updateInvoice(id, { status: "sent" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/invoices/:id/print", requireRole("internal", "admin"), async (req: Request, res: Response) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      const invoice = await storage.getInvoice(id);
      if (!invoice || invoice.companyId !== user.companyId) return res.status(404).json({ message: "Invoice not found" });
      const updated = await storage.updateInvoice(id, { status: "printed" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/quotation-templates", requireRole("admin"), async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    const all = await storage.getQuotationTemplates(user.companyId);
    res.json(all);
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
        companyId: user.companyId,
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

  app.get("/api/companies", requireAuth, async (req, res) => {
    const user = (req as any).currentUser;
    const all = await storage.getCompanies();
    if (user.role === "admin") {
      return res.json(all.filter(c => c.id === user.companyId));
    }
    res.json(all);
  });

  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const company = await storage.getCompany(id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  });

  app.patch("/api/companies/:id", requireRole("admin"), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const id = req.params.id as string;
      if (user.companyId !== id) return res.status(403).json({ message: "Not your company" });

      const { name, logoUrl, primaryColor } = req.body;
      const updated = await storage.updateCompany(id, { name, logoUrl, primaryColor });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/payments", requireAuth, async (req, res) => {
    const user = (req as any).currentUser;
    const all = await storage.getPayments(user.companyId);
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

      const payment = await storage.createPayment({
        invoiceId,
        amount: String(amount),
        method,
        date: new Date().toISOString().split("T")[0],
        companyId: user.companyId,
      });

      await storage.updateInvoice(invoiceId, { status: "paid", paidDate: new Date().toISOString().split("T")[0] });

      res.json(payment);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/discounts", requireAuth, async (req, res) => {
    const user = (req as any).currentUser;
    const all = await storage.getDiscounts(user.companyId);
    res.json(all);
  });

  app.post("/api/discounts", requireRole("admin"), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const { name, type, value, companyId, minPurchase, minQuantity, startDate, endDate, limitUsage } = req.body;
      if (!name || !type || !value) return res.status(400).json({ message: "Name, type, and value are required" });
      const discount = await storage.createDiscount({
        name, type, value: String(value), companyId: user.companyId,
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

  app.get("/api/taxes", requireAuth, async (req, res) => {
    const user = (req as any).currentUser;
    const all = await storage.getTaxes(user.companyId);
    res.json(all);
  });

  app.post("/api/taxes", requireRole("admin"), async (req, res) => {
    try {
      const user = (req as any).currentUser;
      const { name, percentage, type, companyId } = req.body;
      if (!name || !percentage || !type) return res.status(400).json({ message: "Name, percentage, and type are required" });
      const tax = await storage.createTax({ name, percentage: String(percentage), type, companyId: user.companyId });
      res.json(tax);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/taxes/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteTax(req.params.id as string);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/reports", requireRole("admin"), async (req: Request, res: Response) => {
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
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

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
          const basePrice = (Number(plan.price) + (sub.selectedVariants ? Object.values(sub.selectedVariants as any).length * 0 : 0)) * qty; // Variant pricing logic here too

          // Re-calculating variant extra
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

  return httpServer;
}
