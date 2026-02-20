import { initClient } from './signaling/initClient.js';
import { initWorker } from './store/index.js';

const startServer = async () => {
	await initWorker();
	initClient();
};

startServer();
