import "dotenv/config";
import * as Sentry from "@sentry/node"

console.log("Sentry DSN:", process.env.SENTRY_DSN);
console.log("Sentry Initialized");

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
    includeLocalVariables: true,
    sendDefaultPii: true,
});