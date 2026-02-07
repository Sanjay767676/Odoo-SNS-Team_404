import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  const existingUser = await storage.getUserByEmail("admin@netflix.com");
  if (existingUser) {
    return;
  }

  const hashedPassword = await hashPassword("Admin@123");

  const admin1 = await storage.createUser({
    name: "Reed Hastings",
    email: "admin@netflix.com",
    password: hashedPassword,
    role: "admin",
  });

  const admin2 = await storage.createUser({
    name: "Andy Jassy",
    email: "admin@aws.com",
    password: hashedPassword,
    role: "admin",
  });

  const internal1 = await storage.createUser({
    name: "Sarah Chen",
    email: "sarah@internal.com",
    password: hashedPassword,
    role: "internal",
  });

  const internal2 = await storage.createUser({
    name: "Marcus Johnson",
    email: "marcus@internal.com",
    password: hashedPassword,
    role: "internal",
  });

  const internal3 = await storage.createUser({
    name: "Priya Patel",
    email: "priya@internal.com",
    password: hashedPassword,
    role: "internal",
  });

  const demoUser = await storage.createUser({
    name: "Alex Rivera",
    email: "user@demo.com",
    password: hashedPassword,
    role: "user",
  });

  const product1 = await storage.createProduct({
    name: "Netflix Premium",
    type: "Streaming",
    salesPrice: "15.99",
    costPrice: "5.00",
    variants: [
      { attribute: "Screens", value: "4", extraPrice: 0 },
      { attribute: "Quality", value: "4K Ultra HD", extraPrice: 0 },
    ],
    adminId: admin1.id,
    assignedInternalId: internal1.id,
    status: "published",
    companyName: "Netflix Inc.",
  });

  const product2 = await storage.createProduct({
    name: "AWS EC2 Instance",
    type: "Cloud Computing",
    salesPrice: "49.99",
    costPrice: "20.00",
    variants: [
      { attribute: "vCPUs", value: "4", extraPrice: 0 },
      { attribute: "RAM", value: "16GB", extraPrice: 10 },
    ],
    adminId: admin2.id,
    assignedInternalId: internal2.id,
    status: "published",
    companyName: "Amazon Web Services",
  });

  const product3 = await storage.createProduct({
    name: "Google Workspace Business",
    type: "Productivity",
    salesPrice: "12.00",
    costPrice: "3.50",
    variants: [
      { attribute: "Storage", value: "2TB", extraPrice: 0 },
    ],
    adminId: admin1.id,
    assignedInternalId: internal3.id,
    status: "assigned",
    companyName: "Google LLC",
  });

  const product4 = await storage.createProduct({
    name: "Slack Enterprise",
    type: "Communication",
    salesPrice: "8.75",
    costPrice: "2.50",
    variants: [],
    adminId: admin2.id,
    status: "draft",
    companyName: "Salesforce",
  });

  const plan1 = await storage.createPlan({
    productId: product1.id,
    name: "Monthly Standard",
    price: "15.99",
    billingPeriod: "monthly",
    minQuantity: 1,
    pausable: true,
    renewable: true,
    closable: true,
    autoClose: false,
  });

  const plan1b = await storage.createPlan({
    productId: product1.id,
    name: "Yearly Premium",
    price: "149.99",
    billingPeriod: "yearly",
    minQuantity: 1,
    pausable: false,
    renewable: true,
    closable: true,
    autoClose: false,
  });

  const plan2 = await storage.createPlan({
    productId: product2.id,
    name: "On-Demand Monthly",
    price: "49.99",
    billingPeriod: "monthly",
    minQuantity: 1,
    pausable: true,
    renewable: true,
    closable: true,
    autoClose: false,
  });

  const plan2b = await storage.createPlan({
    productId: product2.id,
    name: "Reserved Yearly",
    price: "399.99",
    billingPeriod: "yearly",
    minQuantity: 1,
    pausable: false,
    renewable: true,
    closable: false,
    autoClose: true,
  });

  const sub1 = await storage.createSubscription({
    userId: demoUser.id,
    productId: product1.id,
    planId: plan1.id,
    quantity: 1,
    status: "active",
    startDate: "2025-01-15",
  });

  const sub2 = await storage.createSubscription({
    userId: demoUser.id,
    productId: product2.id,
    planId: plan2.id,
    quantity: 2,
    status: "active",
    startDate: "2025-02-01",
  });

  await storage.createInvoice({
    subscriptionId: sub1.id,
    userId: demoUser.id,
    amount: "15.99",
    status: "paid",
    dueDate: "2025-02-15",
    paidDate: "2025-02-12",
    lines: [
      { description: "Netflix Premium - Monthly Standard x1", amount: 15.99 },
    ],
    tax: "1.60",
  });

  await storage.createInvoice({
    subscriptionId: sub1.id,
    userId: demoUser.id,
    amount: "15.99",
    status: "pending",
    dueDate: "2025-03-15",
    lines: [
      { description: "Netflix Premium - Monthly Standard x1", amount: 15.99 },
    ],
    tax: "1.60",
  });

  await storage.createInvoice({
    subscriptionId: sub2.id,
    userId: demoUser.id,
    amount: "99.98",
    status: "overdue",
    dueDate: "2025-02-01",
    lines: [
      { description: "AWS EC2 Instance - On-Demand Monthly x2", amount: 99.98 },
    ],
    tax: "10.00",
  });

  await storage.createInvoice({
    subscriptionId: sub2.id,
    userId: demoUser.id,
    amount: "99.98",
    status: "paid",
    dueDate: "2025-01-01",
    paidDate: "2024-12-28",
    lines: [
      { description: "AWS EC2 Instance - On-Demand Monthly x2", amount: 99.98 },
    ],
    tax: "10.00",
  });

  console.log("Database seeded successfully!");
}
