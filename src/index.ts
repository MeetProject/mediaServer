import { closeWorkers, initWorker } from './mediasoup/worker.js';
import { initClient } from './signaling/initClient.js';

const startServer = async () => {
	await initWorker();
	initClient();
};

const shutdown = () => {
	closeWorkers();
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
