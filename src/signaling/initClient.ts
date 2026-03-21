import { subscriptionHandler } from './subscriptionHandler.js';
import { stomp } from '@/lib/stomp.js';

export const initClient = () => {
	const { client, connect, publish, subscribe, unsubscribeAll } = stomp();
	const { onConnect } = subscriptionHandler({ publish, subscribe });
	client.onConnect = () => {
		unsubscribeAll();
		onConnect();
		console.log('connect');
	};

	connect();
};
