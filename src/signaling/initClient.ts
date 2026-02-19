import { subscriptionHandler } from './subscriptionHandler.js';
import { stomp } from '@/lib/stomp.js';

export const initClient = () => {
	const { connect, publish, subscribe } = stomp({
		onConnect: () => {
			const { onConnect } = subscriptionHandler({ publish, subscribe });
			onConnect();
			console.log('connected');
		},
	});

	connect();
};
