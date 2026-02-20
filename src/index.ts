import { initWorker } from './mediasoup/worker.js';
import { initClient } from './signaling/initClient.js';

const startServer = async () => {
	await initWorker();
	initClient();
};

startServer();
