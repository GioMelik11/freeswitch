package main

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/rtp"
)

type cfg struct {
	sipServerAddr   string
	sipDomain       string
	sipPass         string
	sipListenAddr   string
	sipContactHost  string
	sdpIP           string
	registerExpires int
	logLevel        string
	sipAiConfigPath string
}

func getenv(k, def string) string {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return def
	}
	return v
}

func mustParseInt(k string, def int) int {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Fatalf("invalid %s=%q: %v", k, v, err)
	}
	return n
}

func loadCfg() cfg {
	return cfg{
		// Legacy envs are removed from docker-compose; these are only used as last-resort defaults.
		sipServerAddr:   getenv("SIP_SERVER_ADDR", "auto:5060"),
		sipDomain:       getenv("SIP_DOMAIN", "auto"),
		sipPass:         getenv("SIP_PASS", "1234"),
		sipListenAddr:   getenv("SIP_LISTEN_ADDR", "0.0.0.0:5090"),
		sipContactHost:  getenv("SIP_CONTACT_HOST", "auto"),
		sdpIP:           getenv("SDP_IP", "auto"),
		registerExpires: mustParseInt("REGISTER_EXPIRES", 300),
		logLevel:        getenv("LOG_LEVEL", "info"),
		sipAiConfigPath: getenv("SIP_AI_CONFIG_PATH", "/data/sip-ai.json"),
	}
}

func detectLocalIPv4() string {
	// Best-effort: pick the primary local IPv4 by opening a UDP socket.
	// This works well in WSL2/host-network setups where 127.0.0.1 may not be the FreeSWITCH bind IP.
	c, err := net.Dial("udp4", "8.8.8.8:80")
	if err == nil {
		defer c.Close()
		if la, ok := c.LocalAddr().(*net.UDPAddr); ok && la.IP != nil && la.IP.To4() != nil {
			return la.IP.String()
		}
	}
	// Fallback
	return "127.0.0.1"
}

type sipAiDefaultsV2 struct {
	SipServerAddr   string `json:"sipServerAddr"`
	SipDomain       string `json:"sipDomain"`
	SipContactHost  string `json:"sipContactHost"`
	SDPIP           string `json:"sdpIP"`
	SipListenAddr   string `json:"sipListenAddr"`
	SipPass         string `json:"sipPass"`
	RegisterExpires int    `json:"registerExpires"`
}

type sipAiAgentV2 struct {
	ID              string `json:"id"`
	Source          string `json:"source"` // "pbx" | "external"
	Extension       string `json:"extension"`
	SipUser         string `json:"sipUser"`
	SipPass         string `json:"sipPass"`
	SipServerAddr   string `json:"sipServerAddr"`
	SipDomain       string `json:"sipDomain"`
	GeminiSocketURL string `json:"geminiSocketUrl"`
	Enabled         *bool  `json:"enabled"`
}

type sipAiConfigV2 struct {
	Defaults sipAiDefaultsV2 `json:"defaults"`
	Agents   []sipAiAgentV2  `json:"agents"`
	// legacy
	GeminiSocketURL string   `json:"geminiSocketUrl"`
	Extensions      []string `json:"extensions"`
}

func loadSipAiConfig(path string) sipAiConfigV2 {
	f, err := os.Open(path)
	if err != nil {
		return sipAiConfigV2{}
	}
	defer f.Close()
	dec := json.NewDecoder(io.LimitReader(f, 1<<20))
	dec.DisallowUnknownFields()
	var cfg sipAiConfigV2
	if err := dec.Decode(&cfg); err != nil {
		return sipAiConfigV2{}
	}
	return cfg
}

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func sortNumericStrings(a []string) {
	sort.Slice(a, func(i, j int) bool {
		ni, _ := strconv.Atoi(a[i])
		nj, _ := strconv.Atoi(a[j])
		return ni < nj
	})
}

func resolveAutoHost(v string, autoIP string) string {
	if strings.EqualFold(strings.TrimSpace(v), "auto") {
		return autoIP
	}
	return strings.TrimSpace(v)
}

func resolveAutoAddr(v string, autoIP string) string {
	s := strings.TrimSpace(v)
	if strings.HasPrefix(strings.ToLower(s), "auto:") {
		return autoIP + s[len("auto"):]
	}
	if strings.EqualFold(s, "auto") {
		return autoIP
	}
	return s
}

type sipMsg struct {
	startLine string
	method    string
	uri       string

	status int
	reason string

	// header names are normalized to lower-case
	hdr  map[string][]string
	body []byte
}

func parseSIP(b []byte) (sipMsg, error) {
	// SIP uses CRLF, but tolerate LF.
	s := string(b)
	parts := strings.SplitN(s, "\r\n\r\n", 2)
	if len(parts) == 1 {
		parts = strings.SplitN(s, "\n\n", 2)
	}

	head := parts[0]
	var body string
	if len(parts) == 2 {
		body = parts[1]
	}

	lines := strings.Split(head, "\n")
	if len(lines) == 0 {
		return sipMsg{}, errors.New("empty message")
	}

	sl := strings.TrimRight(lines[0], "\r")
	m := sipMsg{startLine: sl, hdr: map[string][]string{}}

	if strings.HasPrefix(sl, "SIP/2.0 ") {
		// response
		fields := strings.Fields(sl)
		if len(fields) < 3 {
			return sipMsg{}, fmt.Errorf("bad status line: %q", sl)
		}
		code, err := strconv.Atoi(fields[1])
		if err != nil {
			return sipMsg{}, fmt.Errorf("bad status code: %q", sl)
		}
		m.status = code
		m.reason = strings.Join(fields[2:], " ")
	} else {
		// request
		fields := strings.Fields(sl)
		if len(fields) < 3 {
			return sipMsg{}, fmt.Errorf("bad request line: %q", sl)
		}
		m.method = fields[0]
		m.uri = fields[1]
	}

	for _, ln := range lines[1:] {
		ln = strings.TrimRight(ln, "\r")
		if strings.TrimSpace(ln) == "" {
			continue
		}
		kv := strings.SplitN(ln, ":", 2)
		if len(kv) != 2 {
			continue
		}
		k := strings.ToLower(strings.TrimSpace(kv[0]))
		v := strings.TrimSpace(kv[1])
		m.hdr[k] = append(m.hdr[k], v)
	}

	// Respect Content-Length if present.
	if cls := m.header("content-length"); cls != "" {
		if n, err := strconv.Atoi(strings.TrimSpace(cls)); err == nil {
			if n <= len(body) {
				body = body[:n]
			}
		}
	}
	m.body = []byte(body)

	return m, nil
}

func (m sipMsg) header(name string) string {
	vals := m.hdr[strings.ToLower(name)]
	if len(vals) == 0 {
		return ""
	}
	return vals[0]
}

func (m sipMsg) headers(name string) []string {
	return m.hdr[strings.ToLower(name)]
}

func randHex(n int) string {
	const hexdigits = "0123456789abcdef"
	b := make([]byte, n)
	for i := range b {
		b[i] = hexdigits[rand.Intn(len(hexdigits))]
	}
	return string(b)
}

func md5hex(s string) string {
	h := md5.Sum([]byte(s))
	return hex.EncodeToString(h[:])
}

type digestChallenge struct {
	realm     string
	nonce     string
	opaque    string
	algorithm string
	qop       string
}

func parseDigestChallenge(hdr string) (digestChallenge, error) {
	// Example: Digest realm="172.20.0.1", nonce="...", algorithm=MD5, qop="auth"
	hdr = strings.TrimSpace(hdr)
	if !strings.HasPrefix(strings.ToLower(hdr), "digest") {
		return digestChallenge{}, fmt.Errorf("unsupported challenge: %q", hdr)
	}
	rest := strings.TrimSpace(hdr[len("Digest"):])
	parts := strings.Split(rest, ",")
	ch := digestChallenge{algorithm: "MD5", qop: "auth"}
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		kv := strings.SplitN(p, "=", 2)
		if len(kv) != 2 {
			continue
		}
		k := strings.ToLower(strings.TrimSpace(kv[0]))
		v := strings.Trim(strings.TrimSpace(kv[1]), `"'`)
		switch k {
		case "realm":
			ch.realm = v
		case "nonce":
			ch.nonce = v
		case "opaque":
			ch.opaque = v
		case "algorithm":
			ch.algorithm = v
		case "qop":
			// FreeSWITCH sends "auth" typically
			ch.qop = v
		}
	}
	if ch.realm == "" || ch.nonce == "" {
		return digestChallenge{}, fmt.Errorf("missing realm/nonce in %q", hdr)
	}
	return ch, nil
}

func buildAuthorization(method, uri, username, password string, ch digestChallenge, nc int) string {
	cnonce := randHex(16)
	ncStr := fmt.Sprintf("%08x", nc)

	ha1 := md5hex(fmt.Sprintf("%s:%s:%s", username, ch.realm, password))
	ha2 := md5hex(fmt.Sprintf("%s:%s", method, uri))
	resp := md5hex(fmt.Sprintf("%s:%s:%s:%s:%s:%s", ha1, ch.nonce, ncStr, cnonce, ch.qop, ha2))

	var b strings.Builder
	b.WriteString(`Digest `)
	b.WriteString(fmt.Sprintf(`username="%s", `, username))
	b.WriteString(fmt.Sprintf(`realm="%s", `, ch.realm))
	b.WriteString(fmt.Sprintf(`nonce="%s", `, ch.nonce))
	b.WriteString(fmt.Sprintf(`uri="%s", `, uri))
	b.WriteString(fmt.Sprintf(`response="%s", `, resp))
	b.WriteString(fmt.Sprintf(`algorithm=%s, `, ch.algorithm))
	b.WriteString(fmt.Sprintf(`cnonce="%s", `, cnonce))
	b.WriteString(fmt.Sprintf(`nc=%s, `, ncStr))
	b.WriteString(fmt.Sprintf(`qop=%s`, ch.qop))
	if ch.opaque != "" {
		b.WriteString(fmt.Sprintf(`, opaque="%s"`, ch.opaque))
	}
	return b.String()
}

type regWorker struct {
	id     string
	stopCh chan struct{}
	doneCh chan struct{}
}

type runtimeState struct {
	mu sync.RWMutex

	// which extensions are currently enabled for SIP AI
	enabledExt map[string]bool
	// if set, calls are considered "AI mode" (Gemini integration later)
	// NOTE: now per-agent; kept for old behavior but not used
	geminiSocketURL string
	sipContactHost  string
	sdpIP           string

	// registration workers by extension id
	workers map[string]*regWorker

	// active calls by Call-ID
	calls map[string]*callSession

	// per SIP user routing
	agentByUser map[string]agentRuntime
}

type agentRuntime struct {
	user            string
	enabled         bool
	geminiSocketURL string
	source          string
	// registration target
	sipServerAddr   string
	sipDomain       string
	sipPass         string
	registerExpires int
	// shared defaults (global)
}

type regTarget struct {
	username        string
	password        string
	serverAddr      string
	domain          string
	contactHost     string
	sipListenAddr   string
	registerExpires int
}

type callSession struct {
	callID string
	extID  string
	rtp    net.PacketConn
	stopCh chan struct{}
	echo   bool
}

func main() {
	rand.Seed(time.Now().UnixNano())
	c := loadCfg()

	logger := log.New(os.Stdout, "sip-rtp-go: ", log.LstdFlags|log.Lmicroseconds)
	logger.Printf("starting (sip=%s, sipAiConfig=%s)", c.sipListenAddr, c.sipAiConfigPath)

	// SIP UDP socket for incoming calls (UAS)
	sipSrvConn, err := net.ListenPacket("udp", c.sipListenAddr)
	if err != nil {
		logger.Fatalf("listen sip %s: %v", c.sipListenAddr, err)
	}
	defer sipSrvConn.Close()

	st := &runtimeState{
		enabledExt:  map[string]bool{},
		workers:     map[string]*regWorker{},
		calls:       map[string]*callSession{},
		agentByUser: map[string]agentRuntime{},
	}

	// Watch SIP AI config file and keep registrations in sync.
	go watchSipAiConfig(logger, c, st)

	buf := make([]byte, 64*1024)
	for {
		n, addr, err := sipSrvConn.ReadFrom(buf)
		if err != nil {
			logger.Fatalf("sip read: %v", err)
		}
		pkt := append([]byte(nil), buf[:n]...)
		go handleSIPPacket(logger, sipSrvConn, addr, pkt, c, st)
	}
}

func doRegister(logger *log.Logger, conn net.PacketConn, target regTarget) error {
	serverAddr, err := net.ResolveUDPAddr("udp", target.serverAddr)
	if err != nil {
		return err
	}

	_, sipListenPort, err := net.SplitHostPort(target.sipListenAddr)
	if err != nil {
		return fmt.Errorf("bad sipListenAddr %q: %w", target.sipListenAddr, err)
	}
	contactURI := fmt.Sprintf("sip:%s@%s;transport=udp", target.username, net.JoinHostPort(target.contactHost, sipListenPort))
	reqURI := fmt.Sprintf("sip:%s", target.domain)

	fromTag := randHex(10)
	callID := fmt.Sprintf("%s@%s", randHex(16), target.contactHost)

	send := func(cseq int, auth string) error {
		la, _ := conn.LocalAddr().(*net.UDPAddr)
		regHost := target.contactHost
		regPort := "0"
		if la != nil && la.Port > 0 {
			// Keep host stable (Contact host) and only use the local port for Via.
			// Avoid IPv6 '::' showing up here in dual-stack environments.
			regPort = strconv.Itoa(la.Port)
		}
		branch := "z9hG4bK" + randHex(12)
		var b strings.Builder
		b.WriteString(fmt.Sprintf("REGISTER %s SIP/2.0\r\n", reqURI))
		b.WriteString(fmt.Sprintf("Via: SIP/2.0/UDP %s:%s;branch=%s;rport\r\n", regHost, regPort, branch))
		b.WriteString("Max-Forwards: 70\r\n")
		b.WriteString(fmt.Sprintf("From: <sip:%s@%s>;tag=%s\r\n", target.username, target.domain, fromTag))
		b.WriteString(fmt.Sprintf("To: <sip:%s@%s>\r\n", target.username, target.domain))
		b.WriteString(fmt.Sprintf("Call-ID: %s\r\n", callID))
		b.WriteString(fmt.Sprintf("CSeq: %d REGISTER\r\n", cseq))
		b.WriteString(fmt.Sprintf("Contact: <%s>\r\n", contactURI))
		b.WriteString(fmt.Sprintf("Expires: %d\r\n", target.registerExpires))
		b.WriteString("User-Agent: sip-rtp-go\r\n")
		if auth != "" {
			b.WriteString(fmt.Sprintf("Authorization: %s\r\n", auth))
		}
		b.WriteString("Content-Length: 0\r\n\r\n")
		_, err := conn.WriteTo([]byte(b.String()), serverAddr)
		return err
	}

	// 1) Send initial REGISTER, expect 401.
	if err := send(1, ""); err != nil {
		return err
	}
	resp, err := waitSIPResponse(conn, 3*time.Second, "REGISTER")
	if err != nil {
		return err
	}
	if resp.status != 401 && resp.status != 407 && resp.status != 200 {
		return fmt.Errorf("unexpected register response: %d %s", resp.status, resp.reason)
	}
	if resp.status == 200 {
		logger.Printf("registered (no auth challenge)")
		return nil
	}

	chStr := resp.header("www-authenticate")
	if chStr == "" {
		chStr = resp.header("proxy-authenticate")
	}
	if chStr == "" {
		return errors.New("missing authenticate header in 401/407")
	}
	ch, err := parseDigestChallenge(chStr)
	if err != nil {
		return err
	}
	auth := buildAuthorization("REGISTER", reqURI, target.username, target.password, ch, 1)

	// 2) Send authenticated REGISTER
	if err := send(2, auth); err != nil {
		return err
	}
	resp2, err := waitSIPResponse(conn, 3*time.Second, "REGISTER")
	if err != nil {
		return err
	}
	if resp2.status != 200 {
		return fmt.Errorf("register failed: %d %s", resp2.status, resp2.reason)
	}
	logger.Printf("registered as %s (expires=%ds)", target.username, target.registerExpires)
	return nil
}

func waitSIPResponse(conn net.PacketConn, timeout time.Duration, forMethod string) (sipMsg, error) {
	_ = conn.SetReadDeadline(time.Now().Add(timeout))
	defer conn.SetReadDeadline(time.Time{})
	buf := make([]byte, 64*1024)
	for {
		n, _, err := conn.ReadFrom(buf)
		if err != nil {
			return sipMsg{}, err
		}
		m, err := parseSIP(buf[:n])
		if err != nil {
			continue
		}
		if m.status == 0 {
			// request; ignore while waiting for response
			continue
		}
		// Best-effort filter: CSeq method matches.
		if cseq := m.header("cseq"); cseq != "" {
			if strings.Contains(strings.ToUpper(cseq), strings.ToUpper(forMethod)) {
				return m, nil
			}
		}
		return m, nil
	}
}

func watchSipAiConfig(logger *log.Logger, c cfg, st *runtimeState) {
	apply := func(file sipAiConfigV2) {
		autoIP := detectLocalIPv4()

		// Defaults from config (fall back to legacy env defaults from cfg)
		def := file.Defaults
		serverAddr := resolveAutoAddr(firstNonEmpty(def.SipServerAddr, c.sipServerAddr), autoIP)
		domain := resolveAutoHost(firstNonEmpty(def.SipDomain, c.sipDomain), autoIP)
		contactHost := resolveAutoHost(firstNonEmpty(def.SipContactHost, c.sipContactHost), autoIP)
		sdpIP := resolveAutoHost(firstNonEmpty(def.SDPIP, c.sdpIP), autoIP)
		registerExpires := def.RegisterExpires
		if registerExpires < 0 {
			registerExpires = c.registerExpires
		}
		if registerExpires == 0 {
			// Treat 0 as "no limit" (very large Expires). Still refresh periodically.
			registerExpires = 31536000
		}
		if registerExpires < 0 {
			registerExpires = 300
		}
		defaultPass := def.SipPass
		if strings.TrimSpace(defaultPass) == "" {
			defaultPass = c.sipPass
		}
		if strings.TrimSpace(defaultPass) == "" {
			defaultPass = "1234"
		}

		// Build agents list (v2). If none configured -> do nothing (no fallback).
		agents := make([]sipAiAgentV2, 0, len(file.Agents))
		agents = append(agents, file.Agents...)

		agentByUser := map[string]agentRuntime{}
		for _, a := range agents {
			enabled := true
			if a.Enabled != nil && *a.Enabled == false {
				enabled = false
			}
			if !enabled {
				continue
			}

			src := strings.ToLower(strings.TrimSpace(a.Source))
			if src == "external" {
				user := strings.TrimSpace(a.SipUser)
				pass := strings.TrimSpace(a.SipPass)
				srv := strings.TrimSpace(a.SipServerAddr)
				dom := strings.TrimSpace(a.SipDomain)
				if !isDigits(user) && user == "" {
					continue
				}
				if user == "" || pass == "" || srv == "" || dom == "" {
					continue
				}
				agentByUser[user] = agentRuntime{
					user:            user,
					enabled:         true,
					source:          "external",
					geminiSocketURL: strings.TrimSpace(a.GeminiSocketURL),
					sipServerAddr:   resolveAutoAddr(srv, autoIP),
					sipDomain:       resolveAutoHost(dom, autoIP),
					sipPass:         pass,
					registerExpires: registerExpires,
				}
				continue
			}

			// pbx
			ext := strings.TrimSpace(a.Extension)
			if !isDigits(ext) {
				continue
			}
			pass := strings.TrimSpace(a.SipPass)
			if pass == "" {
				pass = defaultPass
			}
			agentByUser[ext] = agentRuntime{
				user:            ext,
				enabled:         true,
				source:          "pbx",
				geminiSocketURL: strings.TrimSpace(a.GeminiSocketURL),
				sipServerAddr:   serverAddr,
				sipDomain:       domain,
				sipPass:         pass,
				registerExpires: registerExpires,
			}
		}

		st.mu.Lock()
		// stop all existing workers (simpler and safe)
		for _, w := range st.workers {
			close(w.stopCh)
		}
		st.workers = map[string]*regWorker{}
		st.agentByUser = agentByUser
		st.sipContactHost = contactHost
		st.sdpIP = sdpIP
		st.mu.Unlock()

		if len(agentByUser) == 0 {
			logger.Printf("sip-ai: no agents configured; not registering anything")
			return
		}

		// start workers
		for user, a := range agentByUser {
			w := &regWorker{id: user, stopCh: make(chan struct{}), doneCh: make(chan struct{})}
			st.mu.Lock()
			st.workers[user] = w
			st.mu.Unlock()

			target := regTarget{
				username:        a.user,
				password:        a.sipPass,
				serverAddr:      a.sipServerAddr,
				domain:          a.sipDomain,
				contactHost:     contactHost,
				sipListenAddr:   c.sipListenAddr,
				registerExpires: a.registerExpires,
			}

			go func(user string, w *regWorker, t regTarget) {
				defer close(w.doneCh)
				regConn, err := net.ListenPacket("udp4", "0.0.0.0:0")
				if err != nil {
					logger.Printf("register[%s] listen error: %v", user, err)
					return
				}
				defer regConn.Close()

				for {
					select {
					case <-w.stopCh:
						return
					default:
					}

					if err := doRegister(logger, regConn, t); err != nil {
						logger.Printf("register[%s] error: %v", user, err)
					}
					sleepSec := max(10, t.registerExpires/2)
					// If using "no limit" Expires (we set it to a very large value),
					// still refresh frequently so registrations recover quickly after FS restarts.
					if t.registerExpires >= 31536000 {
						sleepSec = 60
					}
					sleep := time.Duration(sleepSec) * time.Second
					select {
					case <-w.stopCh:
						return
					case <-time.After(sleep):
					}
				}
			}(user, w, target)
		}
	}

	// initial apply
	for {
		file := loadSipAiConfig(c.sipAiConfigPath)
		apply(file)
		logger.Printf("sip-ai config loaded")
		break
	}

	t := time.NewTicker(2 * time.Second)
	defer t.Stop()
	var last string
	for range t.C {
		raw, _ := os.ReadFile(c.sipAiConfigPath)
		cur := string(raw)
		if cur == last {
			continue
		}
		last = cur
		file := loadSipAiConfig(c.sipAiConfigPath)
		apply(file)
		logger.Printf("sip-ai config updated")
	}
}

func firstNonEmpty(a, b string) string {
	if strings.TrimSpace(a) != "" {
		return strings.TrimSpace(a)
	}
	return strings.TrimSpace(b)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func handleSIPPacket(logger *log.Logger, conn net.PacketConn, addr net.Addr, pkt []byte, c cfg, st *runtimeState) {
	m, err := parseSIP(pkt)
	if err != nil {
		return
	}
	if m.method == "" {
		return
	}

	switch strings.ToUpper(m.method) {
	case "INVITE":
		handleInvite(logger, conn, addr, m, c, st)
	case "ACK":
		// no-op
	case "CANCEL":
		sendSIPResponse(conn, addr, m, "", "", 200, "OK", nil, nil)
		endCall(logger, m.header("call-id"), st)
	case "BYE":
		sendSIPResponse(conn, addr, m, "", "", 200, "OK", nil, nil)
		endCall(logger, m.header("call-id"), st)
	case "OPTIONS":
		sendSIPResponse(conn, addr, m, "", "", 200, "OK", map[string][]string{
			"Allow": {"INVITE, ACK, BYE, CANCEL, OPTIONS"},
		}, nil)
	default:
		sendSIPResponse(conn, addr, m, "", "", 501, "Not Implemented", nil, nil)
	}
}

func endCall(logger *log.Logger, callID string, st *runtimeState) {
	if callID == "" {
		return
	}
	st.mu.Lock()
	cs := st.calls[callID]
	if cs != nil {
		delete(st.calls, callID)
	}
	st.mu.Unlock()
	if cs == nil {
		return
	}
	close(cs.stopCh)
	_ = cs.rtp.Close()
	logger.Printf("call ended (call-id=%s ext=%s)", cs.callID, cs.extID)
}

func parseToUser(req sipMsg) string {
	to := req.header("to")
	l := strings.ToLower(to)
	i := strings.Index(l, "sip:")
	if i < 0 {
		return ""
	}
	rest := to[i+4:]
	// user ends at @ or ; or >
	end := len(rest)
	for j, r := range rest {
		if r == '@' || r == ';' || r == '>' {
			end = j
			break
		}
	}
	user := strings.TrimSpace(rest[:end])
	if !isDigits(user) {
		return ""
	}
	return user
}

func handleInvite(logger *log.Logger, conn net.PacketConn, addr net.Addr, req sipMsg, c cfg, st *runtimeState) {
	extID := parseToUser(req)
	if extID == "" {
		sendSIPResponse(conn, addr, req, "", "", 400, "Bad Request", nil, nil)
		return
	}

	st.mu.RLock()
	agent, ok := st.agentByUser[extID]
	contactHost := st.sipContactHost
	sdpIP := st.sdpIP
	_, inCall := st.calls[req.header("call-id")]
	st.mu.RUnlock()

	if !ok || !agent.enabled {
		sendSIPResponse(conn, addr, req, "", "", 404, "Not Found", nil, nil)
		return
	}
	if inCall {
		sendSIPResponse(conn, addr, req, "", "", 486, "Busy Here", nil, nil)
		return
	}

	callID := req.header("call-id")
	if callID == "" {
		sendSIPResponse(conn, addr, req, "", "", 400, "Bad Request", nil, nil)
		return
	}

	// allocate per-call RTP socket
	rtpConn, err := net.ListenPacket("udp", "0.0.0.0:0")
	if err != nil {
		sendSIPResponse(conn, addr, req, "", "", 500, "Server Error", nil, nil)
		return
	}
	ua, _ := rtpConn.LocalAddr().(*net.UDPAddr)
	rtpPort := 0
	if ua != nil {
		rtpPort = ua.Port
	}

	toWithTag := ensureToHasTag(req.header("to"))
	sendSIPResponse(conn, addr, req, toWithTag, "", 100, "Trying", nil, nil)
	sendSIPResponse(conn, addr, req, toWithTag, "", 180, "Ringing", nil, nil)

	if strings.TrimSpace(sdpIP) == "" {
		sdpIP = detectLocalIPv4()
	}
	if strings.TrimSpace(contactHost) == "" {
		contactHost = detectLocalIPv4()
	}
	sdp := buildSDP(sdpIP, rtpPort)
	_, sipListenPort, _ := net.SplitHostPort(c.sipListenAddr)
	contact := ""
	if sipListenPort != "" {
		contact = fmt.Sprintf("<sip:%s@%s:%s;transport=udp>", extID, contactHost, sipListenPort)
	}
	extra := map[string][]string{
		"Content-Type": {"application/sdp"},
		"Allow":        {"INVITE, ACK, BYE, CANCEL, OPTIONS"},
		"Supported":    {"replaces, timer"},
	}
	sendSIPResponse(conn, addr, req, toWithTag, contact, 200, "OK", extra, []byte(sdp))

	// Echo ONLY when this agent's Gemini socket URL is not set.
	echo := strings.TrimSpace(agent.geminiSocketURL) == ""
	cs := &callSession{callID: callID, extID: extID, rtp: rtpConn, stopCh: make(chan struct{}), echo: echo}
	st.mu.Lock()
	st.calls[callID] = cs
	st.mu.Unlock()

	if echo {
		go runRTPEchoCall(logger, cs)
		logger.Printf("call answered (ext=%s mode=echo rtp=%s:%d)", extID, sdpIP, rtpPort)
	} else {
		wsURL := strings.TrimSpace(agent.geminiSocketURL)
		go runRTPWsStreamCall(logger, cs, wsURL)
		logger.Printf("call answered (ext=%s mode=ai-ws rtp=%s:%d ws=%s)", extID, sdpIP, rtpPort, wsURL)
	}
}

func buildSDP(ip string, port int) string {
	// Keep it very small: PCMU/PCMA + DTMF
	return strings.Join([]string{
		"v=0",
		"o=- 0 0 IN IP4 " + ip,
		"s=sip-rtp-go",
		"c=IN IP4 " + ip,
		"t=0 0",
		fmt.Sprintf("m=audio %d RTP/AVP 0 8 101", port),
		"a=rtpmap:0 PCMU/8000",
		"a=rtpmap:8 PCMA/8000",
		"a=rtpmap:101 telephone-event/8000",
		"a=fmtp:101 0-16",
		"a=ptime:20",
		"a=sendrecv",
		"",
	}, "\r\n")
}

func ensureToHasTag(to string) string {
	// If To already has tag=, keep it. Otherwise append.
	if strings.Contains(strings.ToLower(to), ";tag=") {
		return to
	}
	return to + ";tag=" + randHex(10)
}

func sendSIPResponse(conn net.PacketConn, addr net.Addr, req sipMsg, toOverride string, contactOverride string, status int, reason string, extra map[string][]string, body []byte) {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("SIP/2.0 %d %s\r\n", status, reason))

	// Required: mirror all Via headers
	for _, v := range req.headers("via") {
		b.WriteString("Via: " + v + "\r\n")
	}

	// Mirror From / Call-ID / CSeq
	if from := req.header("from"); from != "" {
		b.WriteString("From: " + from + "\r\n")
	}
	to := req.header("to")
	if toOverride != "" {
		b.WriteString("To: " + toOverride + "\r\n")
	} else if to != "" {
		// Most in-dialog requests already contain a To-tag, so this stays stable.
		b.WriteString("To: " + ensureToHasTag(to) + "\r\n")
	}
	if callid := req.header("call-id"); callid != "" {
		b.WriteString("Call-ID: " + callid + "\r\n")
	}
	if cseq := req.header("cseq"); cseq != "" {
		b.WriteString("CSeq: " + cseq + "\r\n")
	}

	// Correct Contact is important so in-dialog requests (BYE) reach us.
	if status >= 200 && status < 300 && strings.ToUpper(req.method) == "INVITE" && contactOverride != "" {
		b.WriteString("Contact: " + contactOverride + "\r\n")
	}

	for k, vals := range extra {
		for _, v := range vals {
			b.WriteString(k + ": " + v + "\r\n")
		}
	}

	if body == nil {
		body = []byte{}
	}
	b.WriteString(fmt.Sprintf("Content-Length: %d\r\n", len(body)))
	b.WriteString("\r\n")
	if len(body) > 0 {
		b.Write(body)
	}
	_, _ = conn.WriteTo([]byte(b.String()), addr)
}

func runRTPEchoCall(logger *log.Logger, cs *callSession) {
	// rewrite SSRC to avoid collisions
	ssrc := rand.Uint32()
	buf := make([]byte, 2048)
	var p rtp.Packet

	var (
		mu       sync.Mutex
		lastAddr string
		rx       uint64
		tx       uint64
		lastPT   uint8
	)

	t := time.NewTicker(1 * time.Second)
	defer t.Stop()

	go func() {
		for range t.C {
			mu.Lock()
			a := lastAddr
			rxi := rx
			txi := tx
			pt := lastPT
			rx = 0
			tx = 0
			mu.Unlock()
			if a != "" && (rxi > 0 || txi > 0) {
				logger.Printf("rtp echo: ext=%s addr=%s pt=%d rx=%dpps tx=%dpps", cs.extID, a, pt, rxi, txi)
			}
		}
	}()

	for {
		_ = cs.rtp.SetReadDeadline(time.Now().Add(250 * time.Millisecond))
		n, addr, err := cs.rtp.ReadFrom(buf)
		select {
		case <-cs.stopCh:
			return
		default:
		}
		if err != nil {
			if ne, ok := err.(net.Error); ok && ne.Timeout() {
				continue
			}
			return
		}
		if err := p.Unmarshal(buf[:n]); err != nil {
			continue
		}
		mu.Lock()
		lastAddr = addr.String()
		lastPT = p.PayloadType
		rx++
		mu.Unlock()

		out := rtp.Packet{
			Header: rtp.Header{
				Version:        2,
				Padding:        false,
				Extension:      false,
				Marker:         p.Marker,
				PayloadType:    p.PayloadType,
				SequenceNumber: p.SequenceNumber,
				Timestamp:      p.Timestamp,
				SSRC:           ssrc,
			},
			Payload: append([]byte(nil), p.Payload...),
		}
		raw, err := out.Marshal()
		if err != nil {
			continue
		}
		_, _ = cs.rtp.WriteTo(raw, addr)
		mu.Lock()
		tx++
		mu.Unlock()
	}
}

func runRTPWsStreamCall(logger *log.Logger, cs *callSession, wsURL string) {
	// AI mode: stream caller audio to a mod_audio_stream-compatible WebSocket server (e.g. whizio on :9094).
	// Upstream: RTP -> PCM16@16k -> WS binary frames
	// Downstream: WS streamAudio (wav/8k) -> PCM16 -> PCMU RTP (pt=0) -> caller
	wsURL = strings.TrimSpace(wsURL)
	if wsURL == "" {
		runRTPDrainCall(logger, cs)
		return
	}
	if !strings.HasPrefix(strings.ToLower(wsURL), "ws://") && !strings.HasPrefix(strings.ToLower(wsURL), "wss://") {
		logger.Printf("ws stream: invalid url %q (expected ws:// or wss://); draining", wsURL)
		runRTPDrainCall(logger, cs)
		return
	}
	u, err := url.Parse(wsURL)
	if err != nil {
		logger.Printf("ws stream: bad url %q: %v; draining", wsURL, err)
		runRTPDrainCall(logger, cs)
		return
	}

	ws, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		logger.Printf("ws stream: dial failed url=%q: %v; draining", wsURL, err)
		runRTPDrainCall(logger, cs)
		return
	}
	defer ws.Close()
	logger.Printf("ws stream: connected url=%q (ext=%s call-id=%s)", wsURL, cs.extID, cs.callID)

	// Single playback worker: stable SSRC/seq/ts and one RTP sender.
	playQ := make(chan []int16, 32)
	playSSRC := rand.Uint32()
	playSeq := uint16(rand.Uint32())
	playTS := uint32(rand.Uint32())

	// optional metadata (whizio logs it if JSON)
	meta := map[string]any{
		"source":     "sip-rtp-go",
		"callId":     cs.callID,
		"extension":  cs.extID,
		"mimeType":   "audio/pcm;rate=16000",
		"sampleRate": 16000,
	}
	if b, err := json.Marshal(meta); err == nil {
		_ = ws.WriteMessage(websocket.TextMessage, b)
	}

	var (
		mu       sync.Mutex
		lastAddr net.Addr
		rx       uint64
	)

	// Playback worker (continuous 20ms pacing; sends silence when queue is empty).
	go func() {
		t := time.NewTicker(20 * time.Millisecond)
		defer t.Stop()

		var (
			buf         []int16
			markerFirst = true
		)

		for {
			select {
			case <-cs.stopCh:
				return
			case pcm := <-playQ:
				// nil pcm means "clear buffer immediately" (used when switching from hold->AI).
				if pcm == nil {
					buf = nil
					markerFirst = true
					continue
				}
				if len(pcm) == 0 {
					continue
				}
				// Cap buffer to avoid runaway latency (keep last ~2 seconds max).
				const maxSamples = 8000 * 2
				if len(buf)+len(pcm) > maxSamples {
					// drop existing buffer; keep newest chunk
					buf = buf[:0]
				}
				buf = append(buf, pcm...)
			case <-t.C:
				// Need RTP remote addr (learned from inbound RTP); if not yet, skip sending.
				mu.Lock()
				addr := lastAddr
				mu.Unlock()
				if addr == nil {
					continue
				}

				// Build one 20ms PCMU frame (160 samples)
				const frameSamples = 160
				payload := make([]byte, frameSamples)
				if len(buf) >= frameSamples {
					for i := 0; i < frameSamples; i++ {
						payload[i] = linearToMuLaw(buf[i])
					}
					buf = buf[frameSamples:]
				} else {
					// μ-law silence
					for i := 0; i < frameSamples; i++ {
						payload[i] = 0xFF
					}
				}

				p := rtp.Packet{
					Header: rtp.Header{
						Version:        2,
						Marker:         markerFirst,
						PayloadType:    0, // PCMU
						SequenceNumber: playSeq,
						Timestamp:      playTS,
						SSRC:           playSSRC,
					},
					Payload: payload,
				}
				markerFirst = false
				raw, err := p.Marshal()
				if err == nil {
					_, _ = cs.rtp.WriteTo(raw, addr)
				}
				playSeq++
				playTS += frameSamples
			}
		}
	}()

	// Beep immediately so we can confirm downlink audio even before Gemini speaks.
	select {
	case playQ <- genBeepPcm8k(440, 180):
	default:
	}

	// consume server messages and play audio back to caller
	go func() {
		aiLogged := false
		aiBegan := false
		for {
			select {
			case <-cs.stopCh:
				return
			default:
			}
			mt, msg, err := ws.ReadMessage()
			if err != nil {
				return
			}
			if mt != websocket.TextMessage {
				continue
			}

			var m wsStreamMsg
			if err := json.Unmarshal(msg, &m); err != nil {
				continue
			}
			if m.Type != "streamAudio" {
				continue
			}
			typ := strings.ToLower(strings.TrimSpace(m.Data.AudioDataType))
			var pcm8k []int16
			switch typ {
			case "wav":
				wavBytes, err := base64.StdEncoding.DecodeString(m.Data.AudioData)
				if err != nil {
					continue
				}
				pcm, rate, err := wavToPCM16Mono(wavBytes)
				if err != nil {
					continue
				}
				if m.Data.SampleRate > 0 {
					rate = m.Data.SampleRate
				}
				if rate != 8000 {
					continue
				}
				pcm8k = pcm
			case "pcm16le":
				raw, err := base64.StdEncoding.DecodeString(m.Data.AudioData)
				if err != nil || len(raw) < 2 {
					continue
				}
				rate := m.Data.SampleRate
				if rate <= 0 {
					rate = 24000
				}
				in := make([]int16, len(raw)/2)
				for i := 0; i < len(in); i++ {
					in[i] = int16(binary.LittleEndian.Uint16(raw[i*2 : i*2+2]))
				}
				pcm8k = downsampleTo8k(in, rate)
				if len(pcm8k) == 0 {
					continue
				}
			default:
				continue
			}

			// If this looks like Gemini (24k/16k), flush hold queue so AI starts immediately.
			if !aiBegan && (m.Data.SampleRate >= 16000) {
				aiBegan = true
				// Clear playback buffer in the worker.
				select {
				case playQ <- nil:
				default:
				}
			}

			// log once so we can confirm we are actually receiving AI audio
			if !aiLogged {
				aiLogged = true
				// rough RMS to catch "all zeros" problems
				samples := len(pcm8k)
				n := samples
				if n > 800 {
					n = 800
				}
				var sumSq float64
				for i := 0; i < n; i++ {
					v := float64(pcm8k[i])
					sumSq += v * v
				}
				rms := 0.0
				if n > 0 {
					rms = (sumSq / float64(n))
				}
				logger.Printf("ws stream: ai audio in type=%s rate=%d samples8k=%d rms≈%.0f", typ, m.Data.SampleRate, len(pcm8k), rms)
			}

			// wait for RTP remote addr (learned from inbound RTP)
			var addr net.Addr
			deadline := time.Now().Add(3 * time.Second)
			for time.Now().Before(deadline) {
				mu.Lock()
				addr = lastAddr
				mu.Unlock()
				if addr != nil {
					break
				}
				select {
				case <-cs.stopCh:
					return
				case <-time.After(10 * time.Millisecond):
				}
			}
			if addr == nil {
				continue
			}

			// enqueue for single playback worker
			select {
			case playQ <- pcm8k:
			default:
			}
		}
	}()

	buf := make([]byte, 2048)
	var p rtp.Packet

	for {
		_ = cs.rtp.SetReadDeadline(time.Now().Add(250 * time.Millisecond))
		n, addr, err := cs.rtp.ReadFrom(buf)
		select {
		case <-cs.stopCh:
			return
		default:
		}
		if err != nil {
			if ne, ok := err.(net.Error); ok && ne.Timeout() {
				continue
			}
			return
		}
		if err := p.Unmarshal(buf[:n]); err != nil {
			continue
		}
		mu.Lock()
		lastAddr = addr
		rx++
		mu.Unlock()
		pt := p.PayloadType
		payload := p.Payload
		if len(payload) == 0 {
			continue
		}

		// Decode RTP payload to PCM16 @ 8k.
		var pcm8k []int16
		switch pt {
		case 0: // PCMU
			pcm8k = make([]int16, len(payload))
			for i, b := range payload {
				pcm8k[i] = muLawToLinear(b)
			}
		case 8: // PCMA
			pcm8k = make([]int16, len(payload))
			for i, b := range payload {
				pcm8k[i] = aLawToLinear(b)
			}
		default:
			// Unsupported codec; ignore.
			continue
		}

		// Upsample 8k -> 16k by simple duplication (good enough for voice).
		pcm16k := make([]int16, len(pcm8k)*2)
		for i, s := range pcm8k {
			j := i * 2
			pcm16k[j] = s
			pcm16k[j+1] = s
		}

		// Convert to little-endian bytes.
		out := make([]byte, len(pcm16k)*2)
		for i, s := range pcm16k {
			off := i * 2
			out[off] = byte(s)
			out[off+1] = byte(uint16(s) >> 8)
		}

		if err := ws.WriteMessage(websocket.BinaryMessage, out); err != nil {
			return
		}
		if rx == 1 {
			logger.Printf("ws stream: first pcm frame bytes=%d pt=%d", len(out), pt)
		}
	}
}

type wsStreamMsg struct {
	Type string `json:"type"`
	Data struct {
		AudioDataType string `json:"audioDataType"`
		SampleRate    int    `json:"sampleRate"`
		AudioData     string `json:"audioData"`
	} `json:"data"`
}

func wavToPCM16Mono(wav []byte) ([]int16, int, error) {
	// Minimal WAV parser for PCM16 mono (like whizio pcm16ToWav output).
	// Expects a standard 44-byte header.
	if len(wav) < 44 {
		return nil, 0, fmt.Errorf("wav too small: %d", len(wav))
	}
	if string(wav[0:4]) != "RIFF" || string(wav[8:12]) != "WAVE" {
		return nil, 0, fmt.Errorf("not a wav")
	}
	numChannels := int(binary.LittleEndian.Uint16(wav[22:24]))
	sampleRate := int(binary.LittleEndian.Uint32(wav[24:28]))
	bitsPerSample := int(binary.LittleEndian.Uint16(wav[34:36]))
	if numChannels != 1 || bitsPerSample != 16 {
		return nil, sampleRate, fmt.Errorf("unsupported wav: channels=%d bits=%d", numChannels, bitsPerSample)
	}
	data := wav[44:]
	samples := len(data) / 2
	out := make([]int16, samples)
	for i := 0; i < samples; i++ {
		out[i] = int16(binary.LittleEndian.Uint16(data[i*2 : i*2+2]))
	}
	return out, sampleRate, nil
}

func downsampleTo8k(in []int16, inRate int) []int16 {
	// Resampler for common rates from Gemini/bridge.
	// The previous "drop samples" decimation (24k->8k take every 3rd) causes harsh aliasing
	// that users often describe as "glitchy/robotic". Use linear interpolation instead.
	switch inRate {
	case 8000:
		out := make([]int16, len(in))
		copy(out, in)
		return out
	case 16000, 24000:
		// Linear interpolation to 8k.
		// outLen ≈ inLen * 8000 / inRate
		if len(in) < 2 {
			return nil
		}
		outLen := (len(in) * 8000) / inRate
		if outLen < 1 {
			outLen = 1
		}
		out := make([]int16, outLen)
		step := float64(inRate) / 8000.0
		for i := 0; i < outLen; i++ {
			pos := float64(i) * step
			idx := int(pos)
			if idx >= len(in)-1 {
				out[i] = in[len(in)-1]
				continue
			}
			frac := pos - float64(idx)
			a := float64(in[idx])
			b := float64(in[idx+1])
			v := a + (b-a)*frac
			if v > 32767 {
				v = 32767
			} else if v < -32768 {
				v = -32768
			}
			out[i] = int16(v)
		}
		return out
	default:
		// unknown rate
		return nil
	}
}

func sendPcm8kToRtpPcmu(cs *callSession, addr net.Addr, pcm8k []int16, ssrc uint32, seq uint16, ts uint32) (uint16, uint32) {
	// 20ms @ 8k = 160 samples
	const frameSamples = 160

	firstPkt := true
	for off := 0; off+frameSamples <= len(pcm8k); off += frameSamples {
		select {
		case <-cs.stopCh:
			return seq, ts
		default:
		}
		payload := make([]byte, frameSamples)
		for i := 0; i < frameSamples; i++ {
			payload[i] = linearToMuLaw(pcm8k[off+i])
		}
		p := rtp.Packet{
			Header: rtp.Header{
				Version:        2,
				Marker:         firstPkt,
				PayloadType:    0, // PCMU
				SequenceNumber: seq,
				Timestamp:      ts,
				SSRC:           ssrc,
			},
			Payload: payload,
		}
		firstPkt = false
		raw, err := p.Marshal()
		if err == nil {
			_, _ = cs.rtp.WriteTo(raw, addr)
		}
		seq++
		ts += frameSamples
		time.Sleep(20 * time.Millisecond)
	}
	return seq, ts
}

func linearToMuLaw(sample int16) byte {
	// Linear PCM16 to G.711 μ-law
	const (
		muLawBias = 0x84
		muLawClip = 32635
	)
	s := int(sample)
	sign := 0
	if s < 0 {
		sign = 0x80
		s = -s
		if s > muLawClip {
			s = muLawClip
		}
	} else {
		if s > muLawClip {
			s = muLawClip
		}
	}
	s += muLawBias
	exponent := 7
	for expMask := 0x4000; (s&expMask) == 0 && exponent > 0; expMask >>= 1 {
		exponent--
	}
	mantissa := (s >> (exponent + 3)) & 0x0F
	u := ^byte(sign | (exponent << 4) | mantissa)
	return u
}

func genBeepPcm8k(freqHz int, ms int) []int16 {
	// Square-ish beep (no floats) - enough to validate downlink RTP audio.
	if freqHz <= 0 || ms <= 0 {
		return nil
	}
	samples := (8000 * ms) / 1000
	if samples < 1 {
		samples = 1
	}
	out := make([]int16, samples)
	period := 8000 / freqHz
	if period < 2 {
		period = 2
	}
	amp := int16(7000)
	for i := 0; i < samples; i++ {
		if (i % period) < (period / 2) {
			out[i] = amp
		} else {
			out[i] = -amp
		}
	}
	return out
}

func muLawToLinear(u byte) int16 {
	// G.711 μ-law to linear PCM16
	u = ^u
	sign := u & 0x80
	exponent := (u >> 4) & 0x07
	mantissa := u & 0x0F
	sample := ((int(mantissa) << 3) + 0x84) << exponent
	sample -= 0x84
	if sign != 0 {
		return int16(-sample)
	}
	return int16(sample)
}

func aLawToLinear(a byte) int16 {
	// G.711 A-law to linear PCM16
	a ^= 0x55
	sign := a & 0x80
	exponent := (a >> 4) & 0x07
	mantissa := a & 0x0F
	var sample int
	if exponent == 0 {
		sample = (int(mantissa) << 4) + 8
	} else {
		sample = ((int(mantissa) << 4) + 0x108) << (exponent - 1)
	}
	if sign == 0 {
		sample = -sample
	}
	return int16(sample)
}

func runRTPDrainCall(logger *log.Logger, cs *callSession) {
	// AI mode placeholder: we currently just read RTP and do not echo it back.
	buf := make([]byte, 2048)
	var p rtp.Packet

	var (
		mu       sync.Mutex
		lastAddr string
		rx       uint64
		lastPT   uint8
	)

	t := time.NewTicker(1 * time.Second)
	defer t.Stop()

	go func() {
		for range t.C {
			mu.Lock()
			a := lastAddr
			rxi := rx
			pt := lastPT
			rx = 0
			mu.Unlock()
			if a != "" && rxi > 0 {
				logger.Printf("rtp recv (ai-pending): ext=%s addr=%s pt=%d rx=%dpps", cs.extID, a, pt, rxi)
			}
		}
	}()

	for {
		_ = cs.rtp.SetReadDeadline(time.Now().Add(250 * time.Millisecond))
		n, addr, err := cs.rtp.ReadFrom(buf)
		select {
		case <-cs.stopCh:
			return
		default:
		}
		if err != nil {
			if ne, ok := err.(net.Error); ok && ne.Timeout() {
				continue
			}
			return
		}
		if err := p.Unmarshal(buf[:n]); err != nil {
			continue
		}
		mu.Lock()
		lastAddr = addr.String()
		lastPT = p.PayloadType
		rx++
		mu.Unlock()
	}
}
