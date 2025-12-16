/**
 * Audio Configuration
 * 定义音频文件选项
 */

export interface AudioOption {
    id: string;
    name: string;
    path: string;
}

export const AUDIO_CONFIG = {
    options: [
        {
            id: 'none',
            name: 'No Music',
            path: '',
        },
        {
            id: 'all-i-want',
            name: 'All I Want for Christmas',
            path: '/audio/All-I-Want-for-Christmas-Is-You.mp3',
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
    ] as const, // removed AudioOption[] type assertion to let it infer tuple/readonly if needed, or stick to type

    defaultId: 'jingle-bells-classical',
} as const;
