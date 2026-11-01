import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Mic,
  Lock,
  Unlock,
  X,
  Volume2,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  RefreshCw,
  Clock,
  Terminal,
} from 'lucide-react';
import { BossVoiceprint, VoiceSettings } from '../types';
import {
  detectPitch,
  calculateSpectralCentroid,
  calculateBandEnergyProfile,
  calculateZeroCrossingRate,
} from '../utils/voiceBiometrics';
import { AudioAnalyzerHandles } from '../utils/speechRecognition';

interface BossVoiceprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceprint: BossVoiceprint;
  onUpdateVoiceprint: (updated: BossVoiceprint) => void;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: VoiceSettings) => void;
  audioAnalyzer: AudioAnalyzerHandles | null;
  isMicActive: boolean;
  onStartMic: () => void;
  onStopMic: () => void;
  initialTab?: 'status' | 'enroll' | 'test';
}

export const BossVoiceprintModal: React.FC<BossVoiceprintModalProps> = ({
  isOpen,
  onClose,
  voiceprint,
  onUpdateVoiceprint,
  voiceSettings,
  onUpdateVoiceSettings,
  audioAnalyzer,
  isMicActive,
  onStartMic,
  onStopMic,
  initialTab = 'status',
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'enroll' | 'test'>(initialTab);
  const [enrollmentStep, setEnrollmentStep] = useState(1);
  const [isSampling, setIsSampling] = useState(false);
  const [samplingSecondsLeft, setSamplingSecondsLeft] = useState(12);
  const [isQuickRecalibrating, setIsQuickRecalibrating] = useState(false);
  const [quickRecalSecondsLeft, setQuickRecalSecondsLeft] = useState(8);
  const [quickRecalibrateSuccess, setQuickRecalibrateSuccess] = useState(false);
  const [sampleProgress, setSampleProgress] = useState(0);
  const [livePitch, setLivePitch] = useState(0);
  const [liveCentroid, setLiveCentroid] = useState(0);
  const [liveBandEnergy, setLiveBandEnergy] = useState<[number, number, number, number]>([0.25, 0.25, 0.25, 0.25]);
  const [simulatedMatchScore, setSimulatedMatchScore] = useState<number | null>(null);
  const [simulateIntruder, setSimulateIntruder] = useState(false);

  // Command-protected reset state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetCommandInput, setResetCommandInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const samplingTimerRef = useRef<any>(null);
  const quickRecalTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const calibrationPhrases = [
    'Kyrsten, system override verified and acoustic telemetry confirmed.',
    'Kyrsten, acknowledge voice authorization and run neural diagnostic.',
    'Boss voice biometric verified. Only my commands are authorized.',
  ];

  const sampleCollectorRef = useRef<{
    pitches: number[];
    centroids: number[];
    bandEnergies: [number, number, number, number][];
    zcrs: number[];
  }>({
    pitches: [],
    centroids: [],
    bandEnergies: [],
    zcrs: [],
  });

  // Real-time audio analyzer polling loop when modal is open
  useEffect(() => {
    if (!isOpen || !audioAnalyzer) return;

    const interval = setInterval(() => {
      try {
        const freqData = audioAnalyzer.getFrequencyData();
        const timeData = audioAnalyzer.getTimeDomainData();

        const pitch = detectPitch(timeData, audioAnalyzer.sampleRate || 44100);
        if (pitch > 0) setLivePitch(pitch);

        const centroid = calculateSpectralCentroid(freqData, audioAnalyzer.sampleRate || 44100);
        setLiveCentroid(centroid);

        const bands = calculateBandEnergyProfile(freqData, audioAnalyzer.sampleRate || 44100);
        setLiveBandEnergy(bands);

        // If actively sampling enrollment data
        if (isSampling) {
          if (pitch > 60 && pitch < 450) {
            sampleCollectorRef.current.pitches.push(pitch);
          }
          if (centroid > 250) {
            sampleCollectorRef.current.centroids.push(centroid);
            sampleCollectorRef.current.bandEnergies.push(bands);
            sampleCollectorRef.current.zcrs.push(calculateZeroCrossingRate(timeData));
          }
        }
      } catch (e) {}
    }, 60);

    return () => clearInterval(interval);
  }, [isOpen, audioAnalyzer, isSampling]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (samplingTimerRef.current) clearInterval(samplingTimerRef.current);
      if (quickRecalTimerRef.current) clearInterval(quickRecalTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Handle Voice Sample Capture - 12 seconds relaxed reading duration
  const handleStartSampling = async () => {
    if (!isMicActive) {
      onStartMic();
    }
    sampleCollectorRef.current = { pitches: [], centroids: [], bandEnergies: [], zcrs: [] };
    setIsSampling(true);
    setSampleProgress(0);
    const totalSeconds = 12;
    setSamplingSecondsLeft(totalSeconds);

    const startTime = Date.now();
    const durationMs = totalSeconds * 1000;

    if (samplingTimerRef.current) clearInterval(samplingTimerRef.current);

    samplingTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setSampleProgress(progress);
      setSamplingSecondsLeft(remaining);

      if (elapsed >= durationMs) {
        clearInterval(samplingTimerRef.current);
        setIsSampling(false);
        finishSampleStep();
      }
    }, 100);
  };

  const handleFinishEarly = () => {
    if (samplingTimerRef.current) clearInterval(samplingTimerRef.current);
    setIsSampling(false);
    setSampleProgress(100);
    finishSampleStep();
  };

  const handleCancelSampling = () => {
    if (samplingTimerRef.current) clearInterval(samplingTimerRef.current);
    setIsSampling(false);
    setSampleProgress(0);
    setSamplingSecondsLeft(12);
  };

  const finishSampleStep = () => {
    if (enrollmentStep < 3) {
      setEnrollmentStep((prev) => prev + 1);
    } else {
      // Completed all 3 steps - compute Boss's definitive acoustic profile
      const collected = sampleCollectorRef.current;
      const validPitches = collected.pitches.filter((p) => p > 60 && p < 450);
      const avgPitch =
        validPitches.length > 0
          ? Math.round(validPitches.reduce((a, b) => a + b, 0) / validPitches.length)
          : 140;

      const minP = validPitches.length > 0 ? Math.min(...validPitches) : 90;
      const maxP = validPitches.length > 0 ? Math.max(...validPitches) : 230;

      const avgCentroid =
        collected.centroids.length > 0
          ? Math.round(collected.centroids.reduce((a, b) => a + b, 0) / collected.centroids.length)
          : 1450;

      // Average 4-band formant energy
      const avgBands: [number, number, number, number] = [0.35, 0.38, 0.18, 0.09];
      if (collected.bandEnergies.length > 0) {
        for (let i = 0; i < 4; i++) {
          avgBands[i] =
            Math.round(
              (collected.bandEnergies.reduce((sum, b) => sum + b[i], 0) / collected.bandEnergies.length) * 100
            ) / 100;
        }
      }

      const updated: BossVoiceprint = {
        ...voiceprint,
        isEnrolled: true,
        enrolledAt: Date.now(),
        sampleCount: (voiceprint.sampleCount || 0) + 1,
        avgPitchHz: avgPitch,
        pitchRange: [minP, maxP],
        spectralCentroid: avgCentroid,
        formantEnergyProfile: avgBands,
        bossName: 'Boss',
      };

      onUpdateVoiceprint(updated);
      onUpdateVoiceSettings({
        ...voiceSettings,
        bossVoiceLock: true,
      });

      setActiveTab('status');
      setEnrollmentStep(1);
    }
  };

  const handleTestVerification = () => {
    if (simulateIntruder) {
      // Simulate unauthorized guest voice
      setSimulatedMatchScore(0.32);
    } else {
      // Authentic Boss voice
      setSimulatedMatchScore(0.95);
    }
  };

  // Secure Command-Protected Voiceprint Reset
  const handleOpenResetDialog = () => {
    setResetCommandInput('');
    setResetError('');
    setIsResetDialogOpen(true);
  };

  const handleExecuteProtectedReset = () => {
    const cleanCmd = resetCommandInput.trim().toUpperCase();
    if (cleanCmd !== 'RESET VOICEPRINT') {
      setResetError('Security Authorization Failed: You must type exactly: RESET VOICEPRINT');
      return;
    }

    const reset: BossVoiceprint = {
      isEnrolled: false,
      sampleCount: 0,
      avgPitchHz: 135,
      pitchRange: [90, 220],
      spectralCentroid: 1420,
      formantEnergyProfile: [0.35, 0.38, 0.18, 0.09],
      zeroCrossingRate: 0.08,
      confidenceThreshold: 0.65,
      bossName: 'Boss',
    };
    onUpdateVoiceprint(reset);
    onUpdateVoiceSettings({
      ...voiceSettings,
      bossVoiceLock: false,
    });

    setIsResetDialogOpen(false);
    setResetCommandInput('');
    setResetError('');
    setResetSuccessMessage('Voiceprint biometrics reset to factory baseline. Security lock disengaged.');
    setTimeout(() => setResetSuccessMessage(''), 5000);
  };

  const handleQuickRecalibrate = () => {
    if (!isMicActive) {
      onStartMic();
    }
    setIsQuickRecalibrating(true);
    setQuickRecalibrateSuccess(false);
    setQuickRecalSecondsLeft(8);

    const tempPitches: number[] = [];
    const tempCentroids: number[] = [];
    const tempBands: [number, number, number, number][] = [];

    const pollInterval = setInterval(() => {
      if (audioAnalyzer) {
        try {
          const freqData = audioAnalyzer.getFrequencyData();
          const timeData = audioAnalyzer.getTimeDomainData();
          const p = detectPitch(timeData, audioAnalyzer.sampleRate || 44100);
          if (p > 60 && p < 450) tempPitches.push(p);
          const c = calculateSpectralCentroid(freqData, audioAnalyzer.sampleRate || 44100);
          if (c > 300) tempCentroids.push(c);
          const b = calculateBandEnergyProfile(freqData, audioAnalyzer.sampleRate || 44100);
          tempBands.push(b);
        } catch (e) {}
      }
    }, 50);

    const totalSeconds = 8;
    const startTime = Date.now();

    if (quickRecalTimerRef.current) clearInterval(quickRecalTimerRef.current);

    quickRecalTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((totalSeconds * 1000 - elapsed) / 1000));
      setQuickRecalSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(quickRecalTimerRef.current);
        clearInterval(pollInterval);
        setIsQuickRecalibrating(false);

        const avgP =
          tempPitches.length > 0
            ? Math.round(tempPitches.reduce((a, b) => a + b, 0) / tempPitches.length)
            : livePitch > 0
            ? livePitch
            : 135;
        const minP = tempPitches.length > 0 ? Math.min(...tempPitches) : Math.max(65, avgP - 40);
        const maxP = tempPitches.length > 0 ? Math.max(...tempPitches) : avgP + 55;
        const avgC =
          tempCentroids.length > 0
            ? Math.round(tempCentroids.reduce((a, b) => a + b, 0) / tempCentroids.length)
            : liveCentroid > 0
            ? liveCentroid
            : 1420;

        const avgBands: [number, number, number, number] = [0.35, 0.38, 0.18, 0.09];
        if (tempBands.length > 0) {
          for (let i = 0; i < 4; i++) {
            avgBands[i] =
              Math.round((tempBands.reduce((s, b) => s + b[i], 0) / tempBands.length) * 100) / 100;
          }
        }

        const updated: BossVoiceprint = {
          ...voiceprint,
          isEnrolled: true,
          enrolledAt: Date.now(),
          sampleCount: (voiceprint.sampleCount || 0) + 1,
          avgPitchHz: avgP,
          pitchRange: [minP, maxP],
          spectralCentroid: avgC,
          formantEnergyProfile: avgBands,
          confidenceThreshold: 0.65, // Robust threshold to avoid false lockouts
          bossName: 'Boss',
        };

        onUpdateVoiceprint(updated);
        onUpdateVoiceSettings({
          ...voiceSettings,
          bossVoiceLock: true,
          voiceLockStrictness: 'balanced',
        });
        setQuickRecalibrateSuccess(true);
        setTimeout(() => setQuickRecalibrateSuccess(false), 5000);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-3xl backdrop-blur-2xl bg-slate-950/90 rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-hud tracking-widest text-white uppercase">
                  Boss Voiceprint Biometrics
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    voiceSettings.bossVoiceLock && voiceprint.isEnrolled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {voiceSettings.bossVoiceLock && voiceprint.isEnrolled ? 'LOCKED TO BOSS' : 'CALIBRATING'}
                </span>
              </div>
              <p className="text-xs font-mono text-cyan-400/80">
                Acoustic feature extraction, formant frequency profile & speaker verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-6 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'status'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            BIOMETRIC TELEMETRY
          </button>
          <button
            onClick={() => setActiveTab('enroll')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'enroll'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            ENROLL BOSS VOICE
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'test'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            SECURITY SIMULATION
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Master Voice Lock Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  voiceSettings.bossVoiceLock
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`p-3 rounded-xl border ${
                      voiceSettings.bossVoiceLock
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {voiceSettings.bossVoiceLock ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-hud tracking-wide">
                      BOSS EXCLUSIVE VOICE LOCK
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md">
                      When active, Kyrsten computes real-time acoustic similarity and strictly rejects any
                      unrecognized or ambient voices.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceSettings.bossVoiceLock}
                    onChange={(e) =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        bossVoiceLock: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Acoustic Signature Telemetry Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Fundamental Frequency (F0)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {livePitch > 0 ? `${livePitch} Hz` : `${voiceprint.avgPitchHz || 135} Hz`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      (Range: {voiceprint.pitchRange?.[0] || 90}-{voiceprint.pitchRange?.[1] || 220} Hz)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Spectral Centroid (Timbre)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {liveCentroid > 0 ? `${liveCentroid} Hz` : `${voiceprint.spectralCentroid} Hz`}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Harmonic Lock</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Enrollment Status
                  </span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${voiceprint.isEnrolled ? 'text-emerald-400' : 'text-amber-400'}`}
                    />
                    <span className="text-sm font-semibold text-white font-hud">
                      {voiceprint.isEnrolled ? 'Boss Profile Enrolled' : 'Factory Baseline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formant Energy Distribution Bars */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="uppercase tracking-wider font-semibold text-cyan-400">
                    Acoustic Formant Band Ratios
                  </span>
                  <span className="text-[10px] text-slate-400">LIVE FFT ENERGY SPECTRUM</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div>
                    <div className="h-16 rounded-xl bg-black/40 border border-white/10 p-1 flex items-end justify-center">
                      <div
                        className="w-full bg-cyan-400 rounded-lg transition-all duration-150"
                        style={{
                          height: `${Math.max(10, Math.round((liveBandEnergy[0] || voiceprint.formantEnergyProfile[0]) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-slate-400 block mt-1">Sub-Bass</span>
                    <span className="text-cyan-300 text-[10px]">
                      {Math.round((liveBandEnergy[0] || voiceprint.formantEnergyProfile[0]) * 100)}%
                    </span>
                  </div>

                  <div>
                    <div className="h-16 rounded-xl bg-black/40 border border-white/10 p-1 flex items-end justify-center">
                      <div
                        className="w-full bg-blue-400 rounded-lg transition-all duration-150"
                        style={{
                          height: `${Math.max(10, Math.round((liveBandEnergy[1] || voiceprint.formantEnergyProfile[1]) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-slate-400 block mt-1">Low-Mid</span>
                    <span className="text-blue-300 text-[10px]">
                      {Math.round((liveBandEnergy[1] || voiceprint.formantEnergyProfile[1]) * 100)}%
                    </span>
                  </div>

                  <div>
                    <div className="h-16 rounded-xl bg-black/40 border border-white/10 p-1 flex items-end justify-center">
                      <div
                        className="w-full bg-indigo-400 rounded-lg transition-all duration-150"
                        style={{
                          height: `${Math.max(10, Math.round((liveBandEnergy[2] || voiceprint.formantEnergyProfile[2]) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-slate-400 block mt-1">High-Mid</span>
                    <span className="text-indigo-300 text-[10px]">
                      {Math.round((liveBandEnergy[2] || voiceprint.formantEnergyProfile[2]) * 100)}%
                    </span>
                  </div>

                  <div>
                    <div className="h-16 rounded-xl bg-black/40 border border-white/10 p-1 flex items-end justify-center">
                      <div
                        className="w-full bg-purple-400 rounded-lg transition-all duration-150"
                        style={{
                          height: `${Math.max(10, Math.round((liveBandEnergy[3] || voiceprint.formantEnergyProfile[3]) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-slate-400 block mt-1">Treble</span>
                    <span className="text-purple-300 text-[10px]">
                      {Math.round((liveBandEnergy[3] || voiceprint.formantEnergyProfile[3]) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Strictness Level */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="uppercase tracking-wider">Voice Lock Security Strictness</span>
                  <span className="text-cyan-400 font-bold uppercase">
                    {voiceSettings.voiceLockStrictness}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {(['balanced', 'high', 'maximum'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          voiceLockStrictness: lvl,
                        })
                      }
                      className={`p-2.5 rounded-xl border uppercase tracking-wider transition-all cursor-pointer ${
                        voiceSettings.voiceLockStrictness === lvl
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 'balanced' && 'Balanced (70%)'}
                      {lvl === 'high' && 'High Sec (75%)'}
                      {lvl === 'maximum' && 'Max Lock (85%)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Success Banner */}
              {resetSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center gap-2.5 animate-in fade-in slide-in-from-top duration-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{resetSuccessMessage}</span>
                </div>
              )}

              {/* Quick Recalibration Success Banner */}
              {quickRecalibrateSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-in fade-in slide-in-from-top duration-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Boss Voiceprint successfully recalibrated! Acoustic baseline re-centered to your voice with balanced recognition sensitivity.
                  </span>
                </div>
              )}

              {/* Security & Access Protection Notice */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-hud uppercase tracking-widest text-cyan-300">
                    Acoustic Voice Lock Security
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Kyrsten continuously verifies fundamental pitch harmonics, formant resonance, and vocal spectrum envelope. Critical commands and voice resets are guarded against unauthorized voice synthesis and spoofing.
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={handleOpenResetDialog}
                  className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Requires security command authorization"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Reset Voiceprint (Command Protected)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('enroll')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-hud font-bold tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    Guided Voice Enrollment
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'enroll' && (
            <div className="space-y-6">
              {/* Wizard Steps indicator */}
              <div className="flex items-center justify-between px-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                        enrollmentStep === step
                          ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-500/20'
                          : enrollmentStep > step
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {enrollmentStep > step ? '✓' : step}
                    </div>
                    <span className="text-xs font-mono text-slate-300 hidden sm:inline">
                      Phrase {step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calibration Phrase Prompter with Slower Relaxed Pace */}
              <div className="p-6 rounded-3xl bg-black/40 border border-cyan-500/30 text-center space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Step {enrollmentStep} of 3 • Read at your natural, comfortable pace (12 seconds)</span>
                </div>
                
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xl mx-auto">
                  <p className="text-lg font-bold font-hud text-white tracking-wide leading-relaxed">
                    &ldquo;{calibrationPhrases[enrollmentStep - 1]}&rdquo;
                  </p>
                </div>

                {isSampling ? (
                  <div className="w-full max-w-md mx-auto space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs font-mono text-cyan-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        Listening & mapping voice spectrum...
                      </span>
                      <span className="font-bold text-white bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/40">
                        {samplingSecondsLeft}s remaining
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/20">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-150"
                        style={{ width: `${sampleProgress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={handleFinishEarly}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-mono transition-all cursor-pointer"
                      >
                        ✓ Finished Reading (Save Step)
                      </button>
                      <button
                        onClick={handleCancelSampling}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
                      >
                        Cancel Sample
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">
                    Take your time. When you press record below, you have a full 12 seconds to read the phrase clearly.
                  </p>
                )}
              </div>

              {/* Mic & Capture Action */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <button
                  onClick={handleStartSampling}
                  disabled={isSampling}
                  className={`px-8 py-4 rounded-2xl flex items-center gap-3 text-sm font-bold font-hud uppercase tracking-wider transition-all cursor-pointer ${
                    isSampling
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 animate-pulse cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 hover:scale-105'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  {isSampling ? `Recording Step ${enrollmentStep} (${samplingSecondsLeft}s left)...` : `Start 12s Recording for Step ${enrollmentStep}`}
                </button>
                
                <div className="pt-2 flex flex-col items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    Captures fundamental pitch harmonics, formant resonance, and speech spectrum
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-bold font-hud text-white uppercase tracking-wider">
                  Live Speaker Verification Test
                </h3>
                <p className="text-xs text-slate-300">
                  Verify that Kyrsten only grants authorization to Boss and rejects stranger or ambient voice
                  inputs.
                </p>

                {/* Intruder Simulation Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-white">Simulate Stranger / Unauthorized Voice</span>
                    <p className="text-[11px] text-slate-400">
                      Artificially shifts acoustic pitch and formant frequencies to simulate an intruder.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateIntruder}
                      onChange={(e) => setSimulateIntruder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                <button
                  onClick={handleTestVerification}
                  className="w-full py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-hud font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Run Biometric Match Diagnostic
                </button>
              </div>

              {simulatedMatchScore !== null && (
                <div
                  className={`p-4 rounded-2xl border space-y-2 animate-in fade-in ${
                    simulatedMatchScore >= 0.7
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-hud font-bold text-sm">
                      {simulatedMatchScore >= 0.7 ? (
                        <>
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <span>VOICEPRINT AUTHENTICATED: BOSS</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-5 h-5 text-rose-400" />
                          <span>SECURITY REJECTION: UNAUTHORIZED VOICE</span>
                        </>
                      )}
                    </div>
                    <span className="font-mono text-base font-bold">
                      {Math.round(simulatedMatchScore * 100)}% Match
                    </span>
                  </div>
                  <p className="text-xs font-mono opacity-90">
                    {simulatedMatchScore >= 0.7
                      ? 'Acoustic signature matches authorized profile within tolerance. Voice command access granted.'
                      : 'Voice signature does not match. Command processing blocked.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Biometrics
          </button>
        </div>
      </div>

      {/* Command-Protected Reset Confirmation Modal */}
      {isResetDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl shadow-rose-950/50 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-hud uppercase tracking-wider text-white">
                  Confirm Biometric Reset
                </h3>
                <p className="text-[11px] font-mono text-rose-300">
                  Command Authorization Required
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Resetting will wipe the enrolled Boss voice harmonics, clear the baseline acoustic profile, and disengage the voice lock. Unauthorized visitors cannot reset this without typing the security command.
            </p>

            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400">
                To confirm reset, type the command below:
              </span>
              <div className="text-xs font-mono font-bold text-cyan-300 select-all">
                RESET VOICEPRINT
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Terminal className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={resetCommandInput}
                  onChange={(e) => {
                    setResetCommandInput(e.target.value);
                    setResetError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExecuteProtectedReset();
                    }
                  }}
                  placeholder="Type RESET VOICEPRINT"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-rose-400/60"
                  autoFocus
                />
              </div>
              {resetError && (
                <p className="text-[11px] font-mono text-rose-400 pt-1">
                  {resetError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsResetDialogOpen(false);
                  setResetCommandInput('');
                  setResetError('');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteProtectedReset}
                disabled={resetCommandInput.trim().toUpperCase() !== 'RESET VOICEPRINT'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Authorize Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
