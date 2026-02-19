interface HandlerProps {
	subscribe: <T>(destination: string, callback: (response: T) => void | Promise<void>) => void;
	publish: <T>(destination: string, payload?: T | undefined) => void;
}

export const subscriptionHandler = ({ publish, subscribe }: HandlerProps) => {
	const handleCapabilities = () => {
		publish('/app/media/capabilities');
	};

	const handleDtls = () => {
		publish('/app/media/dtls');
	};

	const handleDtlsConnect = () => {
		publish('/app/media/connect');
	};

	const handleRts = () => {
		publish('/app/media/rtls');
	};

	const handleConsumerParams = () => {
		publish('/app/media/consumerParams');
	};

	const handleResume = () => {
		publish('/app/media/resume');
	};

	const onConnect = () => {
		subscribe('/user/media/capabilites', handleCapabilities);
		subscribe('/user/media/dtls', handleDtls);
		subscribe('/user/media/connect', handleDtlsConnect);
		subscribe('/user/media/rtls', handleRts);
		subscribe('/user/media/consumerParams', handleConsumerParams);
		subscribe('/user/media/resume', handleResume);
	};

	return { onConnect };
};
