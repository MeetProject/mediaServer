import { Client, IMessage, StompConfig, StompSubscription } from '@stomp/stompjs';
import { WebSocket } from 'ws';

export const stomp = (stompConfig?: StompConfig) => {
	const client = new Client({
		...stompConfig,
		brokerURL: undefined,
		webSocketFactory: () => new WebSocket('ws://localhost:8080/ws/websocket?userId=mediaServer'),
	});

	const subscription = new Map<string, StompSubscription>();

	const connect = () => {
		if (client.connected) {
			return;
		}
		client.activate();
	};

	const publish = <T>(destination: string, payload?: T) => {
		if (!client.connected) {
			return;
		}

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

	const disconnect = () => {
		if (!client.connected) {
			return;
		}

		subscription.forEach((sub) => sub.unsubscribe());
		subscription.clear();

		client.deactivate();
	};

	return { connect, disconnect, publish, subscribe };
};
