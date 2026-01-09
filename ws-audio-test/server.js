import fs from "node:fs";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 9096);
const FS_SOUND_DIR = String(process.env.FS_SOUND_DIR || "/usr/share/freeswitch/sounds");

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

function isWav(buf) {
  return buf.length >= 44 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE";
}

function extractWavPcm16Mono(wav) {
  // Minimal RIFF/WAV reader (best-effort).
  if (!isWav(wav)) return { pcm: wav, sampleRate: 16000 };
  const sampleRate = wav.readUInt32LE(24) || 16000;
  const channels = wav.readUInt16LE(22) || 1;
  const bits = wav.readUInt16LE(34) || 16;
  const pcm = wav.subarray(44);
  if (channels !== 1 || bits !== 16) {
    log(`⚠️ wav format not mono pcm16 (channels=${channels} bits=${bits}). Will still stream data chunk as-is.`);
  }
  return { pcm, sampleRate };
}

function resamplePcm16Linear(pcm, fromRate, toRate) {
  if (fromRate === toRate) return pcm;
  const inSamples = Math.floor(pcm.length / 2);
  const outSamples = Math.max(1, Math.floor(inSamples * (toRate / fromRate)));
  const out = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const t = i * (fromRate / toRate);
    const i0 = Math.floor(t);
    const i1 = Math.min(inSamples - 1, i0 + 1);
    const frac = t - i0;
    const s0 = pcm.readInt16LE(i0 * 2);
    const s1 = pcm.readInt16LE(i1 * 2);
    let v = Math.round(s0 + (s1 - s0) * frac);
    if (v > 32767) v = 32767;
    if (v < -32768) v = -32768;
    out.writeInt16LE(v, i * 2);
  }
  return out;
}

function resolveSoundFile(rel) {
  const safeRel = String(rel || "").replace(/^\/+/, "");
  const candidates = [
    path.resolve(FS_SOUND_DIR, safeRel),
    path.resolve(FS_SOUND_DIR, "sounds", safeRel),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  return found || candidates[0];
}

function streamPcm16k(ws, pcm16k) {
  // mod_audio_stream uses 16k mono PCM16 -> 20ms frames = 640 bytes.
  const frameBytes = 640;
  let offset = 0;

  const iv = setInterval(() => {
    try {
      if (ws.readyState !== ws.OPEN) {
        clearInterval(iv);
        return;
      }
      if (offset >= pcm16k.length) {
        clearInterval(iv);
        return;
      }
      const chunk = pcm16k.subarray(offset, offset + frameBytes);
      offset += frameBytes;
      ws.send(chunk);
    } catch {
      clearInterval(iv);
    }
  }, 20);

  ws.on("close", () => clearInterval(iv));
  ws.on("error", () => clearInterval(iv));
}

// Bind explicitly to IPv4 to avoid intermittent IPv6 (::) bind conflicts on some WSL/Docker host-network setups.
const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });
log(`🧪 ws-audio-test listening: ws://0.0.0.0:${PORT}`);
log(`🧪 FS_SOUND_DIR=${FS_SOUND_DIR}`);
log(`🧪 Paths:`);
log(`   - /echo  -> binary echo (hear yourself if FS sends audio)`);
log(`   - /wav   -> stream a wav (default ivr/incoming.wav), or send JSON {"type":"play","file":"ivr/incoming.wav"}`);

wss.on("connection", (ws, req) => {
  const url = String(req.url || "/");
  const mode = url.includes("echo") ? "echo" : url.includes("wav") ? "wav" : "wav";
  log(`🧪 connected from=${req.socket.remoteAddress} path=${url} mode=${mode}`);

  if (mode === "echo") {
    let binCount = 0;
    let textCount = 0;
    const startedAt = Date.now();

    const statsIv = setInterval(() => {
      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      log(`🧪 /echo stats: bin=${binCount} text=${textCount} (~${Math.round(binCount / secs)}/s)`);
    }, 5000);

    ws.on("close", () => clearInterval(statsIv));
    ws.on("error", () => clearInterval(statsIv));

    ws.on("message", (data, isBinary) => {
      if (!isBinary) {
        textCount++;
        return;
      }
      binCount++;
      if (binCount <= 5) {
        const len = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
        log(`🧪 /echo first frames: #${binCount} bytes=${len}`);
      }
      if (ws.readyState !== ws.OPEN) return;
      ws.send(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });
    return;
  }

  // WAV streaming mode: start immediately; can also be triggered by JSON message.
  const startWav = (fileRel) => {
    try {
      const wavPath = resolveSoundFile(fileRel || "ivr/incoming.wav");
      const wav = fs.readFileSync(wavPath);
      const { pcm, sampleRate } = extractWavPcm16Mono(wav);
      const pcm16k = resamplePcm16Linear(pcm, sampleRate, 16000);
      log(`🧪 streaming wav=${wavPath} in_sr=${sampleRate} out_sr=16000 bytes=${pcm16k.length}`);
      streamPcm16k(ws, pcm16k);
    } catch (e) {
      log(`🧪 failed to stream wav err=${e?.message || e}`);
    }
  };

  startWav("ivr/incoming.wav");

  ws.on("message", (data, isBinary) => {
    if (isBinary) return;
    try {
      const s = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      const msg = JSON.parse(s);
      if (msg?.type === "play" && typeof msg.file === "string") startWav(msg.file);
    } catch {
      // ignore
    }
  });
});


