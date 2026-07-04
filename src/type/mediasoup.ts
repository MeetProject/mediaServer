import {
	Router,
	DtlsParameters,
	IceCandidate,
	IceParameters,
	SctpParameters,
	AppData,
	RtpParameters,
	MediaKind,
	AudioLevelObserver,
} from 'mediasoup/types';

export type TransportDirectionType = 'send' | 'recv';

export interface Room {
	router: Router;
	audioObserver: AudioLevelObserver;
	audioProducerIds: Set<string>;
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
