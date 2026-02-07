import type { Express } from "express";
import { type Server } from "http";
import session from "express-session";
import authRouter from "./auth";
import productRouter from "./products";
import subscriptionRouter from "./subscriptions";
import invoiceRouter from "./invoices";
import userRouter from "./users";
import quotationRouter from "./quotations";
import discountRouter from "./discounts";
import taxRouter from "./taxes";
import companyRouter from "./companies";
import paymentRouter from "./payments";
import reportRouter from "./reports";
import planRouter from "./plans";

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

  app.use("/api/auth", authRouter);
  app.use("/api/products", productRouter);
  app.use("/api/subscriptions", subscriptionRouter);
  app.use("/api/invoices", invoiceRouter);
  app.use("/api/users", userRouter);
  app.use("/api/quotation-templates", quotationRouter);
  app.use("/api/discounts", discountRouter);
  app.use("/api/taxes", taxRouter);
  app.use("/api/companies", companyRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/reports", reportRouter);
  app.use("/api/plans", planRouter);

  return httpServer;
}
