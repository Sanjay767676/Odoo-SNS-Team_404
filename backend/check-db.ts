import "dotenv/config";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function check() {
    try {
        const allUsers = await db.select().from(users);
        console.log("--- ALL USERS ---");
        allUsers.forEach(u => {
            console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, CompanyID: ${u.companyId}`);
        });
        console.log("-----------------");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
