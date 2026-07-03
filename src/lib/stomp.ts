import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { WebSocket } from 'ws';

const SIGNAL_SERVER_URL = process.env.SIGNAL_SERVER_URL || 'ws://localhost:8080/ws/websocket';
const MEDIA_SERVER_ID = process.env.MEDIA_SERVER_ID || 'mediaServer';
const MEDIA_SERVER_TOKEN = process.env.MEDIA_SERVER_TOKEN || 'local-media-server-token';

export const stomp = () => {
	const client = new Client({
		brokerURL: undefined,
		webSocketFactory: () =>
			new WebSocket(
				`${SIGNAL_SERVER_URL}?userId=${encodeURIComponent(MEDIA_SERVER_ID)}&token=${encodeURIComponent(MEDIA_SERVER_TOKEN)}`,
			),
	});

	const subscription = new Map<string, StompSubscription>();

	const publish = <T>(destination: string, payload?: T) => {
		client.publish({
			body: JSON.stringify(payload),
			destination,
			headers: { 'content-type': 'application/json' },
		});
	};

	const subscribe = <T>(destination: string, callback: (response: T) => Promise<void> | void) => {
		if (subscription.has(destination)) {
			return;
		}

		const sub = client.subscribe(destination, async (message: IMessage) => {
			const data = JSON.parse(message.body) as T;
			await callback(data);
		});

		subscription.set(destination, sub);
	};

	const connect = () => {
		if (client.connected) {
			return;
		}

		client.activate();
	};

	const unsubscribeAll = () => {
		subscription.forEach((sub) => sub.unsubscribe());
		subscription.clear();
	};

	const disconnect = () => {
		if (!client.connected) {
			return;
		}

		subscription.forEach((sub) => sub.unsubscribe());
		subscription.clear();

		client.deactivate();
	};

	return { client, connect, disconnect, publish, subscribe, unsubscribeAll };
};
