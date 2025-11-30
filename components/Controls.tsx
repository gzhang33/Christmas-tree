import React, { useState } from 'react';
import { Settings, Upload, Camera, X, Wand2, RefreshCcw, Volume2, VolumeX } from 'lucide-react';
import { UIState } from '../types.ts';

interface ControlsProps {
  uiState: UIState;
}

export const Controls: React.FC<ControlsProps> = ({ uiState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { config, updateConfig, addPhotos, photos, isExploded, toggleExplosion, isMuted, toggleMute } = uiState;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addPhotos(e.target.files);
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full pointer-events-none flex flex-col items-end z-10 p-4 sm:p-6 gap-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close controls panel' : 'Open controls panel'}
        className="pointer-events-auto bg-white/20 backdrop-blur-xl p-2 rounded-full border border-white/30 shadow-[0_15px_35px_rgba(5,5,15,0.55)] hover:shadow-[0_20px_45px_rgba(5,5,15,0.65)] hover:bg-white/25 transition-all text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {isOpen ? <X size={24} /> : <Settings size={24} />}
      </button>

      {/* Main Panel */}
      <div
        className={`pointer-events-auto relative rounded-3xl border border-white/20 bg-gradient-to-b from-white/20 via-white/5 to-white/0 backdrop-blur-2xl p-6 w-80 text-white shadow-[0_25px_70px_rgba(0,0,0,0.65)] transition-all duration-300 ease-out origin-top-right overflow-y-auto max-h-[90vh] ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 translate-y-2'
          }`}
      >
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" aria-hidden />
        <div className="absolute inset-x-8 top-6 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-70" aria-hidden />

        <div className="relative z-10">
          <h2 className="text-2xl font-light mb-6 flex items-center gap-2 tracking-[0.4em] uppercase text-white/90">
            <Wand2 className="text-yellow-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.8)]" />
            <span>Controls</span>
          </h2>

          {/* Action Section */}
          <div className="mb-8 space-y-4">
            <p className="text-[0.65rem] text-white/60 uppercase tracking-[0.6em] font-bold">Actions</p>

            <div className="flex gap-3">
              <button
                onClick={toggleExplosion}
                className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold uppercase tracking-widest text-[0.7rem] transition-all duration-300 shadow-[0_15px_35px_rgba(0,0,0,0.45)] ${isExploded
                  ? 'bg-gradient-to-r from-blue-400 via-violet-500 to-purple-600 hover:shadow-[0_20px_45px_rgba(59,7,100,0.65)]'
                  : 'bg-gradient-to-r from-amber-300 via-rose-400 to-fuchsia-500 hover:shadow-[0_20px_45px_rgba(150,30,90,0.65)]'
                  }`}
              >
                {isExploded ? <RefreshCcw size={18} /> : <Camera size={18} />}
                {isExploded ? 'Rebuild' : 'Reveal'}
              </button>

              <button
                onClick={toggleMute}
                className={`p-3 rounded-2xl border border-white/25 transition-all duration-300 hover:border-white/60 hover:bg-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.45)] ${isMuted ? 'text-rose-300' : 'text-white'}`}
                title={isMuted ? "Unmute Music" : "Mute Music"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="mb-8 space-y-6">
            <p className="text-[0.65rem] text-white/60 uppercase tracking-[0.6em] font-bold">Settings</p>

            <div className="space-y-3">
              <label className="text-sm text-white/80 flex justify-between">
                Tree Color
                <span className="text-xs font-mono text-white/60">{config.treeColor}</span>
              </label>
              <div className="flex gap-3">
                {['#FFC0CB', '#00ff00', '#ff0000', '#00ffff', '#ffff00', '#ff00ff'].map(c => (
                  <button
                    key={c}
                    onClick={() => updateConfig('treeColor', c)}
                    className={`w-7 h-7 rounded-full border ${config.treeColor === c ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.55)] scale-110' : 'border-transparent opacity-60 hover:opacity-90'} transition-all`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-white/80 flex justify-between">
                Particle Count
                <span className="text-xs font-mono text-white/60">{config.particleCount}</span>
              </label>
              <input
                type="range"
                min="2500"
                max="40000"
                step="1000"
                value={config.particleCount}
                onChange={(e) => updateConfig('particleCount', parseInt(e.target.value))}
                className="royal-slider w-full cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm text-white/80 flex justify-between">
                Rotation Speed
                <span className="text-xs font-mono text-white/60">{config.rotationSpeed}</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={config.rotationSpeed}
                onChange={(e) => updateConfig('rotationSpeed', parseFloat(e.target.value))}
                className="royal-slider w-full cursor-pointer"
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm text-white/80 flex justify-between">
                Photo Scale
                <span className="text-xs font-mono text-white/60">{config.photoSize}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={config.photoSize}
                onChange={(e) => updateConfig('photoSize', parseFloat(e.target.value))}
                className="royal-slider w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] text-white/60 uppercase tracking-[0.6em] font-bold">
                Memories ({photos.length})
              </p>
              <span className="text-[0.65rem] text-white/40 uppercase tracking-[0.4em]">Starlit Keepsakes</span>
            </div>

            <label className="cursor-pointer border border-white/20 bg-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all group hover:border-white/40 hover:bg-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.45)] relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_rgba(255,255,255,0.25)_0%,_transparent_60%)] group-hover:opacity-40 transition-opacity" aria-hidden />
              <Upload className="text-gray-200 group-hover:text-white transition-colors relative z-10" />
              <span className="text-xs text-gray-200 group-hover:text-white text-center uppercase tracking-[0.4em] relative z-10">
                Upload Photos
              </span>
              <p className="text-[0.65rem] text-gray-300/70 text-center relative z-10">Support multiple files</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                {photos.map((p) => (
                  <div key={p.id} className="aspect-square rounded-lg overflow-hidden relative ring-1 ring-white/20">
                    <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
