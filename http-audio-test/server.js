import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT || 9099);
const FS_SOUND_DIR = String(process.env.FS_SOUND_DIR || "/usr/share/freeswitch/sounds");
const DEFAULT_FILE = String(process.env.DEFAULT_WAV || "ivr/incoming.wav");

function resolveSound(rel) {
  const safe = String(rel || "").replace(/^\/+/, "");
  const candidates = [
    path.resolve(FS_SOUND_DIR, safe),
    path.resolve(FS_SOUND_DIR, "sounds", safe),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const rel = url.searchParams.get("file") || DEFAULT_FILE;
  const wavPath = resolveSound(rel);

  try {
    const stat = fs.statSync(wavPath);
    res.writeHead(200, {
      "Content-Type": "audio/wav",
      "Content-Length": stat.size,
    });
    fs.createReadStream(wavPath).pipe(res);
  } catch (e) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`not found: ${wavPath}\n`);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`✅ http-audio-test listening on http://0.0.0.0:${PORT}/?file=ivr/incoming.wav`);
});


