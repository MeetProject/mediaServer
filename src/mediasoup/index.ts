import {
	AppData,
	Consumer,
	DtlsParameters,
	Producer,
	RtpCapabilities,
	RtpParameters,
	WebRtcTransport,
} from 'mediasoup/types';

import { getWorker } from './worker.js';
import { MEDIASOUP_CONFIG } from '@/constant/mediasoupConfig.js';
import { ConsumerParams, Room, TransportDriectionType, TransportOptions } from '@/type/mediasoup.js';
import { TrackType } from '@/type/track.js';
import { computeIfAbsent, runWithLock } from '@/util/map.js';

export const mediasoup = () => {
	const rooms = new Map<string, Room>();
	const transports = new Map<string, Map<TransportDriectionType, WebRtcTransport>>();
	const producers = new Map<string, Map<string, Producer>>();
	const consumers = new Map<string, Map<string, Consumer>>();

	const createRoom = async (roomId: string) => {
		if (rooms.has(roomId)) {
			return;
		}

		const worker = getWorker();

		const router = await worker.createRouter(MEDIASOUP_CONFIG.ROUTER);
		rooms.set(roomId, { participants: new Set<string>(), router });
	};

	const getCapabilities = async (roomId: string, userId: string) => {
		const room = await runWithLock(rooms, async () => {
			if (!rooms.has(roomId)) {
				await createRoom(roomId);
			}
			return rooms.get(roomId);
		});

		if (!room) {
			return null;
		}
		room.participants.add(userId);
		return room.router.rtpCapabilities;
	};

	const getTransportOption = async (roomId: string, userId: string, direction: TransportDriectionType) => {
		const router = rooms.get(roomId)?.router;
		if (!router) {
			return null;
		}

		const transportMap = await computeIfAbsent(
			transports,
			userId,
			direction,
			async () => await router.createWebRtcTransport(MEDIASOUP_CONFIG.WEBRTC_TRANSPORT),
		);

		const transport = transportMap.get(direction);

		if (!transport) {
			return null;
		}

		const { appData, dtlsParameters, iceCandidates, iceParameters, id, sctpParameters } = transport;
		const options = {
			appData,
			direction,
			dtlsParameters,
			iceCandidates,
			iceParameters,
			id,
			sctpParameters,
		} as TransportOptions;

		return options;
	};

	const connectTransport = async (
		userId: string,
		direction: TransportDriectionType,
		dtlsParameters: DtlsParameters,
	) => {
		const transport = transports.get(userId)?.get(direction);

		if (!transport) {
			return false;
		}

		await transport.connect({ dtlsParameters });
		return true;
	};

	const createProducer = async (userId: string, rtpParameter: RtpParameters, appData: AppData, kind: TrackType) => {
		const transport = transports.get(userId)?.get('send');

		if (!transport) {
			return null;
		}

		try {
			const producer = await transport.produce({
				appData,
				kind,
				rtpParameters: rtpParameter,
			});

			await computeIfAbsent(producers, userId, producer.id, () => producer);
			return producer.id;
		} catch {
			return null;
		}
	};

	const getConsumerParams = async (
		roomId: string,
		userId: string,
		targetId: string,
		producerId: string,
		rtpCapabilities: RtpCapabilities,
	) => {
		const router = rooms.get(roomId)?.router;
		if (!router) {
			return null;
		}

		const transport = transports.get(userId)?.get('recv');

		if (!transport || !router.canConsume({ producerId, rtpCapabilities })) {
			return null;
		}

		const targetAppData = producers.get(targetId)?.get(producerId)?.appData ?? {};

		try {
			const consumer = await transport.consume({
				appData: targetAppData,
				paused: true,
				producerId,
				rtpCapabilities,
			});

			consumer.on('producerclose', () => {
				consumer.close();
				consumers.get(userId)?.delete(consumer.id);
			});

			consumer.on('transportclose', () => {
				consumer.close();
				consumers.get(userId)?.delete(consumer.id);
			});

			await computeIfAbsent(consumers, userId, consumer.id, () => consumer);
			const { appData, id, kind, producerId: pid, rtpParameters } = consumer;

			return {
				appData,
				id,
				kind,
				producerId: pid,
				rtpParameters,
			} as ConsumerParams;
		} catch {
			return null;
		}
	};

	const resume = async (userId: string, consumerId: string) => {
		const consumer = consumers.get(userId)?.get(consumerId);

		if (!consumer) {
			return false;
		}

		await consumer.resume();
		return true;
	};

	const producerPause = (userId: string, producerId: string) => {
		const producer = producers.get(userId)?.get(producerId);

		if (!producer) {
			return false;
		}

		producer.pause();
		return true;
	};

	const producerResume = (userId: string, producerId: string) => {
		const producer = producers.get(userId)?.get(producerId);

		if (!producer) {
			return false;
		}

		producer.resume();
		return true;
	};

	const leave = (roomId: string, userId: string) => {
		const room = rooms.get(roomId);

		if (!room) {
			return false;
		}

		transports.get(userId)?.forEach((transport) => transport.close());
		transports.delete(userId);

		consumers.get(userId)?.forEach((consumer) => consumer.close());
		consumers.delete(userId);

		producers.get(userId)?.forEach((producers) => producers.close());
		producers.delete(userId);

		room.participants.delete(userId);

		if (room.participants.size === 0) {
			room.router.close();
			rooms.delete(roomId);
		}

		return true;
	};

	const reset = () => {
		rooms.forEach((r) => r.router.close());
		rooms.clear();
		transports.clear();
		producers.clear();
		consumers.clear();
	};

	return {
		connectTransport,
		createProducer,
		createRoom,
		getCapabilities,
		getConsumerParams,
		getTransportOption,
		leave,
		producerPause,
		producerResume,
		reset,
		resume,
	};
};
