const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = "EggChanBruh"

app.use(express.json({ limit: "1mb" }));

// uid -> egg
const eggs = new Map();

function authenticated(req) {
    const auth = req.headers.authorization || "";
    return API_KEY && auth === `Bearer ${API_KEY}`;
}

function cleanString(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function normalizeEgg(raw) {
    if (!raw || typeof raw !== "object") return null;

    const uid = cleanString(raw.uid).trim();
    if (!uid || uid.length > 200) return null;

    const now = Date.now();

    return {
        uid,
        areaId: cleanString(raw.areaId),
        biome: cleanString(raw.biome || raw.areaId),
        assetCategory: cleanString(raw.assetCategory),
        pet: cleanString(raw.pet, "Unknown"),
        rarity: cleanString(raw.rarity, "Unknown"),
        mutation: raw.mutation == null || raw.mutation === ""
            ? "None"
            : cleanString(raw.mutation, "None"),
        baseMutation: raw.baseMutation == null || raw.baseMutation === ""
            ? "None"
            : cleanString(raw.baseMutation, "None"),
        firstSeen: Number.isFinite(Number(raw.firstSeen))
            ? Number(raw.firstSeen)
            : now,
        lastSeen: Number.isFinite(Number(raw.lastSeen))
            ? Number(raw.lastSeen)
            : now
    };
}

/*
    Scanner -> server

    This is the only write endpoint.
*/
app.post("/api/eggs", (req, res) => {
    if (!authenticated(req)) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const body = req.body;

    // Accept either:
    // { egg: {...} }
    // or
    // { eggs: [{...}, {...}] }
    // or directly { uid: "...", ... }
    let incoming;

    if (Array.isArray(body.eggs)) {
        incoming = body.eggs;
    } else if (body.egg) {
        incoming = [body.egg];
    } else {
        incoming = [body];
    }

    let updated = 0;
    let removed = 0;

    for (const raw of incoming) {
        // Optional removal notification
        if (raw && raw.removed === true) {
            const uid = cleanString(raw.uid).trim();

            if (uid && eggs.delete(uid)) {
                removed++;
            }

            continue;
        }

        const egg = normalizeEgg(raw);

        if (!egg) continue;

        const old = eggs.get(egg.uid);

        // Preserve original firstSeen.
        if (old && Number.isFinite(old.firstSeen)) {
            egg.firstSeen = old.firstSeen;
        }

        egg.lastSeen = Date.now();

        eggs.set(egg.uid, egg);
        updated++;
    }

    res.json({
        ok: true,
        updated,
        removed,
        totalEggs: eggs.size
    });
});


/*
    ONLY public read endpoint.

    GET /api/eggs
    GET /api/eggs?rarity=Divine
    GET /api/eggs?rarity=Divine,Eternal,Mythic
    GET /api/eggs?biome=Jungle
    GET /api/eggs?pet=Gorilla
*/
app.get("/api/eggs", (req, res) => {
    const rarityFilter = req.query.rarity
        ? req.query.rarity
            .split(",")
            .map(x => x.trim().toLowerCase())
            .filter(Boolean)
        : [];

    const biomeFilter = req.query.biome
        ? req.query.biome.trim().toLowerCase()
        : "";

    const petFilter = req.query.pet
        ? req.query.pet.trim().toLowerCase()
        : "";

    const filtered = [];

    for (const egg of eggs.values()) {
        if (
            rarityFilter.length &&
            !rarityFilter.includes(egg.rarity.toLowerCase())
        ) {
            continue;
        }

        if (
            biomeFilter &&
            egg.biome.toLowerCase() !== biomeFilter
        ) {
            continue;
        }

        if (
            petFilter &&
            egg.pet.toLowerCase() !== petFilter
        ) {
            continue;
        }

        filtered.push(egg);
    }

    // Group by biome
    const biomeMap = new Map();

    for (const egg of filtered) {
        const biome = egg.biome || "Unknown";

        if (!biomeMap.has(biome)) {
            biomeMap.set(biome, []);
        }

        biomeMap.get(biome).push({
            uid: egg.uid,
            rarity: egg.rarity,
            pet: egg.pet,
            mutation: egg.mutation,
            baseMutation: egg.baseMutation,
            areaId: egg.areaId,
            assetCategory: egg.assetCategory,
            firstSeen: egg.firstSeen,
            lastSeen: egg.lastSeen
        });
    }

    const biomes = [];

    for (const [name, biomeEggs] of biomeMap) {
        biomes.push({
            name,
            eggs: biomeEggs
        });
    }

    res.json({
        source: "roblox",
        updatedAt: new Date().toISOString(),
        totalEggs: filtered.length,
        biomes
    });
});


app.get("/health", (req, res) => {
    res.json({
        ok: true,
        eggs: eggs.size
    });
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
