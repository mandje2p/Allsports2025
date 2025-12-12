import React, { useState } from 'react';
import { X, Download, Share, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function InstallPWABanner() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, in standalone mode, or dismissed
  if (isInstalled || isStandalone || dismissed) {
    return null;
  }

  // Show iOS-specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl shadow-2xl border border-zinc-700/50 z-50 overflow-hidden">
        {/* Decorative gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        
        <div className="p-4 pt-5">
          {/* Header with close button */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2.5 shadow-lg">
                <Smartphone size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Install All Sports</h3>
                <p className="text-xs text-zinc-400">Get the full app experience</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* iOS Instructions */}
          <div className="bg-zinc-800/50 rounded-xl p-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20">
              <Share size={18} className="text-blue-400" />
            </div>
            <p className="text-sm text-zinc-300 flex-1">
              Tap the <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-zinc-700 rounded text-white text-xs font-medium"><Share size={12} className="mr-1" />Share</span> button, then select <span className="text-white font-medium">"Add to Home Screen"</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show install prompt for Android/Desktop
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl shadow-2xl border border-zinc-700/50 z-50 overflow-hidden">
      {/* Decorative gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
      
      <div className="p-4 pt-5">
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2.5 shadow-lg">
              <Download size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Install All Sports</h3>
              <p className="text-xs text-zinc-400">Quick access from your home screen</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Install button - full width for easy tapping */}
        <button
          onClick={promptInstall}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Install App
        </button>
        
        {/* Dismiss text link */}
        <button
          onClick={() => setDismissed(true)}
          className="w-full mt-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors py-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
