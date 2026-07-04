const locks = new Map<unknown, Promise<unknown>>();

export const runWithLock = async <T>(resource: unknown, task: () => Promise<T>): Promise<T> => {
	const previousPromise = locks.get(resource) || Promise.resolve();
	const executeTask = async (): Promise<T> => {
		try {
			await previousPromise.catch(() => {});
			return await task();
		} finally {
			if (locks.get(resource) === currentPromise) {
				locks.delete(resource);
			}
		}
	};

	const currentPromise = executeTask();

	locks.set(resource, currentPromise);

	return currentPromise;
};

export const computeIfAbsent = async <K1, K2, V>(
	map: Map<K1, Map<K2, V>>,
	key1: K1,
	key2: K2,
	value: () => Promise<V> | V,
): Promise<Map<K2, V>> => {
	const existingInnerMap = map.get(key1);

	if (existingInnerMap?.has(key2)) {
		return existingInnerMap;
	}

	return await runWithLock(map, async () => {
		const innerMap = map.get(key1) ?? map.set(key1, new Map<K2, V>()).get(key1)!;

		if (!innerMap.has(key2)) {
			innerMap.set(key2, await value());
		}

		return innerMap;
	});
};
