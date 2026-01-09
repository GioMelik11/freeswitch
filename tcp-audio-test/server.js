import net from "node:net";

const PORT = Number(process.env.PORT || 9094);
const HOST = String(process.env.HOST || "0.0.0.0");

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * Protocol used by freeswitch/freeswitch/scripts/audio_socket_client.lua:
 * - First packet: type=0x00, len=0x0010, payload=16 bytes UUID (binary)
 * - Audio packets: type=0x10, len=uint16be, payload=PCM16 mono frames (typically 320 bytes @ 8k/20ms)
 * Server should respond with type=0x10 and PCM payload to play audio back into call.
 */
function readPacket(buffer) {
  if (buffer.length < 3) return null;
  const type = buffer.readUInt8(0);
  const len = buffer.readUInt16BE(1);
  if (buffer.length < 3 + len) return null;
  const payload = buffer.subarray(3, 3 + len);
  const rest = buffer.subarray(3 + len);
  return { type, len, payload, rest };
}

function bytesToHex(buf) {
  return Buffer.from(buf).toString("hex");
}

const server = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  log(`🎧 tcp-audio-test connected from ${remote}`);

  let buf = Buffer.alloc(0);
  let gotUuid = false;
  let uuidHex = "";
  let audioPackets = 0;
  let audioBytes = 0;
  const startedAt = Date.now();

  const statsIv = setInterval(() => {
    const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    log(
      `🎧 stats remote=${remote} uuid=${uuidHex || "-"} pkts=${audioPackets} bytes=${audioBytes} (~${Math.round(audioPackets / secs)}/s)`,
    );
  }, 5000);

  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);

    while (true) {
      const pkt = readPacket(buf);
      if (!pkt) break;
      buf = pkt.rest;

      if (pkt.type === 0x00) {
        gotUuid = true;
        uuidHex = bytesToHex(pkt.payload);
        log(`🎧 got UUID ${uuidHex} from ${remote}`);
        continue;
      }

      if (pkt.type === 0x10) {
        audioPackets++;
        audioBytes += pkt.payload.length;

        // Echo: send exact audio back so caller hears themselves.
        const header = Buffer.alloc(3);
        header.writeUInt8(0x10, 0);
        header.writeUInt16BE(pkt.payload.length, 1);
        socket.write(Buffer.concat([header, pkt.payload]));
        continue;
      }

      // Unknown packet type: ignore.
    }
  });

  socket.on("close", () => {
    clearInterval(statsIv);
    log(`🎧 tcp-audio-test closed remote=${remote} uuid=${uuidHex || "-"} gotUuid=${gotUuid}`);
  });
  socket.on("error", (e) => {
    clearInterval(statsIv);
    log(`🎧 tcp-audio-test error remote=${remote} err=${e?.message || e}`);
  });
});

server.listen(PORT, HOST, () => {
  log(`🎧 tcp-audio-test listening on ${HOST}:${PORT}`);
});


