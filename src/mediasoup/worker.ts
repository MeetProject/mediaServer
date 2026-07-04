import os from 'os';

import { createWorker } from 'mediasoup';
import { Worker } from 'mediasoup/types';
import { AppData } from 'mediasoup/types';

import { MEDIASOUP_CONFIG } from '@/constant/mediasoupConfig.js';

const workers = new Array<Worker<AppData>>();
let nextWorkerIndex = 0;

export const initWorker = async () => {
	for (let i = 0; i < os.cpus().length; i++) {
		const worker = await createWorker(MEDIASOUP_CONFIG.WORKER);
		worker.on('died', () => {
			process.exit(1);
		});

		workers.push(worker);
	}
};

export const getWorker = () => {
	if (workers.length === 0) {
		throw new Error('worker가 초기화되지 않았습니다.');
	}
	const worker = workers[nextWorkerIndex];
	nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
	return worker;
};

export const closeWorkers = () => {
	workers.forEach((worker) => worker.close());
	workers.length = 0;
};
