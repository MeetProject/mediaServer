# mediaServer
본 레포지토리는 Mediasoup v3 라이브러리를 기반으로 한 WebRTC SFU(Selective Forwarding Unit) 미디어 서버입니다.

## 역할
- 미디어 라우팅
1:N 스트림 복제 및 전달을 통해 클라이언트의 업로드 부하를 최소화하는 SFU 아키텍처 구현

- 워커(Worker) 및 부하 분산
멀티 코어 CPU를 활용하기 위한 Multi-Worker 구조 설계 및 라운드 로빈 할당

- 미디어 상태 모니터링
실시간 오디오 레벨 분석을 통한 능동적 스트림 제어 및 리소스 가드(Resource Guard) 로직 운용

## 구조
```scss
Signaling Server (Spring Boot)
          │
          ▼ [Command / JSON]
┌──────────────────────────────────────────┐
│             Media Server (Node.js)       │
├──────────────────────────────────────────┤
│  Worker Manager (Multi-Core Processing)  │
│    ├── Worker 1 (Router 1, 2...)         │
│    └── Worker 2 (Router 3, 4...)         │
├──────────────────────────────────────────┤
│  Media Pipeline                          │
│    ├── Transport (ICE/DTLS)              │
│    ├── Producer (Upstream)               │──▶ Client (Send)
│    └── Consumer (Downstream)             │──▶ Client (Recv)
└──────────────────────────────────────────┘
```

## 주요 기능
### 오디오 모니터링 (Audio Observer)
- Active Speaker 감지: audioLevelObserver를 통해 실시간으로 가장 크게 말하는 유저를 판별합니다.
- 상위 N인 스트리밍: 서버 부하 및 클라이언트 대역폭 보호를 위해 상위 5명(MAX_SPEAKER)의 오디오/비디오만 우선적으로 활성화합니다.

### 리소스 가드 로직 (audioMonitor)
- 플러딩 방지: 상태 변화가 급격할 경우 2초간의 debounce 지연 시간을 두어 불필요한 시그널링 트래픽과 서버 부하를 방지합니다.

### 멀티 워커 및 파이프라인 관리
- Worker Load Balancing: 서버 기동 시 CPU 코어 수에 맞게 워커를 생성하여 미디어 처리 프로세스를 병렬화합니다.
- 자동 자원 해제: 시그널 서버로부터 leave 신호를 받거나 트랜스포트 타임아웃 발생 시, 관련 Producer/Consumer를 즉시 폐기하여 메모리 누수를 방지합니다.

## 실행 항법
```bash
# 의존성 설치
npm install

# 빌드 및 실행 (TypeScript 실행기 사용)
npm start
```
