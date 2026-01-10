package main

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pion/rtp"
)

type cfg struct {
	sipServerAddr   string
	sipDomain       string
	sipUser         string
	sipPass         string
	sipListenAddr   string
	sipRegisterAddr string
	sipContactHost  string
	rtpListenAddr   string
	sdpIP           string
	registerExpires int
	logLevel        string
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
	serverAddr := getenv("SIP_SERVER_ADDR", "auto:5060")
	domain := getenv("SIP_DOMAIN", "auto")
	contactHost := getenv("SIP_CONTACT_HOST", "auto")
	sdpIP := getenv("SDP_IP", "auto")

	autoIP := detectLocalIPv4()
	if strings.HasPrefix(strings.ToLower(serverAddr), "auto:") {
		serverAddr = autoIP + serverAddr[len("auto"):]
	}
	if strings.EqualFold(domain, "auto") {
		domain = autoIP
	}
	if strings.EqualFold(contactHost, "auto") {
		contactHost = autoIP
	}
	if strings.EqualFold(sdpIP, "auto") {
		sdpIP = autoIP
	}

	return cfg{
		sipServerAddr:   serverAddr,
		sipDomain:       domain,
		sipUser:         getenv("SIP_USER", "1098"),
		sipPass:         getenv("SIP_PASS", "1234"),
		sipListenAddr:   getenv("SIP_LISTEN_ADDR", "0.0.0.0:5090"),
		sipRegisterAddr: getenv("SIP_REGISTER_LOCAL_ADDR", "0.0.0.0:5091"),
		sipContactHost:  contactHost,
		rtpListenAddr:   getenv("RTP_LISTEN_ADDR", "0.0.0.0:40000"),
		sdpIP:           sdpIP,
		registerExpires: mustParseInt("REGISTER_EXPIRES", 300),
		logLevel:        getenv("LOG_LEVEL", "info"),
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

type sipMsg struct {
	startLine string
	method    string
	uri       string

	status int
	reason string

	// header names are normalized to lower-case
	hdr map[string][]string
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

type callState struct {
	mu         sync.Mutex
	active     bool
	dialogID   string // Call-ID
	serverTo   string // To with tag (stable for the dialog)
}

func main() {
	rand.Seed(time.Now().UnixNano())
	c := loadCfg()

	logger := log.New(os.Stdout, "sip-rtp-go: ", log.LstdFlags|log.Lmicroseconds)
	logger.Printf("starting (sip=%s, rtp=%s, user=%s)", c.sipListenAddr, c.rtpListenAddr, c.sipUser)

	// SIP UDP socket for incoming calls (UAS)
	sipSrvConn, err := net.ListenPacket("udp", c.sipListenAddr)
	if err != nil {
		logger.Fatalf("listen sip %s: %v", c.sipListenAddr, err)
	}
	defer sipSrvConn.Close()

	// Separate SIP UDP socket for REGISTER client traffic (avoids read races)
	sipRegConn, err := net.ListenPacket("udp", c.sipRegisterAddr)
	if err != nil {
		logger.Fatalf("listen sip register %s: %v", c.sipRegisterAddr, err)
	}
	defer sipRegConn.Close()

	// RTP echo socket
	rtpConn, err := net.ListenPacket("udp", c.rtpListenAddr)
	if err != nil {
		logger.Fatalf("listen rtp %s: %v", c.rtpListenAddr, err)
	}
	defer rtpConn.Close()

	var st callState

	go func() {
		if err := runRTPEcho(logger, rtpConn); err != nil {
			logger.Fatalf("rtp echo failed: %v", err)
		}
	}()

	// Periodic REGISTER refresh
	go func() {
		for {
			if err := doRegister(logger, sipRegConn, c); err != nil {
				logger.Printf("register error: %v", err)
			}
			time.Sleep(time.Duration(c.registerExpires/2) * time.Second)
		}
	}()

	buf := make([]byte, 64*1024)
	for {
		n, addr, err := sipSrvConn.ReadFrom(buf)
		if err != nil {
			logger.Fatalf("sip read: %v", err)
		}
		pkt := append([]byte(nil), buf[:n]...)
		go handleSIPPacket(logger, sipSrvConn, addr, pkt, c, &st)
	}
}

func doRegister(logger *log.Logger, conn net.PacketConn, c cfg) error {
	serverAddr, err := net.ResolveUDPAddr("udp", c.sipServerAddr)
	if err != nil {
		return err
	}

	_, sipListenPort, err := net.SplitHostPort(c.sipListenAddr)
	if err != nil {
		return fmt.Errorf("bad SIP_LISTEN_ADDR %q: %w", c.sipListenAddr, err)
	}
	contactURI := fmt.Sprintf("sip:%s@%s;transport=udp", c.sipUser, net.JoinHostPort(c.sipContactHost, sipListenPort))
	reqURI := fmt.Sprintf("sip:%s", c.sipDomain)

	fromTag := randHex(10)
	callID := fmt.Sprintf("%s@%s", randHex(16), c.sipContactHost)

	send := func(cseq int, auth string) error {
		regHost, regPort, _ := net.SplitHostPort(c.sipRegisterAddr)
		if regHost == "" {
			regHost = c.sipContactHost
		}
		branch := "z9hG4bK" + randHex(12)
		var b strings.Builder
		b.WriteString(fmt.Sprintf("REGISTER %s SIP/2.0\r\n", reqURI))
		b.WriteString(fmt.Sprintf("Via: SIP/2.0/UDP %s:%s;branch=%s;rport\r\n", regHost, regPort, branch))
		b.WriteString("Max-Forwards: 70\r\n")
		b.WriteString(fmt.Sprintf("From: <sip:%s@%s>;tag=%s\r\n", c.sipUser, c.sipDomain, fromTag))
		b.WriteString(fmt.Sprintf("To: <sip:%s@%s>\r\n", c.sipUser, c.sipDomain))
		b.WriteString(fmt.Sprintf("Call-ID: %s\r\n", callID))
		b.WriteString(fmt.Sprintf("CSeq: %d REGISTER\r\n", cseq))
		b.WriteString(fmt.Sprintf("Contact: <%s>\r\n", contactURI))
		b.WriteString(fmt.Sprintf("Expires: %d\r\n", c.registerExpires))
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
	auth := buildAuthorization("REGISTER", reqURI, c.sipUser, c.sipPass, ch, 1)

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
	logger.Printf("registered as %s (expires=%ds)", c.sipUser, c.registerExpires)
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

func handleSIPPacket(logger *log.Logger, conn net.PacketConn, addr net.Addr, pkt []byte, c cfg, st *callState) {
	m, err := parseSIP(pkt)
	if err != nil {
		return
	}
	if m.method == "" {
		// response - ignore (REGISTER loop reads synchronously)
		return
	}

	switch strings.ToUpper(m.method) {
	case "INVITE":
		handleInvite(logger, conn, addr, m, c, st)
	case "ACK":
		// no-op
	case "CANCEL":
		// Call setup cancelled by caller
		sendSIPResponse(conn, addr, m, "", "", 200, "OK", nil, nil)
		st.mu.Lock()
		st.active = false
		st.dialogID = ""
		st.serverTo = ""
		st.mu.Unlock()
		logger.Printf("call cancelled (CANCEL)")
	case "BYE":
		handleBye(logger, conn, addr, m, st)
	case "OPTIONS":
		// Keepalive/feature probe
		sendSIPResponse(conn, addr, m, "", "", 200, "OK", map[string][]string{
			"Allow": {"INVITE, ACK, BYE, CANCEL, OPTIONS"},
		}, nil)
	default:
		// Minimal: respond 501 to other methods.
		sendSIPResponse(conn, addr, m, "", "", 501, "Not Implemented", nil, nil)
	}
}

func handleInvite(logger *log.Logger, conn net.PacketConn, addr net.Addr, req sipMsg, c cfg, st *callState) {
	st.mu.Lock()
	if st.active {
		st.mu.Unlock()
		sendSIPResponse(conn, addr, req, "", "", 486, "Busy Here", nil, nil)
		logger.Printf("incoming INVITE while busy -> 486 (from=%s)", addr.String())
		return
	}
	st.active = true
	st.dialogID = req.header("call-id")
	toWithTag := ensureToHasTag(req.header("to"))
	st.serverTo = toWithTag
	st.mu.Unlock()

	sendSIPResponse(conn, addr, req, toWithTag, "", 100, "Trying", nil, nil)
	sendSIPResponse(conn, addr, req, toWithTag, "", 180, "Ringing", nil, nil)

	rtpPort := portFromAddr(c.rtpListenAddr)
	sdp := buildSDP(c.sdpIP, rtpPort)
	_, sipListenPort, _ := net.SplitHostPort(c.sipListenAddr)
	contact := ""
	if sipListenPort != "" {
		contact = fmt.Sprintf("<sip:%s@%s:%s;transport=udp>", c.sipUser, c.sipContactHost, sipListenPort)
	}
	extra := map[string][]string{
		"Content-Type": {"application/sdp"},
		"Allow":        {"INVITE, ACK, BYE, CANCEL, OPTIONS"},
		"Supported":    {"replaces, timer"},
	}
	// 200 OK
	sendSIPResponse(conn, addr, req, toWithTag, contact, 200, "OK", extra, []byte(sdp))

	logger.Printf("call answered (rtp=%s:%d)", c.sdpIP, rtpPort)
}

func handleBye(logger *log.Logger, conn net.PacketConn, addr net.Addr, req sipMsg, st *callState) {
	sendSIPResponse(conn, addr, req, "", "", 200, "OK", nil, nil)
	st.mu.Lock()
	st.active = false
	st.dialogID = ""
	st.serverTo = ""
	st.mu.Unlock()
	logger.Printf("call ended (BYE)")
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

func portFromAddr(addr string) int {
	_, p, err := net.SplitHostPort(addr)
	if err != nil {
		return 0
	}
	n, _ := strconv.Atoi(p)
	return n
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

func runRTPEcho(logger *log.Logger, conn net.PacketConn) error {
	// We rewrite SSRC to avoid collisions and keep payload untouched.
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

	go func() {
		t := time.NewTicker(1 * time.Second)
		defer t.Stop()
		for range t.C {
			mu.Lock()
			a := lastAddr
			rxi := rx
			txi := tx
			pt := lastPT
			// reset counters each second for a simple "rate" view
			rx = 0
			tx = 0
			mu.Unlock()
			if a != "" && (rxi > 0 || txi > 0) {
				logger.Printf("rtp echo: addr=%s pt=%d rx=%dpps tx=%dpps", a, pt, rxi, txi)
			}
		}
	}()

	for {
		n, addr, err := conn.ReadFrom(buf)
		if err != nil {
			return err
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
				CSRC:           nil,
			},
			Payload: append([]byte(nil), p.Payload...),
		}
		raw, err := out.Marshal()
		if err != nil {
			continue
		}
		_, _ = conn.WriteTo(raw, addr)
		mu.Lock()
		tx++
		mu.Unlock()
	}
}


