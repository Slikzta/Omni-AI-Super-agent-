import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function LiveVoice() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mode, setMode] = useState<'continuous' | 'push'>('continuous');
  const [isPushing, setIsPushing] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are OmniAgent, a helpful and friendly AI assistant. You are currently in a live voice conversation. Be natural, concise, and engaging.",
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            startAudioCapture();
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              playAudio(base64Audio);
            }
            if (message.serverContent?.interrupted) {
              stopPlayback();
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            stopSession();
          }
        }
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsConnecting(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    stopAudioCapture();
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        // In push mode, only send if isPushing is true
        if (mode === 'push' && !isPushing) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        if (sessionRef.current) {
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("Microphone access error:", error);
    }
  };

  const stopAudioCapture = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const playAudio = (base64Data: string) => {
    setIsSpeaking(true);
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = audioCtx.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => setIsSpeaking(false);
    source.start();
  };

  const stopPlayback = () => {
    setIsSpeaking(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-1000",
          isActive ? (isSpeaking ? "bg-purple-500/20 scale-110" : "bg-indigo-500/10 scale-100") : "bg-zinc-900/20 scale-90"
        )} />
      </div>

      <div className="max-w-md w-full space-y-12 relative z-10 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live API 3.1</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">Neural Voice</h1>
          <p className="text-zinc-500 text-sm">Experience zero-latency natural conversations with OmniAgent.</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex">
            <button
              onClick={() => setMode('continuous')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                mode === 'continuous' ? "bg-zinc-800 text-white shadow-inner" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Continuous
            </button>
            <button
              onClick={() => setMode('push')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                mode === 'push' ? "bg-zinc-800 text-white shadow-inner" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Push-to-Talk
            </button>
          </div>
        </div>

        <div className="relative flex justify-center">
          <AnimatePresence mode="wait">
            {(isActive && (mode === 'continuous' || isPushing)) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                    }}
                    className="absolute w-40 h-40 rounded-full border border-purple-500/30"
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onMouseDown={() => mode === 'push' && setIsPushing(true)}
            onMouseUp={() => mode === 'push' && setIsPushing(false)}
            onMouseLeave={() => mode === 'push' && setIsPushing(false)}
            onTouchStart={() => mode === 'push' && setIsPushing(true)}
            onTouchEnd={() => mode === 'push' && setIsPushing(false)}
            onClick={() => mode === 'continuous' && (isActive ? stopSession() : startSession())}
            disabled={isConnecting}
            className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 relative z-20 shadow-2xl",
              isActive 
                ? (isPushing || mode === 'continuous' ? "bg-zinc-900 border-2 border-purple-500 text-purple-400" : "bg-zinc-900 border border-zinc-800 text-zinc-500")
                : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            )}
          >
            {isConnecting ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : isActive ? (
              <Mic className="w-10 h-10" />
            ) : (
              <MicOff className="w-10 h-10" />
            )}
          </button>
        </div>

        <div className="space-y-6">
          {mode === 'push' && !isActive && (
            <Button 
              onClick={startSession}
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-900"
            >
              Initialize Neural Link
            </Button>
          )}
          
          <p className={cn(
            "text-sm font-medium transition-colors duration-300",
            isActive ? "text-zinc-300" : "text-zinc-600"
          )}>
            {isConnecting ? "Establishing neural link..." : 
             isActive ? (
               mode === 'push' ? (isPushing ? "Listening..." : "Hold button to speak") :
               (isSpeaking ? "OmniAgent is speaking..." : "Listening for your voice...")
             ) : "Tap the mic to start conversation"}
          </p>
        </div>
      </div>
    </div>
  );
}
