import os from 'os';

import { createWorker } from 'mediasoup';
import { Worker } from 'mediasoup/types';
import { AppData } from 'mediasoup/types';

const workers = new Array<Worker<AppData>>();
let nextWorkerIndex = 0;

export const initWorker = async () => {
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

export const getWorker = () => {
	if (workers.length === 0) {
		throw new Error();
	}
	const worker = workers[nextWorkerIndex];
	nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
	return worker;
};
