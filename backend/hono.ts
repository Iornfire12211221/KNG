import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";

// Create main app
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// API routes
const api = new Hono();

// Mount tRPC router at /trpc
api.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
api.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Mount API at /api
app.route("/api", api);

// Serve static files from dist directory (for production)
if (process.env.NODE_ENV === "production") {
  console.log("Production mode: serving static files from ./dist");
  
  // Check if dist directory exists
  const distPath = path.join(process.cwd(), 'dist');
  console.log('Checking dist directory:', distPath);
  
  try {
    const distExists = fs.existsSync(distPath);
    console.log('Dist directory exists:', distExists);
    
    if (distExists) {
      const files = fs.readdirSync(distPath);
      console.log('Files in dist:', files);
      
      const indexExists = fs.existsSync(path.join(distPath, 'index.html'));
      console.log('index.html exists:', indexExists);
    }
  } catch (error) {
    console.error('Error checking dist directory:', error);
  }
  
  // Serve static assets with proper paths and fallbacks
  app.use("/_expo/*", serveStatic({ root: "./dist" }));
  app.use("/static/*", serveStatic({ root: "./dist" }));
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  
  // Serve favicon with fallback
  app.get("/favicon.ico", async (c) => {
    try {
      const faviconPath = path.join(process.cwd(), 'dist', 'favicon.ico');
      if (fs.existsSync(faviconPath)) {
        return await serveStatic({ path: "./dist/favicon.ico" })(c, async () => {});
      } else {
        console.warn('⚠️ favicon.ico not found, returning 204');
        return c.body(null, 204);
      }
    } catch (error) {
      console.error('❌ Error serving favicon:', error);
      return c.body(null, 204);
    }
  });
  
  // Serve index.html for root
  app.get("/", async (c) => {
    try {
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        return await serveStatic({ path: "./dist/index.html" })(c, async () => {});
      } else {
        console.error('❌ index.html not found in dist directory');
        return c.text('Application not built. Please run: bunx expo export --platform web', 500);
      }
    } catch (error) {
      console.error('❌ Error serving index.html:', error);
      return c.text('Server error', 500);
    }
  });
  
  // SPA fallback for all other routes
  app.get("*", async (c) => {
    try {
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        return await serveStatic({ path: "./dist/index.html" })(c, async () => {});
      } else {
        console.error('❌ index.html not found for SPA fallback');
        return c.text('Application not built. Please run: bunx expo export --platform web', 404);
      }
    } catch (error) {
      console.error('❌ Error in SPA fallback:', error);
      return c.text('Server error', 500);
    }
  });
} else {
  // Development mode - just serve API
  app.get("/", (c) => {
    return c.json({ status: "ok", message: "Development server running" });
  });
}

// Start server
const port = process.env.PORT || 8081;
console.log(`Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

export default app;