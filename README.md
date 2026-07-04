# mediaServer

WebRTC 화상회의를 위한 미디어 서버(SFU)입니다. mediasoup 기반으로, 참가자 간 미디어 트래픽(RTP) 라우팅을 담당합니다.

시그널링과 방·참가자 상태 관리는 [시그널링 서버](../signalServer)가 담당하며, 이 서버는 시그널링 서버에 STOMP 클라이언트로 접속해 릴레이된 요청을 처리합니다.

- mediasoup Worker·Router 수명 관리 — CPU 코어 수만큼 Worker 생성 후 방 단위 라운드로빈 배정
- WebRTC transport 생성과 DTLS 연결
- producer·consumer 생성과 pause/resume 제어
- 오디오 레벨 기반 게이팅 — 발화 중이 아닌 참가자의 오디오 consumer를 pause해 대역폭 절약
- 재입장(재연결) 시 이전 연결의 자원 정리 후 재협상

## 기술 스택

- Node.js, TypeScript (ESM, 개발 실행은 tsx)
- mediasoup 3 (Opus 48kHz stereo, VP8)
- @stomp/stompjs + ws (시그널링 서버 접속)
- ESLint, Prettier

## 구조

```
index.ts       진입점 — Worker 초기화, STOMP 클라이언트 시작, graceful shutdown
signaling/     시그널링 구독·핸들러 — 요청별 처리와 RPC 응답 발행
mediasoup/     SFU 코어 — 방·transport·producer·consumer 수명 관리, 오디오 게이팅
constant/      메시지 목적지(MEDIA_ROUTES), mediasoup 설정(코덱·transport·worker)
lib/           STOMP 클라이언트 래퍼 (접속·구독·발행)
type/          메시지·mediasoup 타입 정의
util/          비동기 락(runWithLock), 중첩 맵 유틸
```

- 모든 요청은 시그널링 서버를 거칩니다. `/user/media/**`를 구독하고 `/app/media/**`로 응답하며, `correlationId`로 요청-응답을 짝짓는 RPC 스타일입니다.
- 요청 처리에 실패하면 `correlationId`와 함께 에러를 발행해 클라이언트가 타임아웃 대신 즉시 실패를 받도록 합니다. 핸들러 예외는 격리되어 프로세스에 전파되지 않습니다.
- `capabilities` 요청은 입장·재입장 시점에만 오므로, 이때 해당 유저의 기존 transport·producer·consumer를 정리하고 새로 협상합니다 — 순단 후 resync 복구가 여기서 성립합니다.
- 방 생성은 락(`runWithLock`)으로 직렬화하고, 마지막 참가자가 나가면 Router를 닫아 정리합니다.

## 오디오 게이팅

방마다 `AudioLevelObserver`(2초 간격, −45dB 임계, 상위 5명)를 두고 오디오 consumer를 제어합니다.

- 발화 중인 producer의 consumer는 resume, 비활성 상태가 2초 이상 지속되면 pause
- 클라이언트가 명시적으로 pause한 consumer(로컬 음소거)는 게이팅이 되살리지 않음
- 조용하던 참가자가 말을 시작하면 관측 간격만큼(최대 약 2초) 초반 음성이 잘릴 수 있는 트레이드오프가 있음

## 인증·환경 변수

시그널링 서버에 `/ws?userId={id}&token={secret}`으로 접속하며, 토큰은 시그널링 서버의 `.env.local`과 같은 값이어야 합니다.

```bash
cp .env.example .env.local   # 값 채우기
```

| 변수 | 설명 |
|---|---|
| `SIGNAL_SERVER_URL` | 시그널링 서버 WebSocket 주소 (기본 `ws://localhost:8080/ws/websocket`) |
| `MEDIA_SERVER_ID` / `MEDIA_SERVER_TOKEN` | 접속 id·공유 시크릿 — 시그널링 서버와 동일 값, `openssl rand -hex 32` 권장 |
| `MEDIASOUP_LISTEN_IP` / `MEDIASOUP_ANNOUNCED_IP` | RTP 수신 IP·외부 공개 IP (기본 `0.0.0.0` / `127.0.0.1`) |
| `RTC_MIN_PORT` / `RTC_MAX_PORT` | RTP 포트 범위 (기본 10000–10100) |

배포 시에는 `MEDIASOUP_ANNOUNCED_IP`를 서버의 공인 IP로 설정하고, RTP 포트 범위를 방화벽에서 열어야 합니다.

## 실행

```bash
npm install
npm run dev      # 개발 (tsx watch)
npm run build    # tsc 빌드
npm run start    # dist 실행
```

로컬 개발은 `.env.local` 없이 기본값으로 동작합니다. 시그널링 서버가 먼저 실행 중이어야 하며, 접속이 끊기면 자동 재접속 후 자원을 초기화하고 재구독합니다.

## 관련 저장소

- **front** — Next.js 클라이언트 (mediasoup-client, SockJS + @stomp/stompjs)
- **signalServer** — Spring Boot 시그널링 서버 (STOMP 중계, 방·참가자 상태 관리)
