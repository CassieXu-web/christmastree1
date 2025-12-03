import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { GestureController } from './components/GestureController';
import { AppState, HandData } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.FORMED);
  const [handData, setHandData] = useState<HandData>({ isDetected: false, isOpen: false, position: {x:0, y:0} });

  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);
    
    // Logic: Open hand = Chaos, Closed hand = Form Tree
    if (data.isDetected) {
      if (data.isOpen) {
        setAppState(AppState.CHAOS);
      } else {
        setAppState(AppState.FORMED);
      }
    }
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMappingExposure: 1.5 }}>
        <Experience appState={appState} handData={handData} />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 pointer-events-none flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl text-amber-400 font-luxury tracking-widest uppercase text-center drop-shadow-[0_2px_10px_rgba(255,215,0,0.5)]">
          The Grand Tree
        </h1>
        <div className="mt-2 w-32 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        
        <div className="mt-8 text-center space-y-2">
           <p className={`text-xl font-body transition-colors duration-500 ${handData.isDetected ? 'text-green-400' : 'text-gray-500'}`}>
              {handData.isDetected ? 'Controller Active' : 'Waiting for Camera...'}
           </p>
           <p className="text-amber-100/70 text-sm font-sans max-w-md bg-black/50 p-4 rounded border border-amber-900/30 backdrop-blur-sm">
             Instructions:<br/>
             <span className="text-white font-bold">Open Hand:</span> Unleash Chaos<br/>
             <span className="text-white font-bold">Fist/Closed:</span> Form The Tree<br/>
             <span className="text-white font-bold">Move Hand:</span> Rotate View
           </p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute bottom-8 left-8 pointer-events-none">
        <div className="flex items-center gap-4">
             <div className={`w-3 h-3 rounded-full ${appState === AppState.FORMED ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
             <span className="text-amber-100 font-luxury text-xl tracking-widest">{appState} MODE</span>
        </div>
      </div>

      {/* Gesture Controller (Hidden/Small Video) */}
      <GestureController onHandUpdate={handleHandUpdate} />
    </div>
  );
}

export default App;