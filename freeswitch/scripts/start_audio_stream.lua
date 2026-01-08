-- Starts mod_audio_stream for the current session by invoking the API command internally.
--
-- Usage from dialplan:
--   <action application="lua" data="start_audio_stream.lua <ws-url> [mix-type] [rate] [metadata]"/>
--
-- Example:
--   lua start_audio_stream.lua ws://127.0.0.1:9094 mono 16k {"uuid":"..."}

local function arg(i, default)
    if argv and argv[i] and tostring(argv[i]) ~= "" then return tostring(argv[i]) end
    return default
end

if not session then
    freeswitch.consoleLog("ERR", "start_audio_stream.lua: no session\n")
    return
end

local uuid = session:get_uuid()
local url = arg(1, "")
local mix = arg(2, "mono")
local rate = arg(3, "16k")
local meta = arg(4, "")

if url == "" then
    freeswitch.consoleLog("ERR", "start_audio_stream.lua: missing ws url\n")
    return
end

local api = freeswitch.API()
local cmd = "uuid_audio_stream " .. uuid .. " start " .. url .. " " .. mix .. " " .. rate
if meta ~= "" then
    cmd = cmd .. " " .. meta
end

freeswitch.consoleLog("INFO", "start_audio_stream.lua: " .. cmd .. "\n")
api:executeString(cmd)


