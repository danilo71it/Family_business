import { LogIn, Wallet } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export function Auth({ onLogin }: Props) {
  return (
    <div id="auth-page" className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="max-w-md w-full scroll-py-8">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex p-4 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200">
            <Wallet size={48} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Family business</h1>
            <p className="text-gray-500 font-medium">Gestione finanziaria semplice per tutta la famiglia</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-800">Bentornato</h2>
            <p className="text-sm text-gray-400">Accedi con il tuo account Google per iniziare</p>
          </div>
          
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all font-semibold text-gray-700 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Continua con Google
          </button>

          <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">
            Sincronizzazione su ogni dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}
