import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { hashPassword, comparePassword } from "./auth-utils";
import { sendOTPEmail } from "./mail";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "crypto";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req: Request, res: Response) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).send("Invalid Google token");
        }

        let user = await storage.getUserByEmail(payload.email);
        let isNew = false;
        if (!user) {
            isNew = true;
            user = await storage.createUser({
                name: payload.name || "Google User",
                email: payload.email,
                password: await hashPassword(randomBytes(32).toString("hex")),
                role: "user",
                isVerified: true,
                googleId: payload.sub,
            });
        } else if (!user.googleId) {
            await storage.updateUser(user.id, { googleId: payload.sub, isVerified: true });
        }

        req.session.userId = user.id;
        const { password: _, ...safeUser } = user;
        res.json({ ...safeUser, isNew });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.post("/signup", async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).send("All fields are required");
        }
        if (!["admin", "internal", "user"].includes(role)) {
            return res.status(400).send("Invalid role");
        }

        const existing = await storage.getUserByEmail(email);
        if (existing) {
            return res.status(400).send("Email already in use");
        }

        const hashedPassword = await hashPassword(password);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const user = await storage.createUser({
            name,
            email,
            password: hashedPassword,
            role,
            isVerified: false,
            otp,
            otpExpiry,
        });

        await sendOTPEmail(email, otp);
        res.json({ message: "OTP sent to your email", userId: user.id, isSignup: true });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.post("/verify-otp", async (req: Request, res: Response) => {
    try {
        const { userId, otp } = req.body;
        const user = await storage.getUser(userId);

        if (!user || user.otp !== otp || (user.otpExpiry && user.otpExpiry < new Date())) {
            return res.status(400).send("Invalid or expired OTP");
        }

        await storage.updateUserVerification(userId, true);
        await storage.updateUser(userId, { otp: null, otpExpiry: null });

        req.session.userId = user.id;
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        const user = await storage.getUserByEmail(email);
        if (!user) {
            return res.status(401).send("Invalid credentials");
        }

        if (!user.isVerified) {
            return res.status(403).send("Email not verified");
        }

        const valid = await comparePassword(password, user.password);
        if (!valid) {
            return res.status(401).send("Invalid credentials");
        }

        req.session.userId = user.id;
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.get("/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
        return res.status(401).send("Not authenticated");
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
        return res.status(401).send("User not found");
    }
    console.log(`[DEBUG] /api/auth/me - User: ${user.email}, Role: ${user.role}, CompanyID: ${user.companyId}`);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
});

router.post("/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await storage.getUserByEmail(email);
        if (!user) {
            return res.status(404).send("Email id not registered");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        await storage.setUserOTP(user.id, otp, expiry);
        await sendOTPEmail(email, otp);

        res.json({ message: "OTP sent to your email", userId: user.id });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.post("/reset-password", async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).send("Token and password are required");

        const user = await storage.getUserByResetToken(token);
        if (!user) return res.status(400).send("Invalid or expired reset token");

        if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            return res.status(400).send("Password must be 8+ chars with uppercase, lowercase, and special character");
        }

        const hashedPassword = await hashPassword(password);
        await storage.updateUser(user.id, {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
        });

        res.json({ message: "Password has been reset successfully." });
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
