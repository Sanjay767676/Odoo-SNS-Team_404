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
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  taxPercent: numeric("tax_percent"),
  taxAmount: numeric("tax_amount"),
  subtotal: numeric("subtotal"),
  total: numeric("total"),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull(),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  lines: jsonb("lines").$type<{ description: string; amount: number }[]>().default([]),
  tax: numeric("tax").default("0"),
  discountAmount: numeric("discount_amount").default("0"),
  discountLabel: text("discount_label"),
  taxPercent: numeric("tax_percent").default("18"),
});

export const quotationTemplates = pgTable("quotation_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  validityDays: integer("validity_days").notNull().default(30),
  recurringPlanId: varchar("recurring_plan_id"),
  productLines: jsonb("product_lines").$type<{ productId: string; productName: string; quantity: number; unitPrice: number }[]>().default([]),
  adminId: varchar("admin_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertQuotationTemplateSchema = createInsertSchema(quotationTemplates).omit({ id: true });

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
