require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const rateLimit = require("express-rate-limit"); // npm install express-rate-limit

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Optional: Basic rate limiting to protect your server & respect HIBP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // limit each IP to 20 requests per minute
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/check", limiter);

// Load API key securely
const API_KEY = process.env.HIBP_API_KEY;
if (!API_KEY) {
  console.error("Error: HIBP_API_KEY is not set in .env");
  process.exit(1);
}

app.post("/check", async (req, res) => {
  let { email } = req.body;

  // Basic validation
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Valid email is required" });
  }

  email = email.trim().toLowerCase();

  // Very basic regex (improve with validator.js if needed)
  if (!email.includes("@") || email.length < 5) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": API_KEY,
          "user-agent": "BreachChecker/1.0 (https://github.com/yourusername/breachchecker; your.email@example.com)",
        },
        timeout: 10000, // 10s timeout
      }
    );

    // Success → breaches found
    return res.json({
      breached: true,
      breaches: response.data, // full breach objects now
    });
  } catch (err) {
    if (err.response) {
      const { status } = err.response;

      if (status === 404) {
        // Not found = no breaches
        return res.json({ breached: false, breaches: [] });
      }

      if (status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Try again later.",
          retryAfter: err.response.headers["retry-after"] || "unknown",
        });
      }

      if (status === 403) {
        return res.status(403).json({ error: "Forbidden — check API key or User-Agent" });
      }
    }

    console.error("HIBP request failed:", err.message);
    return res.status(500).json({ error: "Internal server error — please try again later" });
  }
});

// Optional: health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Serve frontend (fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Ready to check breaches via POST /check { email: 'test@example.com' }");
});
