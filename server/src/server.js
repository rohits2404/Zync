import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import * as Sentry from "@sentry/node";

import { connectDB } from "./config/db.js";

import { functions, inngest } from "./config/inngest.js";
import chatRoutes from "./routes/chat.route.js";

// ─── Validate Required Env Vars ───────────────────────────────────────────────

const REQUIRED_ENV = ["PORT", "CLIENT_URL", "NODE_ENV"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(`[Server] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(helmet()); // Sets secure HTTP headers
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// ─── Core Middleware ──────────────────────────────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(clerkMiddleware());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ─── Debug (Non-production only) ──────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
    app.get("/debug-sentry", (req, res) => {
        throw new Error("Sentry test error");
    });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Sentry Error Handler (must be after routes) ──────────────────────────────

Sentry.setupExpressErrorHandler(app);

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error("[Server] Unhandled error:", err.message);
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

const shutdown = (signal) => {
    console.log(`[Server] ${signal} received, shutting down gracefully...`);
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    console.error("[Server] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("[Server] Uncaught exception:", error.message);
    process.exit(1);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const startServer = async () => {
    try {
        await connectDB();
        app.listen(process.env.PORT, () => {
            console.log(`[Server] Running on port ${process.env.PORT} in ${process.env.NODE_ENV} mode`);
        });
    } catch (error) {
        console.error("[Server] Failed to start:", error.message);
        process.exit(1);
    }
};

startServer();

export default app;