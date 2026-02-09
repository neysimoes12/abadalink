import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Camera, Upload, Check, AlertCircle, ArrowLeft, Shield } from 'lucide-react';

export default function KYCUpload() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Data, 1: Front, 2: Back, 3: Selfie, 4: Review
    const [docData, setDocData] = useState({ type: 'CPF', number: '' });
    const [files, setFiles] = useState({
        front: null,
        back: null,
        selfie: null
    });
    const [previews, setPreviews] = useState({
        front: null,
        back: null,
        selfie: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const type = step === 1 ? 'front' : step === 2 ? 'back' : 'selfie';

        // Update files state
        setFiles(prev => ({ ...prev, [type]: file }));

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [type]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const nextStep = () => {
        if (step < 4) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        // For MVP: We are NOT uploading real files to server to save complexity/bandwidth.
        // We just send the document data and "mock" the image URLs.
        try {
            await api.post('/users/verify', {
                document_type: docData.type,
                document_number: docData.number,
                front_image_url: "mock_front.jpg", // Previews are in browser memory
                back_image_url: "mock_back.jpg",
                selfie_image_url: "mock_selfie.jpg"
            });

            // Success!
            navigate('/profile', { state: { kycSuccess: true } });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Erro ao enviar dados. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                            <select
                                value={docData.type}
                                onChange={e => setDocData({ ...docData, type: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-xl bg-white"
                            >
                                <option value="CPF">CPF</option>
                                <option value="RG">RG</option>
                                <option value="CNH">CNH</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número do Documento</label>
                            <input
                                type="text"
                                value={docData.number}
                                onChange={e => setDocData({ ...docData, number: e.target.value })}
                                placeholder="000.000.000-00"
                                className="w-full p-3 border border-gray-300 rounded-xl"
                            />
                        </div>
                        <p className="text-gray-500 text-sm mt-2">
                            Precisamos do número oficial para validar junto à base do governo (simulado).
                        </p>
                    </div>
                );
            case 1:
                return (
                    <div className="flex flex-col items-center">
                        <div className="relative w-full h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 overflow-hidden">
                            {previews.front ? (
                                <img src={previews.front} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Shield size={48} className="mb-2" />
                                    <span className="font-medium">Frente do RG/CNH</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <p className="text-gray-500 text-sm text-center mb-6">
                            Tire uma foto clara e legível da frente do seu documento oficial.
                        </p>
                    </div>
                );
            case 2:
                // Back of document (Optional/Required depending on doc type, but we treat as step)
                return (
                    <div className="flex flex-col items-center">
                        <div className="relative w-full h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 overflow-hidden">
                            {previews.back ? (
                                <img src={previews.back} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Shield size={48} className="mb-2" />
                                    <span className="font-medium">Verso do RG/CNH</span>
                                    <span className="text-xs">(Opcional se CNH digital)</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <p className="text-gray-500 text-sm text-center mb-6">
                            Agora o verso do documento.
                        </p>
                    </div>
                );
            case 3:
                return (
                    <div className="flex flex-col items-center">
                        <div className="relative w-48 h-48 bg-gray-100 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 overflow-hidden">
                            {previews.selfie ? (
                                <img src={previews.selfie} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Camera size={48} className="mb-2" />
                                    <span className="font-medium">Sua Selfie</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <p className="text-gray-500 text-sm text-center mb-6">
                            Tire uma selfie em local iluminado para validarmos sua identidade.
                        </p>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            {previews.front && <img src={previews.front} className="w-12 h-12 rounded object-cover border border-green-200" />}
                            <div className="flex-1">
                                <p className="font-bold text-sm text-gray-800">Documento (Frente)</p>
                                <p className="text-xs text-green-600 font-semibold">Carregado</p>
                            </div>
                            <Check size={20} className="text-green-600" />
                        </div>

                        {previews.back && (
                            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                <img src={previews.back} className="w-12 h-12 rounded object-cover border border-green-200" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-800">Documento (Verso)</p>
                                    <p className="text-xs text-green-600 font-semibold">Carregado</p>
                                </div>
                                <Check size={20} className="text-green-600" />
                            </div>
                        )}

                        <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            {previews.selfie && <img src={previews.selfie} className="w-12 h-12 rounded-full object-cover border border-green-200" />}
                            <div className="flex-1">
                                <p className="font-bold text-sm text-gray-800">Sua Selfie</p>
                                <p className="text-xs text-green-600 font-semibold">Carregado</p>
                            </div>
                            <Check size={20} className="text-green-600" />
                        </div>

                        <div className="text-center mt-6">
                            <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 px-4">
                                Seus dados são criptografados e usados exclusivamente para verificar sua identidade na plataforma AbadáMatch.
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-20 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-gray-800">Verificação de Identidade</h1>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            <main className="p-4 max-w-lg mx-auto">

                {/* Steps Indicator */}
                <div className="flex justify-between items-center mb-8 px-2 relative">
                    {/* Connection Line */}
                    <div className="absolute left-6 right-6 top-4 h-0.5 bg-gray-200 -z-10"></div>

                    {[0, 1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex flex-col items-center bg-gray-50 z-10 px-1">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= s ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {s + 1}
                            </div>
                            <span className="text-[9px] mt-1 text-gray-500 font-semibold text-center leading-tight w-14">
                                {s === 0 ? 'Dados' : s === 1 ? 'Frente' : s === 2 ? 'Verso' : s === 3 ? 'Selfie' : 'Fim'}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[420px] flex flex-col">
                    <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
                        {step === 0 && "Seus Dados"}
                        {step === 1 && "Foto da Frente"}
                        {step === 2 && "Foto do Verso"}
                        {step === 3 && "Sua Selfie"}
                        {step === 4 && "Confirmar Envio"}
                    </h2>

                    <div className="flex-1">
                        {renderStepContent()}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 mb-4 border border-red-100">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3">
                        {step < 4 ? (
                            <button
                                onClick={nextStep}
                                disabled={
                                    (step === 0 && !docData.number) ||
                                    (step === 1 && !files.front) ||
                                    (step === 3 && !files.selfie)
                                }
                                className={`btn btn-primary w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${((step === 0 && !docData.number) || (step === 1 && !files.front) || (step === 3 && !files.selfie))
                                        ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
                                    }`}
                            >
                                Continuar
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="btn w-full py-3 rounded-xl font-bold text-white shadow-lg bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>Enviando...</>
                                ) : (
                                    <>
                                        <Check size={20} />
                                        Confirmar e Enviar
                                    </>
                                )}
                            </button>
                        )}

                        {step > 1 && (
                            <button
                                onClick={prevStep}
                                className="text-gray-400 text-sm font-medium hover:text-gray-600 py-2"
                                disabled={loading}
                            >
                                Voltar
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
