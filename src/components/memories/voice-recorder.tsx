"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Mic, RotateCcw } from "lucide-react";

export function VoiceRecorder({ onRecording }: { onRecording: (file: File | null) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const nextUrl = URL.createObjectURL(blob);
        setAudioUrl(nextUrl);
        onRecording(new File([blob], `linger-voice-${Date.now()}.webm`, { type: blob.type }));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was not granted. Check your browser permissions and try again.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function clearRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    onRecording(null);
  }

  return (
    <div className="stitch-border rounded-3xl bg-[var(--bluebell)]/20 p-5">
      <p className="label">Record inside Linger</p>
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button className="secondary-button" onClick={startRecording} type="button"><Mic size={18} /> Start recording</button>
        ) : (
          <button className="primary-button" onClick={stopRecording} type="button"><CircleStop size={18} /> Stop recording</button>
        )}
        {recording && <span className="recording-dot text-sm font-bold text-[var(--peony)]">Recording…</span>}
        {audioUrl && <button className="secondary-button" onClick={clearRecording} type="button"><RotateCcw size={17} /> Record again</button>}
      </div>
      {audioUrl && <audio className="mt-4 w-full" controls src={audioUrl} />}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <p className="mt-3 text-xs text-[var(--muted)]">Your browser will ask for microphone permission. The recording is uploaded only when you save the memory.</p>
    </div>
  );
}
