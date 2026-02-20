/* eslint-disable sonarjs/no-duplicate-string */
import { mediasoup } from '@/mediasoup/index.js';
import {
	CapabilitiesPayload,
	CapabilitiesResponse,
	ConsumerParamsPayload,
	ConsumerParamsResponse,
	DtlsConnectPayload,
	DtlsConnectResponse,
	DtlsPayload,
	DtlsResponse,
	ErrorPayload,
	LeaveResponse,
	ResumePayload,
	ResumeResponse,
	RtlsPayload,
	RtlsResponse,
} from '@/type/message.js';

interface HandlerProps {
	subscribe: <T>(destination: string, callback: (response: T) => void | Promise<void>) => void;
	publish: <T>(destination: string, payload?: T | undefined) => void;
}

export const subscriptionHandler = ({ publish, subscribe }: HandlerProps) => {
	const { connectTransport, createProducer, getCapabilities, getConsumerParams, getTransportOption, leave, resume } =
		mediasoup();

	const handleCapabilities = async (data: CapabilitiesResponse) => {
		const { correlationId, roomId, userId } = data;
		const capabilities = await getCapabilities(roomId, userId);

		if (capabilities) {
			publish<CapabilitiesPayload>('/app/media/capabilities', {
				capabilities,
				correlationId,
				userId,
			});
			return;
		}

		publish<ErrorPayload>('/app/media/error', { correlationId, userId });
	};

	const handleDtls = async (data: DtlsResponse) => {
		const { correlationId, direction, roomId, userId } = data;
		const options = await getTransportOption(roomId, userId, direction);

		if (options) {
			publish<DtlsPayload>('/app/media/dtls', {
				correlationId,
				options,
				userId,
			});
			return;
		}

		publish<ErrorPayload>('/app/media/error', { correlationId, userId });
	};

	const handleDtlsConnect = async (data: DtlsConnectResponse) => {
		const { correlationId, direction, dtlsParameters, userId } = data;
		const flag = await connectTransport(userId, direction, dtlsParameters);

		if (flag) {
			publish<DtlsConnectPayload>('/app/media/connect', {
				correlationId,
				userId,
			});
			return;
		}

		publish<ErrorPayload>('/app/media/error', { correlationId, userId });
	};

	const handleRtls = async (data: RtlsResponse) => {
		const { appData, correlationId, kind, rtpParameters, userId } = data;
		const producerId = await createProducer(userId, rtpParameters, appData, kind);

		if (producerId) {
			publish<RtlsPayload>('/app/media/rtls', {
				correlationId,
				producerId,
				userId,
			});
			return;
		}
		publish<ErrorPayload>('/app/media/error', { correlationId, userId });
	};

	const handleConsumerParams = async (data: ConsumerParamsResponse) => {
		const { correlationId, producerId, roomId, rtpCapabilities, userId } = data;
		const consumerParams = await getConsumerParams(roomId, userId, producerId, rtpCapabilities);

		if (consumerParams) {
			publish<ConsumerParamsPayload>('/app/media/consumerParams', {
				consumerParams,
				correlationId,
				userId,
			});
			return;
		}

		publish<ErrorPayload>('/app/media/error', { correlationId, userId });
	};

	const handleResume = async (data: ResumeResponse) => {
		const { consumerId, correlationId, userId } = data;
		const flag = await resume(userId, consumerId);

		if (flag) {
			publish<ResumePayload>('/app/media/resume', {
				correlationId,
				userId,
			});
			return;
		}
		publish<ErrorPayload>('/app/media/error', { correlationId, userId });
	};

	const handleLeave = async (data: LeaveResponse) => {
		const { roomId, userId } = data;
		leave(roomId, userId);
	};

	const onConnect = () => {
		subscribe<CapabilitiesResponse>('/user/media/capabilites', handleCapabilities);
		subscribe<DtlsResponse>('/user/media/dtls', handleDtls);
		subscribe<DtlsConnectResponse>('/user/media/connect', handleDtlsConnect);
		subscribe<RtlsResponse>('/user/media/rtls', handleRtls);
		subscribe<ConsumerParamsResponse>('/user/media/consumerParams', handleConsumerParams);
		subscribe<ResumeResponse>('/user/media/resume', handleResume);
		subscribe<LeaveResponse>('/user/media/leave', handleLeave);
	};

	return { onConnect };
};
