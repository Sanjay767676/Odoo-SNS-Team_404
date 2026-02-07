import { type Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

declare module "express-session" {
    interface SessionData {
        userId: string;
    }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(supplied: string, stored: string): Promise<boolean> {
    const [hashedPassword, salt] = stored.split(".");
    const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(Buffer.from(hashedPassword, "hex"), buf);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
        console.log(`[DEBUG] requireAuth - No userId in session. SessionID: ${req.session.id}`);
        return res.status(401).send("Not authenticated");
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
        return res.status(401).send("User not found");
    }
    (req as any).currentUser = user;
    next();
}

export function requireRole(...roles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.session.userId) {
            return res.status(401).send("Not authenticated");
        }
        const user = await storage.getUser(req.session.userId);
        if (!user || !roles.includes(user.role)) {
            return res.status(403).send("Access denied");
        }
        (req as any).currentUser = user;
        next();
    };
}
