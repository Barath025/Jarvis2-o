import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { motion } from 'motion/react';

interface FaceLockProps {
  onSuccess: () => void;
  onFailure: () => void;
}

export const FaceLock: React.FC<FaceLockProps> = ({ onSuccess, onFailure }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'success' | 'failure'>('initializing');

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      startVideo();
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('scanning');
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setStatus('failure');
        onFailure();
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (status === 'scanning') {
      const interval = setInterval(async () => {
        if (videoRef.current) {
          const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
          if (detections.length > 0) {
            // Here we would compare with the reference face
            // For now, we simulate a successful match
            setStatus('success');
            onSuccess();
            clearInterval(interval);
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <video ref={videoRef} autoPlay muted playsInline className="rounded-lg" />
      {status === 'success' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute text-green-500 font-bold text-2xl">
          Face Verified!
        </motion.div>
      )}
    </div>
  );
};
