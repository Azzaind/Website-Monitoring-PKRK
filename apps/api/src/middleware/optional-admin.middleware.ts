import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

interface AdminTokenPayload {
  userId: string;
  role: string;
}

/** Allow anonymous public access; validate a token whenever one is supplied. */
export async function optionalAdmin(req: Request, res: Response, next: NextFunction) {
  res.locals.isAdmin = false;
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Invalid authorization header" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token is required" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET belum ditemukan di .env");
    const decoded = jwt.verify(token, secret) as AdminTokenPayload;
    if (decoded.role !== "admin" || typeof decoded.userId !== "string") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const admin = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!admin || !admin.isActive || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin account is inactive or unavailable" });
    }
    res.locals.isAdmin = true;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
    }
    console.error("Optional admin authentication error:", error);
    return res.status(500).json({ success: false, message: "Authentication failed" });
  }
}
