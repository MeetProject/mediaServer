const APP_PREFIX = '/app/media';
const USER_PREFIX = '/user/media';

export const MEDIA_ROUTES = {
	SEND: {
		CAPABILITIES: `${APP_PREFIX}/capabilities`,
		CONSUMER_PARAMS: `${APP_PREFIX}/consumerParams`,
		DTLS: `${APP_PREFIX}/dtls`,
		DTLS_CONNECT: `${APP_PREFIX}/dtls/connect`,
		ERROR: `${APP_PREFIX}/error`,
		RESUME: `${APP_PREFIX}/resume`,
		RTLS: `${APP_PREFIX}/rtls`,
	},
	SUB: {
		CAPABILITIES: `${USER_PREFIX}/capabilities`,
		CONSUMER_PARAMS: `${USER_PREFIX}/params`,
		DTLS: `${USER_PREFIX}/dtls`,
		DTLS_CONNECT: `${USER_PREFIX}/dtlsconnect`,
		LEAVE: `${USER_PREFIX}/leave`,
		RESUME: `${USER_PREFIX}/resume`,
		RTLS: `${USER_PREFIX}/rtls`,
	},
} as const;
