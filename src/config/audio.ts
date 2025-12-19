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
    // 默认音量 (0.0 到 1.0)
    defaultVolume: 0.35,
    // 淡入时长 (毫秒)
    fadeInDuration: 10000,
} as const;
