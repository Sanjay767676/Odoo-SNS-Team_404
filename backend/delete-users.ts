import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), "..", ".env") });

import { db } from "./db";
import { users } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

async function deleteUsers() {
    try {
        // First, let's see all users
        const allUsers = await db.select().from(users);
        console.log("\n=== ALL USERS IN DATABASE ===");
        allUsers.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Name: ${u.name}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  CompanyID: ${u.companyId}`);
            console.log(`  Created via Google: ${u.googleId ? 'Yes' : 'No'}`);
            console.log('---');
        });

        // Ask which users to delete
        console.log("\n=== DELETION OPTIONS ===");
        console.log("This script will help you identify which users to delete.");
        console.log("\nTo proceed with deletion, uncomment the appropriate section below and re-run.");

        // OPTION 1: Delete all internal users (uncomment to use)
        // const deletedInternals = await db.delete(users).where(eq(users.role, "internal")).returning();
        // console.log(`\nDeleted ${deletedInternals.length} internal users:`);
        // deletedInternals.forEach(u => console.log(`  - ${u.email} (${u.name})`));

        // OPTION 2: Delete all external users (role = "user") (uncomment to use)
        // const deletedExternals = await db.delete(users).where(eq(users.role, "user")).returning();
        // console.log(`\nDeleted ${deletedExternals.length} external users:`);
        // deletedExternals.forEach(u => console.log(`  - ${u.email} (${u.name})`));

        // OPTION 3: Delete both internal and external users, keep only admins (uncomment to use)
        // const deletedUsers = await db.delete(users).where(or(eq(users.role, "internal"), eq(users.role, "user"))).returning();
        // console.log(`\nDeleted ${deletedUsers.length} users (internals + externals):`);
        // deletedUsers.forEach(u => console.log(`  - ${u.email} (${u.name}) - ${u.role}`));

        console.log("\n✅ Review the users above and uncomment the appropriate deletion option in delete-users.ts");

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
    process.exit(0);
}

deleteUsers();
