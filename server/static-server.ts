import express from "express";
import path from "path";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// In production, dist/index.cjs runs from /dist, and public is at /dist/public
// We need to serve from the public folder relative to the bundle location
const publicPath = path.join(process.cwd(), "dist/public");

// Serve static files from dist/public
app.use(express.static(publicPath));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: "static-only" });
});

// SPA fallback - serve index.html for all other routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Static server running on port ${PORT}`);
});
