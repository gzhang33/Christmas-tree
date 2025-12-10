/**
 * Audio Configuration
 * 定义音频文件选项
 */

export interface AudioOption {
    id: string;
    name: string;
    path: string;
}

export const AUDIO_OPTIONS: AudioOption[] = [
    {
        id: 'none',
        name: 'No Music',
        path: '',
    },
    {
        id: 'all-i-want',
        name: 'All I Want for Christmas',
        path: '/All-I-Want-for-Christmas-Is-You.flac',
    },
    {
        id: 'jingle-bells',
        name: 'Jingle Bells',
        path: '/audio/JingleBells.mp3',
    },
    {
        id: 'jingle-bells-child',
        name: 'Jingle Bells (Child)',
        path: '/audio/child-Jingle-Bells.mp3',
    },
    {
        id: 'jingle-bells-classical',
        name: 'Jingle Bells (Classical)',
        path: '/audio/classical-Jingle-Bells.mp3',
    },
] as const;

export const DEFAULT_AUDIO_ID = 'all-i-want';
