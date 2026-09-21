const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "EggChanBruh";

app.use(express.json({ limit: "5mb" }));

let latest = {
    source: "roblox",
    updatedAt: null,
    biomes: [],
    eggs: [],
    pets: [],
    assets: []
};

// ONLY ENDPOINT: /eggs
app.get("/eggs", (req, res) => {
    res.json(latest);
});

app.post("/eggs", (req, res) => {
    if (req.headers["x-api-key"] !== API_KEY) {
        return res.status(401).json({
            ok: false,
            error: "Invalid API key"
        });
    }

    if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({
            ok: false,
            error: "Invalid JSON body"
        });
    }

    latest = {
        ...req.body,
        source: "roblox",
        updatedAt: new Date().toISOString()
    };

    console.log(
        `[EGGS] biomes=${latest.biomes?.length || 0} ` +
        `eggs=${latest.eggs?.length || 0} ` +
        `pets=${latest.pets?.length || 0} ` +
        `assets=${latest.assets?.length || 0}`
    );

    res.json({
        ok: true,
        updatedAt: latest.updatedAt
    });
});

app.listen(PORT, () => {
    console.log(`Egg API running on port ${PORT}`);
});
