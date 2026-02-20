const pendingQueue = new Map<unknown, Set<string>>();

const computeIfAbsentInternal = async <K1, K2, V>(
	map: Map<K1, Map<K2, V>>,
	key1: K1,
	key2: K2,
	value: () => Promise<V> | V,
): Promise<Map<K2, V>> => {
	if (!map.has(key1)) {
		map.set(key1, new Map<K2, V>());
	}

	const innerMap = map.get(key1)!;

	if (innerMap.has(key2)) {
		return innerMap;
	}

	const innerValue = await value();
	innerMap.set(key2, innerValue);

	return innerMap;
};

export const computeIfAbsent = async <K1, K2, V>(
	map: Map<K1, Map<K2, V>>,
	key1: K1,
	key2: K2,
	value: () => Promise<V> | V,
): Promise<Map<K2, V>> => {
	if (!pendingQueue.has(map)) {
		pendingQueue.set(map, new Set<string>());
	}

	const queue = pendingQueue.get(map)!;
	const taskId = crypto.randomUUID();
	queue.add(taskId);

	try {
		while (queue.values().next().value !== taskId) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return await computeIfAbsentInternal(map, key1, key2, value);
	} finally {
		queue.delete(taskId);
		if (queue.size === 0) {
			pendingQueue.delete(map);
		}
	}
};
