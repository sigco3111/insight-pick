
import React, { useState, useEffect } from 'react';
import { BriefcaseBusiness, Sun, Moon, CheckCircle2, AlertTriangle, KeyRound, Save, Trash2, Info } from 'lucide-react';
import { APP_NAME } from '../constants';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isApiKeyValid: boolean;
  currentGlobalApiKey: string | null;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
  initialEnvApiKeyExists: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  theme, 
  toggleTheme, 
  isApiKeyValid, 
  currentGlobalApiKey, 
  onSaveApiKey, 
  onClearApiKey,
  initialEnvApiKeyExists 
}) => {
  const [inputApiKey, setInputApiKey] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setInputApiKey(currentGlobalApiKey || '');
  }, [currentGlobalApiKey]);

  const handleSave = () => {
    onSaveApiKey(inputApiKey);
    setFeedbackMessage("API 키가 저장되었습니다.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleClear = () => {
    onClearApiKey();
    setInputApiKey(process.env.API_KEY || ''); 
    setFeedbackMessage("API 키가 삭제되었습니다. 환경 변수 키 (존재 시) 또는 빈 값으로 재설정됩니다.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };
  
  const getApiKeyStatusTooltip = () => {
    if (isApiKeyValid) {
      if (localStorage.getItem('geminiApiKey')) {
        return "Gemini API 키가 로컬 저장소에서 로드되어 활성 상태입니다.";
      }
      if (initialEnvApiKeyExists) {
        return "Gemini API 키가 환경 변수에서 로드되어 활성 상태입니다.";
      }
      // This case should ideally not be hit if a key source (LS or ENV) makes it valid.
      // But as a fallback if updateGeminiApiKey returns true without a clear source.
      return "Gemini API 키가 활성 상태입니다.";
    }
    // If not valid, explain why
    if (currentGlobalApiKey && !isApiKeyValid) {
         return "현재 설정된 API 키가 유효하지 않습니다. 확인 후 다시 저장해주세요.";
    }
    return "Gemini API 키가 설정되지 않았습니다. API 키를 입력하고 저장해주세요.";
  };

  return (
    <header className="bg-neutral-800 dark:bg-neutral-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row: App Name, API Status, Theme Toggle */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <BriefcaseBusiness className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div 
              className="flex items-center space-x-1 cursor-help" // Added cursor-help for tooltip
              title={getApiKeyStatusTooltip()}
            >
              {isApiKeyValid ? (
                <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              )}
              <span className={`hidden sm:inline text-xs font-medium ${isApiKeyValid ? 'text-green-400' : 'text-red-400'}`}>
                API: {isApiKeyValid ? '활성' : '키 필요'}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-neutral-700 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 dark:focus:ring-offset-neutral-900 focus:ring-white transition-colors"
              aria-label={theme === 'light' ? '다크 모드로 변경' : '라이트 모드로 변경'}
            >
              {theme === 'light' ? (
                <Moon className="h-6 w-6 text-neutral-300" />
              ) : (
                <Sun className="h-6 w-6 text-yellow-400" />
              )}
            </button>
          </div>
        </div>

        {/* Always-visible API Key Input Section */}
        <div className="py-3 border-t border-neutral-700 dark:border-neutral-700/50">
          <div className="flex items-center mb-1">
            <KeyRound size={18} className="text-yellow-400 mr-2 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-neutral-100">Gemini API 키 설정</h3>
          </div>
          <p className="text-xs text-neutral-300 mb-2.5">
            API 키는 브라우저의 로컬 스토리지에 저장됩니다. 
            {initialEnvApiKeyExists && " 환경 변수에 설정된 키가 로컬 키보다 우선 사용될 수 있습니다."}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="password"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              placeholder="여기에 Gemini API 키를 입력하세요"
              className="flex-grow w-full sm:w-auto px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-600 border border-neutral-300 dark:border-neutral-500 rounded-md focus:ring-primary focus:border-primary placeholder-neutral-500 dark:placeholder-neutral-400"
              aria-label="Gemini API 키 입력 필드"
            />
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={handleClear}
                className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center w-full sm:w-auto justify-center"
                title="로컬 저장소에서 API 키 삭제"
                disabled={!localStorage.getItem('geminiApiKey')}
              >
                <Trash2 size={14} className="mr-1.5" /> 지우기
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 text-xs bg-primary hover:bg-secondary text-white rounded-md flex items-center w-full sm:w-auto justify-center"
                disabled={!inputApiKey.trim()}
              >
                <Save size={14} className="mr-1.5" /> 저장
              </button>
            </div>
          </div>
          {feedbackMessage && (
            <div className="mt-2 text-xs p-2 rounded-md bg-green-600 bg-opacity-80 text-white flex items-center">
              <Info size={14} className="mr-1.5 flex-shrink-0" />
              {feedbackMessage}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
