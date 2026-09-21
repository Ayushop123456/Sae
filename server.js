const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "EggChanBruh";

let latest = {
  source: null,
  updatedAt: null,
  biomes: []
};

function authorized(req) {
  if (!API_KEY) return true;
  return req.header("x-api-key") === API_KEY;
}

function cleanSnapshot(body) {
  // Expected:
  // {
  //   source: "roblox",
  //   biomes: [
  //     {
  //       biome: "Forest",
  //       eggs: [
  //         {
  //           name: "Basic Egg",
  //           rarity: "Common",
  //           mutations: [],
  //           pets: [
  //             { name: "La Vaca", rarity: "Common", chance: 25 }
  //           ]
  //         }
  //       ]
  //     }
  //   ]
  // }
  if (!body || !Array.isArray(body.biomes)) {
    throw new Error("body.biomes must be an array");
  }

  const biomes = body.biomes.map(b => ({
    biome: String(b.biome ?? "Unknown"),
    eggs: Array.isArray(b.eggs) ? b.eggs.map(e => ({
      name: String(e.name ?? "Unknown Egg"),
      rarity: e.rarity == null ? null : String(e.rarity),
      mutations: Array.isArray(e.mutations) ? e.mutations.map(String) : [],
      pets: Array.isArray(e.pets) ? e.pets.map(p => ({
        name: String(p.name ?? "Unknown Pet"),
        rarity: p.rarity == null ? null : String(p.rarity),
        chance: p.chance == null ? null : Number(p.chance)
      })) : []
    })) : []
  }));

  return {
    source: body.source == null ? "roblox" : String(body.source),
    updatedAt: new Date().toISOString(),
    biomes
  };
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Roblox Egg + Pet API",
    endpoints: {
      latest: "GET /eggs",
      update: "POST /eggs",
      health: "GET /health"
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), updatedAt: latest.updatedAt });
});

app.get("/eggs", (_req, res) => {
  res.json(latest);
});

app.post("/eggs", (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: "Invalid API key" });
  }

  try {
    latest = cleanSnapshot(req.body);
    console.log(
      `[EGGS] ${latest.biomes.length} biome(s), ` +
      `${latest.biomes.reduce((n, b) => n + b.eggs.length, 0)} egg(s)`
    );
    res.json({ ok: true, updatedAt: latest.updatedAt });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Egg API listening on port ${PORT}`);
});
