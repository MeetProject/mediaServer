import { Consumer } from 'mediasoup/types';

interface RequestedPausedConsumer {
	consumer: Consumer;
	date: number;
}

export const audioMonitor = () => {
	const requestedPause = new Map<string, RequestedPausedConsumer>();

	const requestPause = (consumer: Consumer) => {
		const date = Date.now();
		requestedPause.set(consumer.id, { consumer, date });
	};

	setInterval(() => {
		const now = Date.now();
		requestedPause.forEach(({ consumer, date }) => {
			if (now - date > 2000) {
				consumer.pause();
				requestedPause.delete(consumer.id);
			}
		});
	}, 1000);

	return { requestPause };
};
