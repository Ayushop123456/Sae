const http = require("http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "EggChanBruh";

let latest = {
    source: "roblox",
    updatedAt: null,
    totalEggs: 0,
    biomes: []
};

function sendJSON(res, status, data) {
    const body = JSON.stringify(data);

    res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
    });

    res.end(body);
}

const server = http.createServer((req, res) => {

    // =========================
    // GET /eggs
    // =========================
    if (req.method === "GET" && req.url === "/eggs") {
        return sendJSON(res, 200, latest);
    }

    // =========================
    // POST /eggs
    // =========================
    if (req.method === "POST" && req.url === "/eggs") {

        if (req.headers["x-api-key"] !== API_KEY) {
            return sendJSON(res, 401, {
                ok: false,
                error: "Unauthorized"
            });
        }

        let body = "";

        req.on("data", chunk => {
            body += chunk;

            // Prevent huge requests
            if (body.length > 2 * 1024 * 1024) {
                req.destroy();
            }
        });

        req.on("end", () => {
            try {
                const data = JSON.parse(body);

                // Must contain the live egg list
                if (!data || !Array.isArray(data.biomes)) {
                    return sendJSON(res, 400, {
                        ok: false,
                        error: "Invalid payload: biomes must be an array"
                    });
                }

                // Replace the old snapshot completely
                latest = {
                    source: "roblox",
                    updatedAt: new Date().toISOString(),
                    totalEggs: Number(data.totalEggs) || 0,
                    biomes: data.biomes
                };

                console.log(
                    `[EGGS] Updated: ${latest.totalEggs} live eggs`
                );

                return sendJSON(res, 200, {
                    ok: true,
                    totalEggs: latest.totalEggs,
                    updatedAt: latest.updatedAt
                });

            } catch (err) {
                return sendJSON(res, 400, {
                    ok: false,
                    error: "Invalid JSON"
                });
            }
        });

        return;
    }

    // =========================
    // Everything else = 404
    // =========================
    return sendJSON(res, 404, {
        ok: false,
        error: "Not Found"
    });
});

server.listen(PORT, () => {
    console.log(`SAE Egg API running on port ${PORT}`);
});
