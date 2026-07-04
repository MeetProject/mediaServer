import { Consumer } from 'mediasoup/types';

const PAUSE_DELAY_MS = 2000;
const CHECK_INTERVAL_MS = 1000;

interface RequestedPausedConsumer {
	consumer: Consumer;
	date: number;
}

export const audioMonitor = () => {
	const requestedPause = new Map<string, RequestedPausedConsumer>();

	const requestPause = (consumer: Consumer) => {
		if (requestedPause.has(consumer.id)) {
			return;
		}
		requestedPause.set(consumer.id, { consumer, date: Date.now() });
	};

	const cancelPause = (consumerId: string) => {
		requestedPause.delete(consumerId);
	};

	const clearPause = () => {
		requestedPause.clear();
	};

	setInterval(() => {
		const now = Date.now();
		requestedPause.forEach(({ consumer, date }) => {
			if (now - date <= PAUSE_DELAY_MS) {
				return;
			}

			requestedPause.delete(consumer.id);

			if (!consumer.closed) {
				consumer.pause().catch(() => {});
			}
		});
	}, CHECK_INTERVAL_MS);

	return { cancelPause, clearPause, requestPause };
};
