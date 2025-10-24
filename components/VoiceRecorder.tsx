import React, { useState, useRef, useCallback } from 'react';
import { MicIcon, StopIcon, RetakeIcon } from './Icon';
import { RecordingState } from '../types';

// Check for SpeechRecognition API
// FIX: Cast window to any to access non-standard browser APIs
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

interface VoiceRecorderProps {
    onTranscriptionComplete: (transcription: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
    const [transcript, setTranscript] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any | null>(null); 
    const finalTranscriptRef = useRef<string>('');

    const resetState = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setRecordingState(RecordingState.IDLE);
        setTranscript('');
        finalTranscriptRef.current = '';
        onTranscriptionComplete('');
        setError(null);
        mediaRecorderRef.current = null;
        recognitionRef.current = null;
    }, [onTranscriptionComplete]);

    const setupRecognition = () => {
        if (!isSpeechRecognitionSupported) {
            setError("Speech recognition is not supported in this browser.");
            return false;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(finalTranscriptRef.current + interimTranscript);
        };
        
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                setError(`Speech recognition error: ${event.error}`);
            }
        };

        recognitionRef.current = recognition;
        return true;
    };

    const startRecording = async () => {
        resetState();
        if (!setupRecognition()) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.start();
            recognitionRef.current.start();
            
            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
                setRecordingState(RecordingState.FINISHED);
                onTranscriptionComplete(finalTranscriptRef.current.trim());
            };

            setRecordingState(RecordingState.RECORDING);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please grant permission.");
            resetState();
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current && (mediaRecorderRef.current.state === "recording" || mediaRecorderRef.current.state === "paused")) {
            mediaRecorderRef.current.stop();
        }
    };

    return (
        <div className="w-full p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Narrate Your Timesheet
            </label>
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            
            <div className="flex items-center space-x-4">
                {recordingState === RecordingState.IDLE && (
                     <button onClick={startRecording} className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-900">
                        <MicIcon className="w-8 h-8"/>
                    </button>
                )}
                {(recordingState === RecordingState.RECORDING) && (
                    <button onClick={stopRecording} className="flex items-center justify-center w-16 h-16 bg-slate-700 hover:bg-slate-800 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-700 dark:focus:ring-offset-slate-900">
                        <StopIcon className="w-8 h-8"/>
                    </button>
                )}
                {recordingState === RecordingState.FINISHED && (
                    <button onClick={resetState} className="flex items-center justify-center w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900">
                        <RetakeIcon className="w-8 h-8"/>
                    </button>
                )}
                <div className="flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {recordingState === RecordingState.IDLE && "Click the mic to start recording your timesheet narration."}
                        {recordingState === RecordingState.RECORDING && <span className="text-red-500 animate-pulse">Recording... Click stop when done.</span>}
                        {recordingState === RecordingState.FINISHED && "Recording finished. You can retake if needed."}
                    </p>
                </div>
            </div>
            
            {transcript && (
                <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md max-h-40 overflow-y-auto">
                    <h4 className="text-sm font-semibold mb-1">Transcript Preview:</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{transcript}</p>
                </div>
            )}
        </div>
    );
};
