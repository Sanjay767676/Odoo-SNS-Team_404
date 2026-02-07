import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  companyId: varchar("company_id"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  isVerified: boolean("is_verified").default(false),
  otp: text("otp"),
  otpExpiry: timestamp("otp_expiry"),
  googleId: text("google_id"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  salesPrice: numeric("sales_price").notNull(),
  costPrice: numeric("cost_price").notNull(),
  variants: jsonb("variants").$type<{ attribute: string; value: string; extraPrice: number }[]>().default([]),
  adminId: varchar("admin_id").notNull(),
  assignedInternalId: varchar("assigned_internal_id"),
  status: text("status").notNull().default("draft"),
  companyId: varchar("company_id"),
  companyName: text("company_name"),
});

export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  name: text("name").notNull(),
  price: numeric("price").notNull(),
  billingPeriod: text("billing_period").notNull(),
  minQuantity: integer("min_quantity").notNull().default(1),
  startDate: text("start_date"),
  endDate: text("end_date"),
  pausable: boolean("pausable").default(false),
  renewable: boolean("renewable").default(true),
  closable: boolean("closable").default(true),
  autoClose: boolean("auto_close").default(false),
  discountType: text("discount_type"),
  discountValue: numeric("discount_value"),
  taxPercent: numeric("tax_percent").default("18"),
  companyId: varchar("company_id"),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number"),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  planId: varchar("plan_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("active"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  discountCode: text("discount_code"),
  discountType: text("discount_type"),
  discountValue: numeric("discount_value"),
  discountAmount: numeric("discount_amount"),
  selectedVariants: jsonb("selected_variants"),
  taxPercent: numeric("tax_percent"),
  taxAmount: numeric("tax_amount"),
  subtotal: numeric("subtotal"),
  total: numeric("total"),
  companyId: varchar("company_id"),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number"),
  subscriptionId: varchar("subscription_id").notNull(),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("draft"), // draft, pending, confirmed, paid, overdue, cancelled, sent, printed
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  lines: jsonb("lines").$type<{ description: string; amount: number }[]>().default([]),
  tax: numeric("tax").default("0"),
  discountAmount: numeric("discount_amount").default("0"),
  discountLabel: text("discount_label"),
  taxPercent: numeric("tax_percent").default("18"),
  companyId: varchar("company_id"),
});

export const quotationTemplates = pgTable("quotation_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  validityDays: integer("validity_days").notNull().default(30),
  recurringPlanId: varchar("recurring_plan_id"),
  productLines: jsonb("product_lines").$type<{ productId: string; productName: string; quantity: number; unitPrice: number }[]>().default([]),
  adminId: varchar("admin_id").notNull(),
  companyId: varchar("company_id"),
  createdAt: text("created_at").notNull(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  createdById: varchar("created_by_id").notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  amount: numeric("amount").notNull(),
  method: text("method").notNull(),
  date: text("date").notNull(),
  companyId: varchar("company_id"),
});

export const discounts = pgTable("discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  value: numeric("value").notNull(),
  minPurchase: numeric("min_purchase"),
  minQuantity: integer("min_quantity"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  limitUsage: integer("limit_usage"),
  usedCount: integer("used_count").default(0),
  active: boolean("active").default(true),
});

export const taxes = pgTable("taxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  percentage: numeric("percentage").notNull(),
  type: text("type").notNull(),
  active: boolean("active").default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertQuotationTemplateSchema = createInsertSchema(quotationTemplates).omit({ id: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertDiscountSchema = createInsertSchema(discounts).omit({ id: true });
export const insertTaxSchema = createInsertSchema(taxes).omit({ id: true });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "internal", "user"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertQuotationTemplate = z.infer<typeof insertQuotationTemplateSchema>;
export type QuotationTemplate = typeof quotationTemplates.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Discount = typeof discounts.$inferSelect;
export type InsertTax = z.infer<typeof insertTaxSchema>;
export type Tax = typeof taxes.$inferSelect;
