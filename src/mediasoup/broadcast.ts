export const broadcast = () => {
	const resource = new Map<string, Set<string>>(); //producerId, consumerId

	const addResource = (producerId: string, consumerId: string) => {
		const producerResource = resource.get(producerId);

		if (!producerResource) {
			resource.set(producerId, new Set());
		}

		resource.get(producerId)?.add(consumerId);
	};

	const removeResource = (producerId: string, consumerId: string) => {
		resource.get(producerId)?.delete(consumerId);

		if (resource.get(producerId)?.size === 0) {
			resource.delete(producerId);
		}
	};

	const getConsumers = (producerId: string) => {
		return [...(resource.get(producerId) ?? [])];
	};

	const clearResource = () => {
		resource.clear();
	};

	return { addResource, clearResource, getConsumers, removeResource };
};
