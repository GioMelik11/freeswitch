#!/usr/bin/env bash
set -euo pipefail

# Automated protocol test for whizio mod_audio_stream-compatible server.
# Connects to ws://127.0.0.1:9094, sends metadata + ~1s of silence,
# prints the first streamAudio payload type/sampleRate.

docker run --rm --network host golang:1.22-bookworm bash -c '
set -euo pipefail
mkdir -p /tmp/wstest
cd /tmp/wstest

cat > main.go <<'"'"'EOF'"'"'
package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gorilla/websocket"
)

type Msg struct {
	Type string `json:"type"`
	Data struct {
		AudioDataType string `json:"audioDataType"`
		SampleRate    int    `json:"sampleRate"`
		AudioData     string `json:"audioData"`
	} `json:"data"`
}

func main() {
	c, _, err := websocket.DefaultDialer.Dial("ws://127.0.0.1:9094", nil)
	if err != nil {
		panic(err)
	}
	defer c.Close()

	_ = c.WriteMessage(websocket.TextMessage, []byte(`{"source":"ws-test","mimeType":"audio/pcm;rate=16000","sampleRate":16000}`))

	// ~1s of silence (20ms frames): 320 samples @16kHz PCM16LE => 640 bytes
	silence := make([]byte, 640)
	for i := 0; i < 50; i++ {
		_ = c.WriteMessage(websocket.BinaryMessage, silence)
		time.Sleep(20 * time.Millisecond)
	}

	deadline := time.Now().Add(25 * time.Second)
	for time.Now().Before(deadline) {
		mt, b, err := c.ReadMessage()
		if err != nil {
			panic(err)
		}
		if mt != websocket.TextMessage {
			continue
		}
		var m Msg
		if err := json.Unmarshal(b, &m); err != nil {
			continue
		}
		if m.Type != "streamAudio" {
			continue
		}
		fmt.Printf("streamAudio audioDataType=%s sampleRate=%d audioLenB64=%d\n", m.Data.AudioDataType, m.Data.SampleRate, len(m.Data.AudioData))
		return
	}
	panic("timeout waiting for streamAudio")
}
EOF

go mod init wstest >/dev/null 2>&1 || true
go get github.com/gorilla/websocket@v1.5.3 >/dev/null 2>&1
go run .
'


