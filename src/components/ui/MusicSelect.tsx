import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Music } from 'lucide-react';
import { AudioOption } from '../../config/audio';

interface MusicSelectProps {
    options: readonly AudioOption[];
    value: string;
    onChange: (value: string) => void;
}

export const MusicSelect: React.FC<MusicSelectProps> = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between
                    px-4 py-3
                    cursor-pointer transition-all duration-300
                    bg-[rgba(0,0,0,0.3)]
                    border border-[rgba(255,255,255,0.1)]
                    backdrop-blur-[10px]
                    rounded-[12px]
                    group
                    hover:bg-[rgba(0,0,0,0.4)]
                    hover:border-[rgba(255,255,255,0.2)]
                    ${isOpen ? 'border-electric-purple ring-1 ring-electric-purple/50' : ''}
                `}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`
                        p-1.5 rounded-full bg-white/5 
                        group-hover:bg-electric-purple/20 group-hover:text-electric-purple
                        transition-colors duration-300
                    `}>
                        <Music size={14} className="text-white/70 group-hover:text-electric-purple" />
                    </div>
                    <span className="text-white text-sm font-medium truncate">
                        {selectedOption?.name || 'Select Music'}
                    </span>
                </div>

                <ChevronDown
                    size={16}
                    className={`
                        text-white/50 transition-transform duration-300
                        ${isOpen ? 'rotate-180 text-electric-purple' : 'group-hover:text-white/80'}
                    `}
                />
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <div className="
                    absolute left-0 right-0 top-[calc(100%+8px)]
                    z-50
                    bg-[#0f111a]/95
                    backdrop-blur-xl
                    border border-white/10
                    rounded-[12px]
                    shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]
                    overflow-hidden
                    animate-in fade-in zoom-in-95 duration-200
                ">
                    <ul className="py-1 max-h-[240px] overflow-y-auto custom-scrollbar" role="listbox">
                        {options.map((option) => {
                            const isSelected = option.id === value;
                            return (
                                <li
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`
                                        relative px-4 py-3
                                        flex items-center justify-between
                                        cursor-pointer
                                        text-sm
                                        transition-all duration-200
                                        border-l-2
                                        ${isSelected
                                            ? 'bg-white/10 text-white border-electric-purple'
                                            : 'text-white/70 border-transparent hover:bg-white/5 hover:text-[#D4AF37] hover:border-[#D4AF37]/50'
                                        }
                                    `}
                                >
                                    <span className="truncate pr-4">{option.name}</span>
                                    {isSelected && (
                                        <Check size={14} className="text-electric-purple shrink-0" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
