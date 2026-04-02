export type RequestStatus = 'pending' | 'completed';

export interface MusicRequest {
  id: string;
  requesterName: string;
  targetMusicName: string;
  targetArtist: string;
  targetAlbum?: string;
  status: RequestStatus;
}

export const mockMusicRequests: MusicRequest[] = [
  {
    id: 'req-1',
    requesterName: 'Alice Smith',
    targetMusicName: 'Blinding Lights',
    targetArtist: 'The Weeknd',
    targetAlbum: 'After Hours',
    status: 'pending',
  },
  {
    id: 'req-2',
    requesterName: 'Bob Johnson',
    targetMusicName: 'Shape of You',
    targetArtist: 'Ed Sheeran',
    status: 'pending',
  },
  {
    id: 'req-3',
    requesterName: 'Charlie Brown',
    targetMusicName: 'Levitating',
    targetArtist: 'Dua Lipa',
    targetAlbum: 'Future Nostalgia',
    status: 'completed',
  },
];
