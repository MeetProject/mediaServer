import { StreamTrackType, TrackType } from '@/type/track.js';

export const getTrackType = (type: StreamTrackType): TrackType => {
	if (type.includes('audio')) {
		return 'audio';
	}
	return 'video';
};
