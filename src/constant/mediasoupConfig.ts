import { RtpCodecCapability, WorkerSettings, WebRtcTransportOptions } from 'mediasoup/types';

export const MEDIASOUP_CONFIG = {
	ROUTER: {
		mediaCodecs: [
			{
				channels: 2,
				clockRate: 48000,
				kind: 'audio',
				mimeType: 'audio/opus',
			},
			{
				clockRate: 90000,
				kind: 'video',
				mimeType: 'video/VP8',
				parameters: { 'x-google-start-bitrate': 1000 },
			},
		] as RtpCodecCapability[],
	},

	WEBRTC_TRANSPORT: {
		enableTcp: true,
		enableUdp: true,
		initialAvailableOutgoingBitrate: 1000000,
		listenIps: [
			{
				announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
				ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
			},
		],
		preferUdp: true,
	} as WebRtcTransportOptions,

	WORKER: {
		logLevel: 'debug',
		logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
		rtcMaxPort: Number(process.env.RTC_MAX_PORT) || 10100,
		rtcMinPort: Number(process.env.RTC_MIN_PORT) || 10000,
	} as WorkerSettings,
} as const;
