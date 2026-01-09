-- Test helper: start mod_audio_stream pointing to a test WS server.
--
-- Dialplan usage:
--   <action application="set" data="audio_stream_test_url=$${audio_stream_test_url}"/>
--   <action application="lua" data="start_audio_stream_test.lua"/>          (base URL)
--   <action application="lua" data="start_audio_stream_test.lua /echo"/>    (base + suffix)
--
-- You can also pass a full URL as argv[1].

local function argv_or(i, default)
    if argv and argv[i] and tostring(argv[i]) ~= "" then return tostring(argv[i]) end
    return default
end

local function is_full_ws_url(s)
    return s and (string.find(s, "^ws://") or string.find(s, "^wss://"))
end

if not session then
    freeswitch.consoleLog("ERR", "start_audio_stream_test.lua: no session\n")
    return
end

local uuid = session:get_uuid()

-- Prefer channel var (set by dialplan), then argv[1], then a safe default.
local base = session:getVariable("audio_stream_test_url")
if base and string.find(base, "%$%$%{") then
    freeswitch.consoleLog("WARNING", "start_audio_stream_test.lua: audio_stream_test_url looks unexpanded: " .. base .. "\n")
    base = nil
end

local a1 = argv_or(1, "")
local url = nil
if is_full_ws_url(a1) then
    url = a1
elseif a1 ~= "" then
    -- treat as suffix like "/echo"
    url = (base or "ws://127.0.0.1:9096") .. a1
else
    url = base or "ws://127.0.0.1:9096"
end

-- Use "mixed" so the stream includes the caller's microphone audio (read) as well as any audio
-- FreeSWITCH plays to the caller (write). This is important for /echo tests: if we stream only
-- the write direction, there may be nothing to echo back.
local mix = "mixed"
local rate = "16k"
local meta = "{\"mode\":\"test\"}"

local api = freeswitch.API()
local cmd = "uuid_audio_stream " .. uuid .. " start " .. url .. " " .. mix .. " " .. rate .. " " .. meta
freeswitch.consoleLog("INFO", "start_audio_stream_test.lua: " .. cmd .. "\n")
api:executeString(cmd)


