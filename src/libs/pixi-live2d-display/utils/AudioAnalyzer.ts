/**
 * Audio analyzer utility for lip sync animation
 */
export class AudioAnalyzer {
    private audioContext: AudioContext | null = null;
    private analyzer: AnalyserNode | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private dataArray: Uint8Array<ArrayBuffer> | null = null;
    private animationFrameId: number | null = null;
    private onVolumeChange: ((volume: number) => void) | null = null;

    /**
     * Initialize audio context and analyzer
     */
    private async initAudioContext(): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        }
    }

    /**
     * Start microphone audio capture
     */
    async startMicrophone(onVolumeChange: (volume: number) => void): Promise<void> {
        await this.initAudioContext();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaStreamSource = this.audioContext!.createMediaStreamSource(stream);
            this.mediaStreamSource.connect(this.analyzer!);
            this.onVolumeChange = onVolumeChange;
            this.startAnalysis();
        } catch (error) {
            throw new Error(`Failed to access microphone: ${error}`);
        }
    }

    /**
     * Play audio from base64 data and analyze volume
     */
    async playAndAnalyze(base64Audio: string, onVolumeChange: (volume: number) => void): Promise<void> {
        await this.initAudioContext();

        try {
            // Convert base64 to array buffer
            const binaryString = atob(base64Audio.split(',')[1] || base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Decode audio data
            const audioBuffer = await this.audioContext!.decodeAudioData(bytes.buffer.slice(0));
            
            // Create buffer source and connect to analyzer
            const source = this.audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.analyzer!);
            source.connect(this.audioContext!.destination);

            this.onVolumeChange = onVolumeChange;
            this.startAnalysis();

            // Play audio
            source.start(0);

            // Stop analysis when audio ends
            source.onended = () => {
                this.stopAnalysis();
                if (this.onVolumeChange) {
                    this.onVolumeChange(0);
                }
            };
        } catch (error) {
            throw new Error(`Failed to play audio: ${error}`);
        }
    }

    /**
     * Start real-time volume analysis
     */
    private startAnalysis(): void {
        if (!this.analyzer || !this.dataArray) return;

        const analyze = () => {
            this.analyzer!.getByteFrequencyData(this.dataArray!);
            
            // Calculate average volume
            let sum = 0;
            let averageVolume = 0;
            if (this.dataArray && this.dataArray.length > 0) {
                for (let i = 0; i < this.dataArray.length; i++) {
                    sum += this.dataArray[i]!;
                }
                averageVolume = sum / this.dataArray.length;
            }
            
            // Normalize to 0-1 range and reduce sensitivity
            const normalizedVolume = Math.min(1, averageVolume / 180); // Increased threshold from 128 to 180
            let smoothedVolume = Math.pow(normalizedVolume, 0.8); // Increased power from 0.5 to 0.8 for less sensitivity
            
            // Apply minimum threshold to filter background noise
            const minThreshold = 0.05;
            if (smoothedVolume < minThreshold) {
                smoothedVolume = 0;
            }

            if (this.onVolumeChange) {
                this.onVolumeChange(smoothedVolume);
            }

            this.animationFrameId = requestAnimationFrame(analyze);
        };

        analyze();
    }

    /**
     * Stop volume analysis
     */
    private stopAnalysis(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Stop microphone capture
     */
    stopMicrophone(): void {
        this.stopAnalysis();
        
        if (this.mediaStreamSource) {
            // Stop all tracks in the media stream
            const stream = (this.mediaStreamSource as any).mediaStream;
            if (stream && stream.getTracks) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }
        
        this.onVolumeChange = null;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.stopMicrophone();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyzer = null;
        this.dataArray = null;
    }
}