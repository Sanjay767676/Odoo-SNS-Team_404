import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth-utils";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).currentUser;
    let allProducts = await storage.getProducts(user.companyId);

    if (user.role === "user") {
        allProducts = allProducts.filter(p => p.status === "published");
    }

    res.json(allProducts);
});

router.post("/", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const { name, type, salesPrice, costPrice, variants, companyName } = req.body;

        if (!name || !type || !salesPrice || !costPrice) {
            return res.status(400).send("Name, type, sales price, and cost price are required");
        }

        const product = await storage.createProduct({
            name,
            type,
            salesPrice,
            costPrice,
            variants: variants || [],
            adminId: user.id,
            status: "draft",
            companyId: user.companyId,
            companyName: companyName || null,
        });
        res.json(product);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.patch("/:id/assign", requireRole("admin"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const product = await storage.getProduct(id);

        if (!product) return res.status(404).send("Product not found");
        if (product.adminId !== user.id) return res.status(403).send("Not your product");

        const { internalId } = req.body;
        if (!internalId) return res.status(400).send("Internal ID is required");

        const updated = await storage.updateProduct(id, {
            assignedInternalId: internalId,
            status: "pending_internal",
        });
        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

router.patch("/:id/publish", requireRole("internal"), async (req: Request, res: Response) => {
    try {
        const user = (req as any).currentUser;
        const id = req.params.id as string;
        const product = await storage.getProduct(id);

        if (!product) return res.status(404).send("Product not found");
        if (product.assignedInternalId !== user.id) return res.status(403).send("Not assigned to you");

        const updated = await storage.updateProduct(id, { status: "published" });
        res.json(updated);
    } catch (err: any) {
        res.status(500).send(err.message);
    }
});

export default router;
