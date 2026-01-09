-- Simple WAV playback test (no WebSocket).
--
-- Dialplan usage:
--   <action application="lua" data="play_test_wav.lua [sound]"/>
--
-- Example:
--   play_test_wav.lua ivr/incoming.wav
--
-- Notes:
-- - You should hear the WAV in the call if FreeSWITCH sound paths are correct.
-- - If the sound is missing, it will fall back to a simple tone.

local function argv_or(i, default)
    if argv and argv[i] and tostring(argv[i]) ~= "" then return tostring(argv[i]) end
    return default
end

if not session then
    freeswitch.consoleLog("ERR", "play_test_wav.lua: no session\n")
    return
end

local sound = argv_or(1, "ivr/incoming.wav")

session:answer()
session:sleep(300)

freeswitch.consoleLog("INFO", "play_test_wav.lua: playing " .. sound .. "\n")

-- Try to play a normal sound file from sounds_dir/sound_prefix.
local ok = session:streamFile(sound)

-- streamFile doesn't reliably return a boolean across FS builds, so we just check if session is still up.
if not session:ready() then
    return
end

-- Optional: play it twice for clarity.
session:sleep(150)
session:streamFile(sound)

-- If it still didn't play (e.g. file missing), play a tone so you at least hear *something*.
session:sleep(150)
session:streamFile("tone_stream://%(500,0,440)")


