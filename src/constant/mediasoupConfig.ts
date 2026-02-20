import { RtpCodecCapability, WorkerSettings } from 'mediasoup/types';

export const config = {
	http: {
		host: '0.0.0.0',
		port: 3000,
	},
	mediasoup: {
		router: {
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
		webRtcTransport: {
			enableTcp: true,
			enableUdp: true,
			listenIps: [{ announcedIp: '127.0.0.1', ip: '0.0.0.0' }],
			preferUdp: true,
		},
		worker: {
			logLevel: 'debug',
			logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
			rtcMaxPort: 10100,
			rtcMinPort: 10000,
		} as WorkerSettings,
	},
};
