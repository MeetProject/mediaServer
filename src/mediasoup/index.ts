import os from 'os';

import { createWorker } from 'mediasoup';
import { AppData, DtlsParameters, MediaKind, RtpCapabilities, RtpParameters, Worker } from 'mediasoup/types';

import { config } from '@/lib/mediasoup.js';
import { ConsumerParams, Peer, Room, TransportDriectionType, TransportOptions } from '@/type/mediasoup.js';

export const mediasoup = () => {
	const workers = new Array<Worker<AppData>>();
	const rooms = new Map<string, Room>();
	let nextWorkerIndex = 0;

	const initWorker = async () => {
		for (let i = 0; i < os.cpus().length; i++) {
			const worker = await createWorker({
				logLevel: 'warn',
				rtcMaxPort: 10000 + i * 100 + 99,
				rtcMinPort: 10000 + i * 100,
			});
			worker.on('died', () => {
				process.exit(1);
			});

			workers.push(worker);
		}
	};

	const createRoom = async (roomId: string) => {
		if (rooms.has(roomId)) {
			return;
		}

		if (workers.length === 0) {
			await initWorker();
		}

		const worker = workers[nextWorkerIndex];
		nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;

		const router = await worker.createRouter(config.mediasoup.router);
		rooms.set(roomId, { participants: new Map<string, Peer>(), router });
	};

	const getCapabilities = (roomId: string) => {
		const room = rooms.get(roomId);
		if (!room) {
			return null;
		}

		return room.router.rtpCapabilities;
	};

	const getTransportOption = async (roomId: string, userId: string, direction: TransportDriectionType) => {
		const room = rooms.get(roomId);
		if (!room) {
			return null;
		}

		const user = room.participants.get(userId);

		if (!user) {
			room.participants.set(userId, { consumer: new Map(), producers: new Map(), transports: new Map() });
		}

		if (!user?.transports.get(direction)) {
			const transport = await room.router.createWebRtcTransport(config.mediasoup.webRtcTransport);
			user?.transports.set(direction, transport);
		}

		const transport = user?.transports.get(direction);

		if (!transport) {
			throw new Error();
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
		roomId: string,
		userId: string,
		direction: TransportDriectionType,
		dtlsParameters: DtlsParameters,
	) => {
		const transport = rooms.get(roomId)?.participants.get(userId)?.transports.get(direction);

		if (!transport) {
			return false;
		}

		await transport.connect({ dtlsParameters });
		return true;
	};

	const createProducer = async (
		roomId: string,
		userId: string,
		rtpParameter: RtpParameters,
		appData: AppData,
		kind: MediaKind,
	) => {
		const user = rooms.get(roomId)?.participants.get(userId);
		if (!user) {
			return null;
		}

		const transport = user.transports.get('send');

		if (!transport) {
			return null;
		}

		try {
			const producer = await transport.produce({
				appData,
				kind,
				rtpParameters: rtpParameter,
			});

			user.producers.set(producer.id, producer);
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
		const room = rooms.get(roomId);
		if (!room) {
			return null;
		}

		const user = room.participants.get(userId);
		if (!user) {
			return null;
		}

		const transport = user.transports.get('recv');

		if (!transport || !room.router.canConsume({ producerId, rtpCapabilities })) {
			return null;
		}

		const consumer = await transport.consume({
			paused: true,
			producerId,
			rtpCapabilities,
		});

		consumer.on('producerclose', () => {
			consumer.close();
			user.consumer.delete(consumer.id);
		});

		consumer.on('transportclose', () => {
			consumer.close();
		});

		user.consumer.set(consumer.id, consumer);

		const { appData, id, kind, producerId: pid, rtpParameters } = consumer;

		const options = {
			appData,
			id,
			kind,
			producerId: pid,
			rtpParameters,
		} as ConsumerParams;

		return options;
	};

	const resume = async (roomId: string, userId: string, consumerId: string) => {
		const consumer = rooms.get(roomId)?.participants.get(userId)?.consumer.get(consumerId);

		if (!consumer) {
			return false;
		}

		await consumer.resume();
		return true;
	};

	const leave = (roomId: string, userId: string) => {
		const room = rooms.get(roomId);

		if (!room) {
			return false;
		}

		const user = room.participants.get(userId);
		if (!user) {
			return false;
		}

		user.transports.forEach((transport) => transport.close());
		room.participants.delete(userId);

		if (room.participants.size === 0) {
			room.router.close();
			rooms.delete(roomId);
		}

		return true;
	};

	return {
		connectTransport,
		createProducer,
		createRoom,
		getCapabilities,
		getConsumerParams,
		getTransportOption,
		leave,
		resume,
	};
};
