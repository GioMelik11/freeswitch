FROM golang:1.22-bookworm AS build

# Build context is repo-root (like freeswitch-build). Source lives under /src/sip-rtp-go.
WORKDIR /src/sip-rtp-go

COPY sip-rtp-go/go.mod sip-rtp-go/go.sum ./
RUN go mod download

COPY sip-rtp-go/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/sip-rtp-go ./cmd/sip-rtp-go

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/sip-rtp-go /sip-rtp-go
USER nonroot:nonroot
ENTRYPOINT ["/sip-rtp-go"]


