import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
    Camera, FileCheck, Upload, ArrowLeft, Loader,
    CheckCircle, XCircle, AlertTriangle, User, CreditCard
} from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Documento', icon: CreditCard },
    { id: 2, title: 'Selfie', icon: User },
    { id: 3, title: 'Verificação', icon: FileCheck },
];

export default function VerifyIdentity() {
    const navigate = useNavigate();
    const location = useLocation();
    const welcomeMessage = location.state?.message || '';

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const [documentFront, setDocumentFront] = useState(null);
    const [documentFrontPreview, setDocumentFrontPreview] = useState(null);
    const [selfie, setSelfie] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [stream, setStream] = useState(null);

    const userId = localStorage.getItem('userId');

    // Handle file upload for document
    const handleDocumentUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError('Arquivo muito grande. Máximo 10MB.');
                return;
            }
            setDocumentFront(file);
            setDocumentFrontPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    // Open camera for selfie
    const openCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            setIsCameraOpen(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setError('Não foi possível acessar a câmera. Verifique as permissões.');
            console.error(err);
        }
    };

    // Capture selfie from camera
    const captureSelfie = useCallback(() => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

            canvas.toBlob((blob) => {
                setSelfie(blob);
                setSelfiePreview(canvas.toDataURL('image/jpeg'));
            }, 'image/jpeg', 0.9);

            // Stop camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            setIsCameraOpen(false);
        }
    }, [stream]);

    // Handle selfie file upload (alternative to camera)
    const handleSelfieUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelfie(file);
            setSelfiePreview(URL.createObjectURL(file));
        }
    };

    // Submit verification
    const handleSubmit = async () => {
        if (!documentFront || !selfie) {
            setError('Por favor, envie o documento e a selfie');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('document_front', documentFront);
            formData.append('selfie', selfie);

            const response = await api.post('/users/verify-identity', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult(response.data);
            setStep(3);

            if (response.data.kyc_status === 'VERIFIED') {
                localStorage.setItem('kycStatus', 'VERIFIED');
            }

        } catch (err) {
            const msg = err.response?.data?.detail || 'Erro na verificação';
            setError(msg);
            setResult({ kyc_status: 'ERROR', message: msg });
            setStep(3);
        } finally {
            setLoading(false);
        }
    };

    // Navigate based on result
    const handleContinue = () => {
        if (result?.kyc_status === 'VERIFIED') {
            navigate('/market');
        } else {
            // Reset for retry
            setStep(1);
            setDocumentFront(null);
            setDocumentFrontPreview(null);
            setSelfie(null);
            setSelfiePreview(null);
            setResult(null);
            setError('');
        }
    };

    // DEV MODE: Skip verification for testing
    const handleDevBypass = async () => {
        setLoading(true);
        try {
            // Call a special dev endpoint or just simulate success
            const response = await api.post('/dev/bypass-kyc', { user_id: userId });
            localStorage.setItem('kycStatus', 'VERIFIED');
            setResult({ kyc_status: 'VERIFIED', message: 'Verificação ignorada (modo dev)' });
            setStep(3);
        } catch (err) {
            // Even if endpoint doesn't exist, simulate success in dev mode
            localStorage.setItem('kycStatus', 'VERIFIED');
            setResult({ kyc_status: 'VERIFIED', message: 'Verificação ignorada (modo dev)' });
            setStep(3);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-black to-[#1a0033] p-4 flex items-center justify-center">
            <div className="premium-card w-full max-w-lg border-yellow-500/20">

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-500 hover:text-white"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Verificação de Identidade</h1>
                        <p className="text-gray-400 text-sm">Proteja sua conta e negocie com segurança</p>
                    </div>
                </div>

                {welcomeMessage && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-6 text-green-400 text-sm">
                        {welcomeMessage}
                    </div>
                )}

                {/* Progress Steps */}
                <div className="flex justify-between mb-8">
                    {STEPS.map((s, idx) => {
                        const Icon = s.icon;
                        const isActive = step === s.id;
                        const isComplete = step > s.id;

                        return (
                            <div key={s.id} className="flex items-center">
                                <div className={`flex flex-col items-center ${idx > 0 ? 'ml-4' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isComplete ? 'bg-green-600' : isActive ? 'bg-yellow-500' : 'bg-gray-800'
                                        }`}>
                                        {isComplete ? (
                                            <CheckCircle size={20} className="text-white" />
                                        ) : (
                                            <Icon size={20} className={isActive ? 'text-black' : 'text-gray-500'} />
                                        )}
                                    </div>
                                    <span className={`text-xs mt-2 ${isActive ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {s.title}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`w-12 h-0.5 ml-4 ${step > s.id ? 'bg-green-600' : 'bg-gray-700'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* Step 1: Document Upload */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <CreditCard size={48} className="text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Foto do Documento</h2>
                            <p className="text-gray-400 text-sm">
                                Envie uma foto clara do seu RG, CNH ou Passaporte
                            </p>
                        </div>

                        {documentFrontPreview ? (
                            <div className="relative">
                                <img
                                    src={documentFrontPreview}
                                    alt="Documento"
                                    className="w-full h-48 object-cover rounded-lg border border-gray-700"
                                />
                                <button
                                    onClick={() => {
                                        setDocumentFront(null);
                                        setDocumentFrontPreview(null);
                                    }}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                        ) : (
                            <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-yellow-500 transition-colors">
                                    <Upload size={40} className="text-gray-500 mx-auto mb-4" />
                                    <p className="text-gray-400">Clique para enviar ou arraste a imagem</p>
                                    <p className="text-gray-600 text-xs mt-2">JPG, PNG até 10MB</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleDocumentUpload}
                                    className="hidden"
                                />
                            </label>
                        )}

                        <button
                            onClick={() => setStep(2)}
                            disabled={!documentFront}
                            className="btn-primary w-full disabled:opacity-50"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Step 2: Selfie */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <User size={48} className="text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Selfie de Verificação</h2>
                            <p className="text-gray-400 text-sm">
                                Tire uma selfie com boa iluminação, sem óculos
                            </p>
                        </div>

                        {isCameraOpen ? (
                            <div className="relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full rounded-lg border border-yellow-500"
                                />
                                <button
                                    onClick={captureSelfie}
                                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black p-4 rounded-full shadow-lg"
                                >
                                    <Camera size={24} />
                                </button>
                            </div>
                        ) : selfiePreview ? (
                            <div className="relative">
                                <img
                                    src={selfiePreview}
                                    alt="Selfie"
                                    className="w-full h-64 object-cover rounded-lg border border-green-500"
                                />
                                <button
                                    onClick={() => {
                                        setSelfie(null);
                                        setSelfiePreview(null);
                                    }}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    onClick={openCamera}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2"
                                >
                                    <Camera size={20} /> Abrir Câmera
                                </button>

                                <div className="text-center text-gray-500 text-sm">ou</div>

                                <label className="block cursor-pointer">
                                    <div className="border border-gray-700 rounded-lg p-4 text-center hover:border-gray-500 transition-colors">
                                        <Upload size={24} className="text-gray-500 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">Enviar foto da galeria</p>
                                    </div>
                                    <input
                                        ref={cameraInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleSelfieUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="btn-secondary flex-1"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selfie || loading}
                                className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader className="animate-spin" size={20} /> : 'Verificar'}
                            </button>
                        </div>

                        {/* DEV MODE BYPASS */}
                        <div className="mt-6 pt-4 border-t border-orange-500/30">
                            <p className="text-orange-400 text-xs text-center mb-2">⚠️ MODO DESENVOLVIMENTO</p>
                            <button
                                onClick={handleDevBypass}
                                disabled={loading}
                                className="w-full bg-orange-500/20 border border-orange-500/50 text-orange-400 py-2 rounded-lg text-sm font-bold hover:bg-orange-500/30 disabled:opacity-50"
                            >
                                Pular Verificação (Dev Only)
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Result */}
                {step === 3 && result && (
                    <div className="text-center space-y-6">
                        {result.kyc_status === 'VERIFIED' ? (
                            <>
                                <div className="bg-green-500/10 p-6 rounded-full inline-block">
                                    <CheckCircle size={64} className="text-green-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-green-400">Identidade Verificada!</h2>
                                <p className="text-gray-400">{result.message}</p>
                                {result.face_match_score && (
                                    <p className="text-sm text-gray-500">
                                        Similaridade: {result.face_match_score.toFixed(1)}%
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="bg-red-500/10 p-6 rounded-full inline-block">
                                    <XCircle size={64} className="text-red-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-red-400">Verificação Falhou</h2>
                                <p className="text-gray-400">{result.message}</p>
                                <p className="text-sm text-gray-500">
                                    Tente novamente com fotos mais claras
                                </p>
                            </>
                        )}

                        <button
                            onClick={handleContinue}
                            className={`w-full py-4 rounded-lg font-bold ${result.kyc_status === 'VERIFIED'
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                                : 'bg-gray-700 text-white'
                                }`}
                        >
                            {result.kyc_status === 'VERIFIED' ? 'Ir para o Marketplace' : 'Tentar Novamente'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
