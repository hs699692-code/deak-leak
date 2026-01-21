const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const API_KEY = process.env.HIBP_API_KEY;

if (!API_KEY) {
  console.error("HIBP_API_KEY is missing! Set it in terminal.");
  process.exit(1);
}

app.post("/check", async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": API_KEY,
          "user-agent": "BreachCheckerTest/1.0 (your.email@example.com)"
        }
      }
    );
    res.json({ breached: true, breaches: response.data });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.json({ breached: false });
    }
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
