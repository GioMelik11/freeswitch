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

function decodeMuLawSample(u8) {
  // G.711 µ-law to 16-bit PCM
  u8 = (~u8) & 0xff;
  const sign = u8 & 0x80;
  const exponent = (u8 >> 4) & 0x07;
  const mantissa = u8 & 0x0f;
  let sample = ((mantissa << 1) + 1) << (exponent + 2);
  sample -= 33;
  return sign ? -sample : sample;
}

function decodeALawSample(a8) {
  // G.711 A-law to 16-bit PCM
  a8 ^= 0x55;
  const sign = a8 & 0x80;
  const exponent = (a8 >> 4) & 0x07;
  const mantissa = a8 & 0x0f;
  let sample = 0;
  if (exponent === 0) sample = (mantissa << 4) + 8;
  else sample = ((mantissa << 4) + 0x108) << (exponent - 1);
  return sign ? sample : -sample;
}

function wavParse(wav) {
  // Proper RIFF/WAV parser: finds fmt/data chunks.
  if (!isWav(wav)) return null;

  let offset = 12; // after RIFF header
  let fmt = null;
  let data = null;

  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + size;
    if (chunkEnd > wav.length) break;

    if (id === "fmt ") {
      const audioFormat = wav.readUInt16LE(chunkStart);
      const numChannels = wav.readUInt16LE(chunkStart + 2);
      const sampleRate = wav.readUInt32LE(chunkStart + 4);
      const bitsPerSample = wav.readUInt16LE(chunkStart + 14);
      fmt = { audioFormat, numChannels, sampleRate, bitsPerSample };
    } else if (id === "data") {
      data = wav.subarray(chunkStart, chunkEnd);
    }

    // chunks are word-aligned
    offset = chunkEnd + (size % 2);
  }

  if (!fmt || !data) return null;
  return { fmt, data };
}

function extractWavAsPcm16Mono(wav) {
  // Returns PCM16 mono + sample rate, decoding PCM16/PCMU/PCMA, and downmixing stereo to mono.
  const parsed = wavParse(wav);
  if (!parsed) return { pcm16: wav, sampleRate: 16000 };

  const { fmt, data } = parsed;
  const { audioFormat, numChannels, sampleRate, bitsPerSample } = fmt;
  log(`🧪 wav fmt: format=${audioFormat} channels=${numChannels} sr=${sampleRate} bits=${bitsPerSample} dataBytes=${data.length}`);

  // audioFormat: 1=PCM, 6=A-law, 7=µ-law
  if (audioFormat === 1 && bitsPerSample === 16) {
    if (numChannels === 1) return { pcm16: data, sampleRate };
    if (numChannels === 2) {
      // downmix stereo PCM16 to mono
      const frames = Math.floor(data.length / 4);
      const out = Buffer.alloc(frames * 2);
      for (let i = 0; i < frames; i++) {
        const l = data.readInt16LE(i * 4);
        const r = data.readInt16LE(i * 4 + 2);
        out.writeInt16LE(((l + r) / 2) | 0, i * 2);
      }
      return { pcm16: out, sampleRate };
    }
  }

  if ((audioFormat === 6 || audioFormat === 7) && bitsPerSample === 8) {
    // A-law / µ-law (mono only for now)
    const frames = data.length / numChannels;
    const out = Buffer.alloc(frames * 2);
    if (numChannels !== 1) {
      log(`⚠️ A-law/µ-law with channels=${numChannels} not supported; using first channel only.`);
    }
    for (let i = 0; i < frames; i++) {
      const b = data[i * numChannels];
      const v = audioFormat === 7 ? decodeMuLawSample(b) : decodeALawSample(b);
      out.writeInt16LE(v, i * 2);
    }
    return { pcm16: out, sampleRate };
  }

  log(`⚠️ Unsupported WAV format (format=${audioFormat} bits=${bitsPerSample} channels=${numChannels}); streaming data as-is.`);
  return { pcm16: data, sampleRate };
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

function streamPcm(ws, pcm, frameBytes) {
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
      const chunk = pcm.subarray(offset, offset + frameBytes);
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
  const mode = url.includes("echo")
    ? "echo"
    : url.includes("tone")
      ? "tone"
      : url.includes("raw")
        ? "raw"
        : url.includes("wav")
          ? "wav"
          : "wav";
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

  if (mode === "raw") {
    // Stream a raw PCM16 mono file as-is (no wav parsing, no resampling).
    // The file must already match the rate you configure on FreeSWITCH side (8000 or 16000).
    // Default: /usr/share/freeswitch/sounds/raw/incoming.s16le (put it there from host)
    const rawRel = process.env.RAW_FILE || "raw/incoming.s16le";
    const rawPath = resolveSoundFile(rawRel);
    const outRate = Number(process.env.RAW_RATE || 8000);
    const frameBytes = outRate === 16000 ? 640 : 320; // 20ms frames, mono PCM16

    try {
      const raw = fs.readFileSync(rawPath);
      log(`🧪 streaming raw pcm16: file=${rawPath} rate=${outRate} frameBytes=${frameBytes} bytes=${raw.length}`);
      streamPcm(ws, raw, frameBytes);
    } catch (e) {
      log(`🧪 failed to stream raw file=${rawPath} err=${e?.message || e}`);
    }
    return;
  }

  if (mode === "tone") {
    // Stream a continuous sine wave tone (no file parsing at all).
    // This is the simplest possible "server -> FreeSWITCH -> phone" verification.
    const outRate = Number(process.env.TONE_RATE || 8000);
    const freq = Number(process.env.TONE_FREQ || 1000);
    const frameBytes = outRate === 16000 ? 640 : 320; // 20ms frames, mono PCM16
    const samplesPerFrame = frameBytes / 2;
    let phase = 0;
    const phaseInc = (2 * Math.PI * freq) / outRate;

    log(`🧪 streaming tone: freq=${freq}Hz rate=${outRate} frameBytes=${frameBytes}`);

    const iv = setInterval(() => {
      try {
        if (ws.readyState !== ws.OPEN) {
          clearInterval(iv);
          return;
        }
        const buf = Buffer.alloc(frameBytes);
        for (let i = 0; i < samplesPerFrame; i++) {
          const s = Math.sin(phase);
          phase += phaseInc;
          if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
          // moderate amplitude
          buf.writeInt16LE(Math.round(s * 8000), i * 2);
        }
        ws.send(buf);
      } catch {
        clearInterval(iv);
      }
    }, 20);

    ws.on("close", () => clearInterval(iv));
    ws.on("error", () => clearInterval(iv));
    return;
  }

  // WAV streaming mode:
  // We wait for the first binary frame from FreeSWITCH to detect expected frame size:
  // - 320 bytes => 8kHz mono PCM16 @ 20ms
  // - 640 bytes => 16kHz mono PCM16 @ 20ms
  let detectedFrameBytes = null;
  let firstBinLogged = 0;
  let started = false;

  const startWav = (fileRel) => {
    if (started) return;
    started = true;
    try {
      const wavPath = resolveSoundFile(fileRel || "ivr/incoming.wav");
      const wav = fs.readFileSync(wavPath);
      const { pcm16, sampleRate } = extractWavAsPcm16Mono(wav);
      const frameBytes = detectedFrameBytes || 640;
      const outRate = frameBytes === 320 ? 8000 : 16000;
      const outPcm = resamplePcm16Linear(pcm16, sampleRate, outRate);
      log(`🧪 streaming wav=${wavPath} in_sr=${sampleRate} out_sr=${outRate} frameBytes=${frameBytes} bytes=${outPcm.length}`);
      streamPcm(ws, outPcm, frameBytes);
    } catch (e) {
      log(`🧪 failed to stream wav err=${e?.message || e}`);
    }
  };

  // Fallback: if we don't see an audio frame quickly, start anyway (assume 8k unless proven otherwise).
  const fallbackIv = setTimeout(() => {
    if (started) return;
    detectedFrameBytes = detectedFrameBytes || 320;
    log(`🧪 /wav fallback start (no early frame detected) frameBytes=${detectedFrameBytes}`);
    startWav("ivr/incoming.wav");
  }, 800);
  ws.on("close", () => clearTimeout(fallbackIv));
  ws.on("error", () => clearTimeout(fallbackIv));

  ws.on("message", (data, isBinary) => {
    if (isBinary && !detectedFrameBytes) {
      const len = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
      if (firstBinLogged < 5) {
        firstBinLogged++;
        log(`🧪 /wav first frames: #${firstBinLogged} bytes=${len}`);
      }
      if (len === 320 || len === 640) {
        detectedFrameBytes = len;
        log(`🧪 detected FS frameBytes=${detectedFrameBytes}`);
        // Start default wav now that we know frame size.
        startWav("ivr/incoming.wav");
      }
      return;
    }
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


