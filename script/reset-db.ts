
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function reset() {
    console.log("Resetting database...");
    await db.execute(sql`TRUNCATE TABLE users, products, plans, subscriptions, invoices, quotation_templates, companies, payments, discounts, taxes CASCADE`);
    console.log("Database reset complete");
    process.exit(0);
}

reset().catch((e) => {
    console.error(e);
    process.exit(1);
});
