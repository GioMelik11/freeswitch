-- FreeSWITCH AudioSocket Client Script
-- Connects to backend AudioSocket service (port 9094)
-- Usage:
--   lua audio_socket_client.lua <call_uuid> <backend_host> <backend_port>
-- Notes:
-- - When called from dialplan, <call_uuid> will usually be ${uuid} (with dashes).
-- - When called from fs_cli (no session), the script will only connect + send UUID, then exit.

local function safe_get_uuid()
    if argv and argv[1] and #tostring(argv[1]) > 0 then return tostring(argv[1]) end
    if session and session.get_uuid then return tostring(session:get_uuid()) end
    return ""
end

local uuid = safe_get_uuid()
uuid = uuid:gsub("%-", ""):lower()

if not uuid:match("^[0-9a-f]+$") or #uuid ~= 32 then
    freeswitch.consoleLog("ERR", "AudioSocket Client: Invalid UUID '" .. tostring(uuid) .. "' (expected 32 hex chars)\n")
    return
end

-- Default to localhost:9098 (WSL/Docker host-network friendly).
-- Override by passing argv[2]=host argv[3]=port from dialplan.
local backend_host = argv[2] or "127.0.0.1"
local backend_port = argv[3] or "9098"

freeswitch.consoleLog("INFO", "AudioSocket Client: Connecting to " .. backend_host .. ":" .. backend_port .. " for call " .. uuid .. "\n")

-- Create socket connection
local socket = require("socket")
local tcp = socket.tcp()
tcp:settimeout(3) -- seconds for connect
local success, err = tcp:connect(backend_host, tonumber(backend_port))

if not success then
    freeswitch.consoleLog("ERR", "AudioSocket Client: Failed to connect: " .. tostring(err) .. "\n")
    return
end

freeswitch.consoleLog("INFO", "AudioSocket Client: Connected successfully\n")

-- Send UUID (16 bytes) as first message (type 0x00)
local uuid_bytes = {}
for i = 1, 16 do
    local hex = string.sub(uuid, i * 2 - 1, i * 2)
    uuid_bytes[i] = string.char(tonumber(hex, 16))
end
local uuid_packet = string.char(0x00) .. string.char(0x00) .. string.char(0x10) .. table.concat(uuid_bytes)
tcp:send(uuid_packet)

-- If no session (e.g., called from fs_cli), just test connectivity and exit.
if not session then
    freeswitch.consoleLog("INFO", "AudioSocket Client: No session available (fs_cli mode). UUID sent; exiting.\n")
    tcp:close()
    return
end

-- Set socket to non-blocking
tcp:settimeout(0)

-- Stream audio
local function stream_audio()
    local chunk_size = 320  -- 20ms of 8kHz PCM

    local sent = 0
    local received_frames = 0
    while session:ready() do
        local ok_read, audio_data = pcall(function()
            return session:read(chunk_size, "L16", 8000)
        end)
        if not ok_read then
            freeswitch.consoleLog("ERR", "AudioSocket Client: session:read failed: " .. tostring(audio_data) .. "\n")
            session:sleep(50)
            break
        end

        if audio_data and #audio_data > 0 then
            -- Send audio packet (type 0x10)
            local audio_len = #audio_data
            local header = string.char(0x10) .. string.char(math.floor(audio_len / 256)) .. string.char(audio_len % 256)
            tcp:send(header .. audio_data)
            sent = sent + 1
            if sent % 100 == 0 then
                freeswitch.consoleLog("INFO", "AudioSocket Client: sent_frames=" .. tostring(sent) .. " recv_frames=" .. tostring(received_frames) .. "\n")
            end
        else
            -- No audio ready; avoid a tight loop
            session:sleep(20)
        end

        -- Try to receive audio from backend (non-blocking)
        local received = tcp:receive(3)  -- Read header
        if received and #received == 3 then
            local msg_type = string.byte(received, 1)
            local payload_len = string.byte(received, 2) * 256 + string.byte(received, 3)

            if msg_type == 0x10 and payload_len > 0 then
                local audio_payload = tcp:receive(payload_len)
                if audio_payload and #audio_payload > 0 then
                    local ok_write, err_write = pcall(function()
                        session:write(audio_payload, "L16", 8000)
                    end)
                    if not ok_write then
                        freeswitch.consoleLog("ERR", "AudioSocket Client: session:write failed: " .. tostring(err_write) .. "\n")
                        session:sleep(50)
                        break
                    end
                    received_frames = received_frames + 1
                end
            end
        end
    end
end

-- Start streaming in a separate thread
session:setAutoHangup(false)
local ok_stream, err_stream = pcall(stream_audio)
if not ok_stream then
    freeswitch.consoleLog("ERR", "AudioSocket Client: stream_audio crashed: " .. tostring(err_stream) .. "\n")
end

-- Cleanup
tcp:close()
freeswitch.consoleLog("INFO", "AudioSocket Client: Connection closed\n")

