import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireRole, hashPassword } from "./auth-utils";
import fs from "fs";
import path from "path";

const router = Router();
const LOG_FILE = path.join(process.cwd(), "debug.log");

function logToFile(msg: string) {
    const time = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `${time} ${msg}\n`);
}

router.get("/internals", requireRole("admin"), async (req: Request, res: Response) => {
    const admin = (req as any).currentUser;
    logToFile(`[DEBUG] GET /internals - Admin Email: ${admin.email}, CompanyID: ${admin.companyId}`);
    const internals = await storage.getInternalUsers(admin.companyId);
    logToFile(`[DEBUG] GET /internals - Found ${internals.length} internals for company: ${admin.companyId}`);
    const safe = internals.map(({ password: _, ...u }) => u);
    res.json(safe);
});

router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const allUsers = await storage.getUsers(user.companyId);
        const safe = allUsers.map(({ password: _, ...u }) => u);
        res.json(safe);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.post("/internals", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const admin = (req as any).currentUser;
        const { name, email, password } = req.body;
        logToFile(`[DEBUG] POST /internals - Creating user: ${email}, for Admin CompanyID: ${admin.companyId}`);

        if (!name || !email || !password) {
            return res.status(400).send("All fields are required");
        }

        const existing = await storage.getUserByEmail(email);
        if (existing) {
            if (existing.role === "user") {
                return res.status(400).send("Mail is registered as externel user");
            }
            return res.status(400).send("Email already in use");
        }

        const hashedPassword = await hashPassword(password);
        const user = await storage.createUser({
            name,
            email,
            password: hashedPassword,
            role: "internal",
            companyId: admin.companyId,
            isVerified: true,
        });

        logToFile(`[DEBUG] POST /internals - Created internal user ID: ${user.id} with CompanyID: ${user.companyId}`);
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

// DELETE endpoint to clean up test users
router.delete("/cleanup", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const { roles } = req.body; // Array of roles to delete: ["internal", "user"]

        if (!roles || !Array.isArray(roles)) {
            return res.status(400).send("Roles array is required");
        }

        const deletedUsers = [];
        for (const role of roles) {
            if (!["internal", "user"].includes(role)) {
                continue; // Skip invalid roles, don't delete admins
            }

            const users = await storage.getUsers(""); // Get all users
            const toDelete = users.filter(u => u.role === role);

            for (const user of toDelete) {
                await storage.updateUser(user.id, { role: "deleted" }); // Soft delete
                deletedUsers.push({ email: user.email, name: user.name, role: user.role });
            }
        }

        res.json({
            message: `Deleted ${deletedUsers.length} users`,
            deleted: deletedUsers
        });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
