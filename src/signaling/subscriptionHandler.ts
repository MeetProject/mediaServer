import { MEDIA_ROUTES } from '@/constant/message.js';
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
	ProducerMutePayload,
	ProducerMuteResponse,
	ProducerRemoveResponse,
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
	const {
		connectTransport,
		createProducer,
		getCapabilities,
		getConsumerParams,
		getTransportOption,
		leave,
		producerPause,
		producerRemove,
		producerResume,
		reset,
		resume,
	} = mediasoup();

	const handleCapabilities = async (data: CapabilitiesResponse) => {
		try {
			const { correlationId, roomId, userId } = data;
			const capabilities = await getCapabilities(roomId, userId);

			if (capabilities) {
				publish<CapabilitiesPayload>(MEDIA_ROUTES.SEND.CAPABILITIES, {
					capabilities,
					correlationId,
					userId,
				});
				return;
			}

			publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
		} catch (e) {
			console.log('capability', e);
		}
	};

	const handleDtls = async (data: DtlsResponse) => {
		const { correlationId, direction, roomId, userId } = data;
		const options = await getTransportOption(roomId, userId, direction);

		if (options) {
			publish<DtlsPayload>(MEDIA_ROUTES.SEND.DTLS, {
				correlationId,
				options,
				userId,
			});
			return;
		}

		publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
	};

	const handleDtlsConnect = async (data: DtlsConnectResponse) => {
		try {
			const { correlationId, direction, dtlsParameters, userId } = data;
			const flag = await connectTransport(userId, direction, dtlsParameters);

			if (flag) {
				publish<DtlsConnectPayload>(MEDIA_ROUTES.SEND.DTLS_CONNECT, {
					correlationId,
					userId,
				});
				return;
			}

			publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
		} catch (e) {
			console.log(e);
		}
	};

	const handleRtls = async (data: RtlsResponse) => {
		const { appData, correlationId, kind, rtpParameters, userId } = data;
		const producerId = await createProducer(userId, rtpParameters, appData, kind);

		if (producerId) {
			publish<RtlsPayload>(MEDIA_ROUTES.SEND.RTLS, {
				correlationId,
				producerId,
				userId,
			});
			return;
		}
		publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
	};

	const handleConsumerParams = async (data: ConsumerParamsResponse) => {
		const { correlationId, producerId, roomId, rtpCapabilities, targetId, userId } = data;
		const consumerParams = await getConsumerParams(roomId, userId, targetId, producerId, rtpCapabilities);

		if (consumerParams) {
			publish<ConsumerParamsPayload>(MEDIA_ROUTES.SEND.CONSUMER_PARAMS, {
				consumerParams,
				correlationId,
				userId,
			});
			return;
		}

		publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
	};

	const handleResume = async (data: ResumeResponse) => {
		const { consumerId, correlationId, userId } = data;
		const flag = await resume(userId, consumerId);

		if (flag) {
			publish<ResumePayload>(MEDIA_ROUTES.SEND.RESUME, {
				correlationId,
				userId,
			});
			return;
		}
		publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
	};

	const handleProducerPause = async (data: ProducerMuteResponse) => {
		const { correlationId, producerId, userId } = data;
		const flag = producerPause(userId, producerId);

		if (flag) {
			publish<ProducerMutePayload>(MEDIA_ROUTES.SEND.PRODUCER_PAUSE, {
				correlationId,
				userId,
			});
			return;
		}
		publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
	};

	const handleProducerResume = async (data: ProducerMuteResponse) => {
		const { correlationId, producerId, userId } = data;
		const flag = producerResume(userId, producerId);

		if (flag) {
			publish<ProducerMutePayload>(MEDIA_ROUTES.SEND.PRODUCER_RESUME, {
				correlationId,
				userId,
			});
			return;
		}
		publish<ErrorPayload>(MEDIA_ROUTES.SEND.ERROR, { correlationId, userId });
	};

	const handleProducerRemove = async (data: ProducerRemoveResponse) => {
		const { producerId, userId } = data;
		producerRemove(userId, producerId);
	};

	const handleLeave = async (data: LeaveResponse) => {
		const { roomId, userId } = data;
		leave(roomId, userId);
	};

	const onConnect = () => {
		reset();
		subscribe<CapabilitiesResponse>(MEDIA_ROUTES.SUB.CAPABILITIES, handleCapabilities);
		subscribe<DtlsResponse>(MEDIA_ROUTES.SUB.DTLS, handleDtls);
		subscribe<DtlsConnectResponse>(MEDIA_ROUTES.SUB.DTLS_CONNECT, handleDtlsConnect);
		subscribe<RtlsResponse>(MEDIA_ROUTES.SUB.RTLS, handleRtls);
		subscribe<ConsumerParamsResponse>(MEDIA_ROUTES.SUB.CONSUMER_PARAMS, handleConsumerParams);
		subscribe<ResumeResponse>(MEDIA_ROUTES.SUB.RESUME, handleResume);
		subscribe<ProducerMuteResponse>(MEDIA_ROUTES.SUB.PRODUCER_PAUSE, handleProducerPause);
		subscribe<ProducerRemoveResponse>(MEDIA_ROUTES.SUB.PRODUCER_REMOVE, handleProducerRemove);
		subscribe<ProducerMuteResponse>(MEDIA_ROUTES.SUB.PRODUCER_RESUME, handleProducerResume);
		subscribe<LeaveResponse>(MEDIA_ROUTES.SUB.LEAVE, handleLeave);
	};

	return { onConnect };
};
