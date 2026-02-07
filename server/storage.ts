import {
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Plan, type InsertPlan,
  type Subscription, type InsertSubscription,
  type Invoice, type InsertInvoice,
  type QuotationTemplate, type InsertQuotationTemplate,
  type Company, type InsertCompany,
  type Payment, type InsertPayment,
  type Discount, type InsertDiscount,
  type Tax, type InsertTax,
  users, products, plans, subscriptions, invoices, quotationTemplates,
  companies, payments, discounts, taxes,
} from "@shared/schema";
import { db } from "./db";
import { and, eq, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getInternalUsers(companyId: string): Promise<User[]>;
  getUsers(companyId: string): Promise<User[]>;

  getProducts(companyId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  setUserResetToken(email: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;

  getPlans(companyId?: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  getPlansByProduct(productId: string): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;

  getSubscriptions(companyId?: string): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | undefined>;

  getInvoices(companyId?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined>;

  getQuotationTemplates(companyId?: string): Promise<QuotationTemplate[]>;
  getQuotationTemplate(id: string): Promise<QuotationTemplate | undefined>;
  createQuotationTemplate(template: InsertQuotationTemplate): Promise<QuotationTemplate>;
  deleteQuotationTemplate(id: string): Promise<void>;

  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined>;

  getPayments(companyId?: string): Promise<Payment[]>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  getDiscounts(companyId?: string): Promise<Discount[]>;
  getDiscount(id: string): Promise<Discount | undefined>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  updateDiscount(id: string, data: Partial<Discount>): Promise<Discount | undefined>;
  deleteDiscount(id: string): Promise<void>;

  getTaxes(companyId?: string): Promise<Tax[]>;
  getTax(id: string): Promise<Tax | undefined>;
  createTax(tax: InsertTax): Promise<Tax>;
  deleteTax(id: string): Promise<void>;

  getActiveSubscriptions(): Promise<Subscription[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getInternalUsers(companyId: string): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.companyId, companyId), eq(users.role, "internal")));
  }

  async getUsers(companyId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getProducts(companyId?: string): Promise<Product[]> {
    if (companyId) {
      return db.select().from(products).where(eq(products.companyId, companyId));
    }
    return db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product as any).returning();
    return created;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async setUserResetToken(email: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.email, email));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    if (!user || (user.resetTokenExpiry && user.resetTokenExpiry < new Date())) {
      return undefined;
    }
    return user;
  }

  async getPlans(companyId?: string): Promise<Plan[]> {
    if (companyId) {
      return db.select().from(plans).where(eq(plans.companyId, companyId));
    }
    return db.select().from(plans);
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async getPlansByProduct(productId: string): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.productId, productId));
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(plan).returning();
    return created;
  }

  async getSubscriptions(companyId?: string): Promise<Subscription[]> {
    if (companyId) {
      return db.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
    }
    return db.select().from(subscriptions);
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async getInvoices(companyId?: string): Promise<Invoice[]> {
    if (companyId) {
      return db.select().from(invoices).where(eq(invoices.companyId, companyId));
    }
    return db.select().from(invoices);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice as any).returning();
    return created;
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async getQuotationTemplates(companyId?: string): Promise<QuotationTemplate[]> {
    if (companyId) {
      return db.select().from(quotationTemplates).where(eq(quotationTemplates.companyId, companyId));
    }
    return db.select().from(quotationTemplates);
  }

  async getQuotationTemplate(id: string): Promise<QuotationTemplate | undefined> {
    const [template] = await db.select().from(quotationTemplates).where(eq(quotationTemplates.id, id));
    return template;
  }

  async createQuotationTemplate(template: InsertQuotationTemplate): Promise<QuotationTemplate> {
    const [created] = await db.insert(quotationTemplates).values(template as any).returning();
    return created;
  }

  async deleteQuotationTemplate(id: string): Promise<void> {
    await db.delete(quotationTemplates).where(eq(quotationTemplates.id, id));
  }

  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return updated;
  }

  async getPayments(companyId?: string): Promise<Payment[]> {
    if (companyId) {
      return db.select().from(payments).where(eq(payments.companyId, companyId));
    }
    return db.select().from(payments);
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async getDiscounts(companyId?: string): Promise<Discount[]> {
    if (companyId) {
      return db.select().from(discounts).where(eq(discounts.companyId, companyId));
    }
    return db.select().from(discounts);
  }

  async getDiscount(id: string): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [created] = await db.insert(discounts).values(discount).returning();
    return created;
  }

  async updateDiscount(id: string, data: Partial<Discount>): Promise<Discount | undefined> {
    const [updated] = await db.update(discounts).set(data).where(eq(discounts.id, id)).returning();
    return updated;
  }

  async deleteDiscount(id: string): Promise<void> {
    await db.delete(discounts).where(eq(discounts.id, id));
  }

  async getTaxes(companyId?: string): Promise<Tax[]> {
    if (companyId) {
      return db.select().from(taxes).where(eq(taxes.companyId, companyId));
    }
    return db.select().from(taxes);
  }

  async getTax(id: string): Promise<Tax | undefined> {
    const [tax] = await db.select().from(taxes).where(eq(taxes.id, id));
    return tax;
  }

  async createTax(tax: InsertTax): Promise<Tax> {
    const [created] = await db.insert(taxes).values(tax).returning();
    return created;
  }

  async deleteTax(id: string): Promise<void> {
    await db.delete(taxes).where(eq(taxes.id, id));
  }

  async getActiveSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
  }
}

export const storage = new DatabaseStorage();
