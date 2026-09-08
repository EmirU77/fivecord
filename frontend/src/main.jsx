import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Fivecord Uncaught Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#1e1f22] text-[#dbdee1] p-6 select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#5865f2] flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-[#5865f2]/30 mb-6 animate-pulse">
            5
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Fivecord Bir Sorunla Karşılaştı</h1>
          <p className="text-sm text-[#949ba4] max-w-md text-center mb-6">
            Arayüz yüklenirken beklenmedik bir hata oluştu. Yeniden yükleyerek devam edebilirsiniz.
          </p>
          <div className="bg-[#111214] border border-[#2b2d31] rounded-xl p-4 max-w-lg w-full text-xs font-mono text-[#f23f43] mb-6 overflow-auto max-h-40">
            {this.state.error?.toString() || 'Bilinmeyen hata'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 bg-[#5865f2] hover:bg-[#4752c4] active:scale-95 text-white font-semibold rounded-lg shadow transition duration-150 cursor-pointer"
            >
              Yeniden Başlat
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-[#2b2d31] hover:bg-[#35373c] active:scale-95 text-[#dbdee1] font-semibold rounded-lg border border-[#3b3e45] transition duration-150 cursor-pointer"
            >
              Sıfırla ve Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
