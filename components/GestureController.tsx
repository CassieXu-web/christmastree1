import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { HandData } from '../types';

interface GestureControllerProps {
  onHandUpdate: (data: HandData) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setLoaded(true);
        startCamera();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    init();
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictWebcam);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.currentTime > 0 && video.videoWidth > 0) {
      // Detect
      const result = handLandmarkerRef.current.detectForVideo(video, performance.now());
      
      // Draw debug
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      
      let handData: HandData = {
        isOpen: false,
        position: { x: 0, y: 0 },
        isDetected: false
      };

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        handData.isDetected = true;

        // Calculate gesture (Open vs Closed)
        // Check distance between thumb tip (4) and index finger tip (8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) + 
          Math.pow(thumbTip.y - indexTip.y, 2)
        );

        // Threshold for pinch/fist vs open
        handData.isOpen = distance > 0.15; 

        // Calculate Position (Center of palm roughly 0 or 9)
        // MediaPipe x is 0 (left) to 1 (right). we want -1 to 1.
        // Also invert X because webcam is mirrored usually
        handData.position = {
          x: (0.5 - landmarks[9].x) * 2, // Inverted X
          y: (0.5 - landmarks[9].y) * 2
        };
        
        // Simple Debug Drawing
        if (ctx) {
           const drawingUtils = new DrawingUtils(ctx);
           drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        }
      }

      onHandUpdate(handData);
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed bottom-4 right-4 w-32 h-24 border-2 border-amber-500/50 rounded-lg overflow-hidden bg-black/80 z-50 shadow-[0_0_15px_rgba(255,215,0,0.3)]">
      {!loaded && <div className="absolute inset-0 flex items-center justify-center text-amber-500 text-xs">Loading AI...</div>}
      <video ref={videoRef} autoPlay playsInline muted className="absolute opacity-0 w-full h-full" />
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover transform -scale-x-100" />
    </div>
  );
};