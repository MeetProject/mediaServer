import { AppData, DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/types';

import { ConsumerParams, TransportDirectionType, TransportOptions } from './mediasoup.js';
import { TrackType } from './track.js';

interface MessageBase {
	correlationId: string;
	userId: string;
}

export interface CreateRoomPayload {
	roomId: string;
}

export interface CapabilitiesResponse extends MessageBase {
	roomId: string;
}

export interface CapabilitiesPayload extends MessageBase {
	capabilities: RtpCapabilities;
}

export interface DtlsResponse extends MessageBase {
	roomId: string;
	direction: TransportDirectionType;
}

export interface DtlsPayload extends MessageBase {
	options: TransportOptions;
}

export interface DtlsConnectResponse extends MessageBase {
	dtlsParameters: DtlsParameters;
	direction: TransportDirectionType;
}

export interface DtlsConnectPayload extends MessageBase {}

export interface RtlsResponse extends MessageBase {
	appData: AppData;
	kind: TrackType;
	rtpParameters: RtpParameters;
	roomId: string;
}

export interface RtlsPayload extends MessageBase {
	producerId: string;
}

export interface ConsumerParamsResponse extends MessageBase {
	roomId: string;
	producerId: string;
	rtpCapabilities: RtpCapabilities;
}

export interface ConsumerParamsPayload extends MessageBase {
	consumerParams: ConsumerParams;
}

export interface ConsumerResumeResponse extends MessageBase {
	consumerId: string;
}

export interface ConsumerPauseResponse extends MessageBase {
	consumerId: string;
}

export interface ProducerMuteResponse extends MessageBase {
	producerId: string;
}

export interface ProducerRemoveResponse {
	userId: string;
	producerId: string;
}

export interface ProducerMutePayload extends MessageBase {}

export interface LeaveResponse {
	roomId: string;
	userId: string;
}

export interface ErrorPayload extends MessageBase {}
