-- Generated helper for Admin Panel queue timeout routing
-- Args: <destType> <destTarget>
local destType = argv[1] or ''
local destTarget = argv[2] or ''

if not session or not session:ready() then return end

-- mod_callcenter typically sets cc_cause on exit. We only route when it indicates a failure/timeout.
local cc = session:getVariable('cc_cause') or ''
cc = string.upper(cc)

local should_route = false
if cc == 'TIMEOUT' or cc == 'NO_AGENT_TIMEOUT' or cc == 'NO_AGENT' or cc == 'NO_AGENTS' or cc == 'ABANDONED' then
  should_route = true
end

if not should_route then return end

destType = string.lower(destType)
if destType == '' or destType == 'none' then return end

if destType == 'terminate' then
  session:hangup('NORMAL_CLEARING')
  return
end

if destType == 'extension' then
  session:execute('transfer', destTarget .. ' XML default')
  return
end

if destType == 'queue' then
  session:execute('callcenter', destTarget)
  return
end

if destType == 'ivr' then
  session:execute('ivr', destTarget)
  return
end

if destType == 'timecondition' then
  session:execute('transfer', destTarget .. ' XML default')
  return
end

-- Unknown destType: no-op
