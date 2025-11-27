import React, { useState } from 'react';
import { Settings, Upload, Camera, X, Wand2, RefreshCcw, Volume2, VolumeX } from 'lucide-react';
import { UIState } from '../types.ts';

interface ControlsProps {
  uiState: UIState;
}

export const Controls: React.FC<ControlsProps> = ({ uiState }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { config, updateConfig, addPhotos, photos, isExploded, toggleExplosion, isMuted, toggleMute } = uiState;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addPhotos(e.target.files);
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full pointer-events-none flex flex-col items-end z-10 p-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/20 transition-all text-white border border-white/20 mb-4 shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Settings size={24} />}
      </button>

      {/* Main Panel */}
      <div 
        className={`pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-80 text-white shadow-2xl transition-transform duration-300 ease-in-out transform origin-top-right overflow-y-auto max-h-[90vh] ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none hidden'
        }`}
      >
        <h2 className="text-2xl font-light mb-6 flex items-center gap-2">
          <Wand2 className="text-yellow-400" /> 
          <span>Controls</span>
        </h2>

        {/* Action Section */}
        <div className="mb-8 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Actions</p>
          
          <div className="flex gap-2">
            <button 
                onClick={toggleExplosion}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-300 ${
                isExploded 
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)]' 
                    : 'bg-green-600 hover:bg-green-500 shadow-[0_0_20px_rgba(22,163,74,0.5)]'
                }`}
            >
                {isExploded ? <RefreshCcw size={18} /> : <Camera size={18} />}
                {isExploded ? 'Rebuild' : 'Reveal'}
            </button>
            
            <button
                onClick={toggleMute}
                className={`p-3 rounded-xl transition-all duration-300 border border-white/20 hover:bg-white/10 ${isMuted ? 'text-red-400' : 'text-white'}`}
                title={isMuted ? "Unmute Music" : "Mute Music"}
            >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="mb-8 space-y-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Settings</p>
            
            <div className="space-y-2">
                <label className="text-sm text-gray-300 flex justify-between">
                    Tree Color
                    <span className="text-xs font-mono">{config.treeColor}</span>
                </label>
                <div className="flex gap-2">
                    {['#00ff00', '#ff0000', '#00ffff', '#ffff00', '#ff00ff'].map(c => (
                        <button
                            key={c}
                            onClick={() => updateConfig('treeColor', c)}
                            className={`w-6 h-6 rounded-full border-2 ${config.treeColor === c ? 'border-white scale-110' : 'border-transparent opacity-50'} transition-all`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm text-gray-300 flex justify-between">
                    Particle Count
                    <span className="text-xs font-mono">{config.particleCount}</span>
                </label>
                <input 
                    type="range" 
                    min="2500" 
                    max="20000" 
                    step="500"
                    value={config.particleCount}
                    onChange={(e) => updateConfig('particleCount', parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm text-gray-300 flex justify-between">
                    Rotation Speed
                    <span className="text-xs font-mono">{config.rotationSpeed}</span>
                </label>
                <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.1"
                    value={config.rotationSpeed}
                    onChange={(e) => updateConfig('rotationSpeed', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-300 flex justify-between">
                   Photo Scale
                    <span className="text-xs font-mono">{config.photoSize}</span>
                </label>
                <input 
                    type="range" 
                    min="0.5" 
                    max="3" 
                    step="0.1"
                    value={config.photoSize}
                    onChange={(e) => updateConfig('photoSize', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Memories ({photos.length})</p>
            
            <label className="cursor-pointer border-2 border-dashed border-white/20 hover:border-white/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-colors group">
                <Upload className="text-gray-400 group-hover:text-white transition-colors" />
                <span className="text-sm text-gray-400 group-hover:text-white text-center">Upload Photos<br/>(Select Multiple)</span>
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
                        <div key={p.id} className="aspect-square rounded overflow-hidden relative">
                            <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
