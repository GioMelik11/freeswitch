-- Admin Panel helper: if an outgoing IVR is configured, run it before bridging.
-- Uses channel vars:
-- - adminpanel_outgoing_ivr (extension-level override)
-- - adminpanel_trunk_outgoing_ivr (trunk default)
--
-- If neither is set, this script is a no-op.

if not session or not session:ready() then return end

local ivr = session:getVariable('adminpanel_outgoing_ivr') or ''
if ivr == '' then
  ivr = session:getVariable('adminpanel_trunk_outgoing_ivr') or ''
end

if ivr == '' then return end

session:execute('answer')
session:execute('sleep', '250')
session:execute('ivr', ivr)


