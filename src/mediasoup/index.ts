import {
	AppData,
	Consumer,
	DtlsParameters,
	Producer,
	RtpCapabilities,
	RtpParameters,
	WebRtcTransport,
} from 'mediasoup/types';

import { audioMonitor } from './audioMonitor.js';
import { broadcast } from './broadcast.js';
import { getWorker } from './worker.js';
import { MEDIASOUP_CONFIG } from '@/constant/mediasoupConfig.js';
import { ConsumerParams, Room, TransportDirectionType, TransportOptions } from '@/type/mediasoup.js';
import { TrackType } from '@/type/track.js';
import { computeIfAbsent, runWithLock } from '@/util/map.js';

const MAX_SPEAKER = 5;

export const mediasoup = () => {
	const rooms = new Map<string, Room>();
	const transports = new Map<string, Map<TransportDirectionType, WebRtcTransport>>();

	const userProducer = new Map<string, Set<string>>();
	const userConsumer = new Map<string, Set<string>>();

	const producers = new Map<string, Producer>();
	const consumers = new Map<string, Consumer>();

	const { addResource, getConsumers, removeResource } = broadcast();
	const { requestPause } = audioMonitor();

	const createRoom = async (roomId: string) => {
		if (rooms.has(roomId)) {
			return;
		}

		const worker = getWorker();

		const router = await worker.createRouter(MEDIASOUP_CONFIG.ROUTER);

		const audioObserver = await router.createAudioLevelObserver({
			interval: 2000,
			maxEntries: 1,
			threshold: -45,
		});

		audioObserver.on('volumes', (volumes) => {
			const sortedVolume = volumes.sort((a, b) => b.volume - a.volume);
			sortedVolume.forEach((v, i) => {
				if (i < MAX_SPEAKER) {
					getConsumers(v.producer.id).forEach((id) => consumers.get(id)?.resume());
					return;
				}

				getConsumers(v.producer.id).forEach((id) => {
					const consumer = consumers.get(id);
					if (!consumer) {
						return;
					}

					requestPause(consumer);
				});
			});
		});

		rooms.set(roomId, { audioObserver, participants: new Set<string>(), router });
	};

	const cleanupUser = (userId: string) => {
		transports.get(userId)?.forEach((transport) => transport.close());
		transports.delete(userId);

		userConsumer.get(userId)?.forEach((id) => {
			consumers.get(id)?.close();
			consumers.delete(id);
		});

		userProducer.get(userId)?.forEach((id) => {
			producers.get(id)?.close();
			producers.delete(id);
		});

		userConsumer.delete(userId);
		userProducer.delete(userId);
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

		cleanupUser(userId);
		room.participants.add(userId);
		return room.router.rtpCapabilities;
	};

	const getTransportOption = async (roomId: string, userId: string, direction: TransportDirectionType) => {
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
		direction: TransportDirectionType,
		dtlsParameters: DtlsParameters,
	) => {
		const transport = transports.get(userId)?.get(direction);

		if (!transport) {
			return false;
		}

		await transport.connect({ dtlsParameters });
		return true;
	};

	const createProducer = async (
		userId: string,
		roomId: string,
		rtpParameter: RtpParameters,
		appData: AppData,
		kind: TrackType,
	) => {
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

			const observer = rooms.get(roomId)?.audioObserver;

			if (kind === 'audio' && observer) {
				observer.addProducer({ producerId: producer.id });
			}

			if (!userProducer.has(userId)) {
				userProducer.set(userId, new Set());
			}

			userProducer.get(userId)?.add(producer.id);
			producers.set(producer.id, producer);
			return producer.id;
		} catch {
			return null;
		}
	};

	const getConsumerParams = async (
		roomId: string,
		userId: string,
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

		const targetAppData = producers.get(producerId)?.appData ?? {};

		try {
			const consumer = await transport.consume({
				appData: targetAppData,
				paused: true,
				producerId,
				rtpCapabilities,
			});

			consumer.on('producerclose', () => {
				consumer.close();
				userConsumer.get(userId)?.delete(consumer.id);
				consumers.delete(consumer.id);
				removeResource(producerId, consumer.id);

				if (userConsumer.get(userId)?.size === 0) {
					userConsumer.delete(userId);
				}
			});

			consumer.on('transportclose', () => {
				consumer.close();
				userConsumer.get(userId)?.delete(consumer.id);
				consumers.delete(consumer.id);
				removeResource(producerId, consumer.id);

				if (userConsumer.get(userId)?.size === 0) {
					userConsumer.delete(userId);
				}
			});

			if (!userConsumer.has(userId)) {
				userConsumer.set(userId, new Set());
			}
			userConsumer.get(userId)?.add(consumer.id);

			consumers.set(consumer.id, consumer);

			addResource(producerId, consumer.id);

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

	const consumerResume = async (consumerId: string) => {
		const consumer = consumers.get(consumerId);

		if (!consumer) {
			return false;
		}

		await consumer.resume();
		return true;
	};

	const consumerPause = async (consumerId: string) => {
		const consumer = consumers.get(consumerId);

		if (!consumer) {
			return false;
		}

		await consumer.pause();
		return true;
	};

	const producerPause = (producerId: string) => {
		const producer = producers.get(producerId);

		if (!producer) {
			return false;
		}

		producer.pause();
		return true;
	};

	const producerResume = (producerId: string) => {
		const producer = producers?.get(producerId);

		if (!producer) {
			return false;
		}

		producer.resume();
		return true;
	};

	const producerRemove = (userId: string, producerId: string) => {
		const userProducers = userProducer.get(userId);
		const producer = producers.get(producerId);

		if (!producer || !userProducers) {
			return;
		}

		producer.close();

		producers.delete(producerId);
		userProducers.delete(producerId);

		if (userProducers.size === 0) {
			userProducer.delete(userId);
		}
	};

	const leave = (roomId: string, userId: string) => {
		const room = rooms.get(roomId);

		if (!room) {
			return false;
		}

		cleanupUser(userId);

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
		userProducer.clear();
		userConsumer.clear();
	};

	return {
		connectTransport,
		consumerPause,
		consumerResume,
		createProducer,
		createRoom,
		getCapabilities,
		getConsumerParams,
		getTransportOption,
		leave,
		producerPause,
		producerRemove,
		producerResume,
		reset,
	};
};
