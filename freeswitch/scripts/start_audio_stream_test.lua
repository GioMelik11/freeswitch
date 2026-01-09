-- Test helper: start mod_audio_stream pointing to the admin-panel test WS server.
--
-- Usage from dialplan:
--   <action application="lua" data="start_audio_stream_test.lua [ws-url]"/>
--
-- Default ws-url: ws://127.0.0.1:9096

local function arg(i, default)
    if argv and argv[i] and tostring(argv[i]) ~= "" then return tostring(argv[i]) end
    return default
end

if not session then
    freeswitch.consoleLog("ERR", "start_audio_stream_test.lua: no session\n")
    return
end

local uuid = session:get_uuid()
local url = arg(1, "ws://127.0.0.1:9096")
local mix = "mono"
local rate = "16k"

-- Send metadata so the server knows this is a test connection (optional)
local meta = "{\"mode\":\"test\",\"play\":\"ivr/incoming.wav\"}"

local api = freeswitch.API()
local cmd = "uuid_audio_stream " .. uuid .. " start " .. url .. " " .. mix .. " " .. rate .. " " .. meta
freeswitch.consoleLog("INFO", "start_audio_stream_test.lua: " .. cmd .. "\n")
api:executeString(cmd)


