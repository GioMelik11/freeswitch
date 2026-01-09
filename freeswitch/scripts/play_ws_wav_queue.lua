-- Play WAV files produced by a websocket service, in order, then delete them.
--
-- Dialplan usage:
--   <action application="lua" data="/usr/local/freeswitch/etc/freeswitch/scripts/play_ws_wav_queue.lua <dir> [poll_ms] [initial_delay_ms]"/>
--
-- Example:
--   play_ws_wav_queue.lua /usr/share/freeswitch/sounds/tmp/ws-echo-q/${uuid} 20 400

local function argv_or(i, default)
    if argv and argv[i] and tostring(argv[i]) ~= "" then return tostring(argv[i]) end
    return default
end

if not session then
    freeswitch.consoleLog("ERR", "play_ws_wav_queue.lua: no session\n")
    return
end

local dir = argv_or(1, "")
local poll_ms = tonumber(argv_or(2, "50")) or 50
local initial_delay_ms = tonumber(argv_or(3, "0")) or 0

if dir == "" then
    freeswitch.consoleLog("ERR", "play_ws_wav_queue.lua: missing dir\n")
    return
end

freeswitch.consoleLog("INFO", "play_ws_wav_queue.lua: watching " .. dir .. " poll_ms=" .. tostring(poll_ms) .. " initial_delay_ms=" .. tostring(initial_delay_ms) .. "\n")

-- If the endpoint uses aggressive echo cancellation (e.g. MicroSIP), near-zero-latency echo can be canceled.
-- A small intentional delay here preserves audio quality (still 20ms chunks) while making the echo audible.
if initial_delay_ms > 0 then
    session:sleep(initial_delay_ms)
end

local function list_wavs_sorted(d)
    -- Using ls to keep it simple (works in most FS containers)
    local cmd = "ls -1 " .. d .. "/*.wav 2>/dev/null | sort"
    local p = io.popen(cmd)
    if not p then return {} end
    local out = {}
    for line in p:lines() do
        if line and line ~= "" then table.insert(out, line) end
    end
    p:close()
    return out
end

while session:ready() do
    local files = list_wavs_sorted(dir)
    if #files > 0 then
        local f = files[1]
        freeswitch.consoleLog("INFO", "play_ws_wav_queue.lua: play " .. f .. "\n")
        session:streamFile(f)
        os.remove(f)
    else
        session:sleep(poll_ms)
    end
end

-- Explicitly stop mod_audio_stream on exit. In some builds it can linger briefly after hangup.
local function stop_audio_stream()
    local uuid = session:get_uuid()
    if uuid and uuid ~= "" then
        local api = freeswitch.API()
        api:executeString("uuid_audio_stream " .. uuid .. " stop")
    end
end

stop_audio_stream()

-- Call ended: best-effort cleanup of any remaining chunks and the directory.
-- (This covers cases where the call ends before all queued chunks were played.)
local function cleanup_dir(d)
    -- delete any leftover chunk wavs
    os.execute("rm -f " .. d .. "/*.wav 2>/dev/null")
    -- remove dir if empty
    os.execute("rmdir " .. d .. " 2>/dev/null")
end

cleanup_dir(dir)


