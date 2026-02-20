import {
	Consumer,
	WebRtcTransport,
	Producer,
	Router,
	DtlsParameters,
	IceCandidate,
	IceParameters,
	SctpParameters,
	AppData,
	RtpParameters,
	MediaKind,
} from 'mediasoup/types';

export type TransportDriectionType = 'send' | 'recv';

export interface Peer {
	transports: Map<TransportDriectionType, WebRtcTransport>;
	producers: Map<string, Producer>;
	consumer: Map<string, Consumer>;
}

export interface Room {
	router: Router;
	participants: Set<string>;
}

export type TransportOptions<TransportAppData extends AppData = AppData> = {
	id: string;
	iceParameters: IceParameters;
	iceCandidates: IceCandidate[];
	dtlsParameters: DtlsParameters;
	sctpParameters?: SctpParameters;
	iceServers?: RTCIceServer[];
	iceTransportPolicy?: RTCIceTransportPolicy;
	additionalSettings?: Partial<RTCConfiguration>;
	appData?: TransportAppData;
};

export type ConsumerParams<ConsumerAppData extends AppData = AppData> = {
	id: string;
	producerId: string;
	kind: MediaKind;
	rtpParameters: RtpParameters;
	streamId?: string;
	appData?: ConsumerAppData;
};
