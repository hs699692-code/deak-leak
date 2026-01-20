require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const API_KEY = process.env.HIBP_API_KEY;

app.post("/check", async (req, res) => {
  const email = req.body.email;

  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const hibpResponse = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          "hibp-api-key": API_KEY,
          "user-agent": "EmailBreachChecker"
        }
      }
    );

    return res.json({ breached: true, breaches: hibpResponse.data });

  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.json({ breached: false });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
