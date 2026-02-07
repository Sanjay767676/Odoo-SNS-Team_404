import {
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Plan, type InsertPlan,
  type Subscription, type InsertSubscription,
  type Invoice, type InsertInvoice,
  type QuotationTemplate, type InsertQuotationTemplate,
  users, products, plans, subscriptions, invoices, quotationTemplates,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getInternalUsers(): Promise<User[]>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined>;

  getPlans(): Promise<Plan[]>;
  getPlansByProduct(productId: string): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;

  getSubscriptions(): Promise<Subscription[]>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined>;

  getQuotationTemplates(): Promise<QuotationTemplate[]>;
  getQuotationTemplate(id: string): Promise<QuotationTemplate | undefined>;
  createQuotationTemplate(template: InsertQuotationTemplate): Promise<QuotationTemplate>;
  deleteQuotationTemplate(id: string): Promise<void>;
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

  async getInternalUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "internal"));
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans);
  }

  async getPlansByProduct(productId: string): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.productId, productId));
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(plan).returning();
    return created;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions);
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async getQuotationTemplates(): Promise<QuotationTemplate[]> {
    return db.select().from(quotationTemplates);
  }

  async getQuotationTemplate(id: string): Promise<QuotationTemplate | undefined> {
    const [template] = await db.select().from(quotationTemplates).where(eq(quotationTemplates.id, id));
    return template;
  }

  async createQuotationTemplate(template: InsertQuotationTemplate): Promise<QuotationTemplate> {
    const [created] = await db.insert(quotationTemplates).values(template).returning();
    return created;
  }

  async deleteQuotationTemplate(id: string): Promise<void> {
    await db.delete(quotationTemplates).where(eq(quotationTemplates.id, id));
  }
}

export const storage = new DatabaseStorage();
