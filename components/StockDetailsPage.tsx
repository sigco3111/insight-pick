
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StockRecommendation, NewsArticle as FetchedNewsArticle, GroundingSource, StockFinancialsData, ChatMessage } from '../types'; 
import { getDetailedStockAnalysis, fetchStockSpecificNews, fetchStockFinancialIndicators } from '../services/geminiService'; 
import LoadingSpinner from './LoadingSpinner';
import NewsItem from './NewsItem';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME_TEXT } from '../constants';
import { ArrowLeft, BarChart2, Briefcase, Info, Newspaper, Search, Zap, AlertCircle, Brain, RefreshCw, Link as LinkIcon, ExternalLink, CalendarDays, MessageSquare, Send, MessageCircle, KeyRound } from 'lucide-react';

type DetailedNewsArticle = FetchedNewsArticle;

interface StockDetailsPageProps {
  ticker: string;
  companyName: string;
  initialRationale?: string;
  stockData?: StockRecommendation;
  onBack: () => void;
  isApiKeyValid: boolean; // New prop
  currentGlobalApiKey: string | null; // New prop
}

const StockDetailsPage: React.FC<StockDetailsPageProps> = ({
  ticker,
  companyName,
  initialRationale,
  stockData,
  onBack,
  isApiKeyValid, // Destructure new prop
  currentGlobalApiKey, // Destructure new prop
}) => {
  const googleFinanceUrl = `https://www.google.com/finance/quote/${ticker.includes('.') ? ticker.split('.')[0] + ':' + ticker.split('.')[1] : ticker}`;
  const yahooFinanceUrl = `https://finance.yahoo.com/quote/${ticker}`;

  const [detailedAnalysis, setDetailedAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSources, setAnalysisSources] = useState<GroundingSource[]>([]);

  const [relatedNews, setRelatedNews] = useState<DetailedNewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [financialIndicators, setFinancialIndicators] = useState<StockFinancialsData | null>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState<boolean>(false);
  const [indicatorsError, setIndicatorsError] = useState<string | null>(null);

  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0); 
    return () => clearTimeout(timerId);
  }, [ticker, companyName]);


  useEffect(() => {
    if (isApiKeyValid && currentGlobalApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: currentGlobalApiKey });
        const newChat = ai.chats.create({
          model: GEMINI_MODEL_NAME_TEXT,
          config: {
            systemInstruction: `당신은 ${companyName}(티커: ${ticker})에 대한 상세 정보를 제공하는 전문 금융 애널리스트 AI입니다. 사용자의 질문에 간결하고 명확하게 답변해주세요. 이 주식과 직접적으로 관련된 질문에만 답변하고, 그렇지 않은 질문에는 정중히 거절하거나 주제에 집중하도록 유도하세요. 답변은 한국어로 제공해주세요.`,
          },
        });
        setChatInstance(newChat);
        setChatMessages([]); 
        setChatError(null);
      } catch(e: any) {
        console.error("Chat AI initialization error:", e);
        setChatInstance(null);
        setChatError("채팅 AI 초기화 중 오류 발생: " + e.message);
      }
    } else {
      setChatInstance(null);
      setChatError(!currentGlobalApiKey ? "API 키가 설정되지 않아 채팅 기능을 사용할 수 없습니다." : "API 키가 유효하지 않아 채팅 기능을 사용할 수 없습니다.");
    }
  }, [ticker, companyName, isApiKeyValid, currentGlobalApiKey]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);


  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !chatInstance || chatLoading || !isApiKeyValid) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: chatInput.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const response: GenerateContentResponse = await chatInstance.sendMessage({ message: userMessage.text });
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: response.text || "응답을 받지 못했습니다.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (e: any) {
      console.error("Chat API Error:", e);
      const errorText = e.message || "AI와 대화 중 오류가 발생했습니다. 다시 시도해주세요.";
      setChatError(errorText);
       const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: `오류: ${errorText}`,
        sender: 'ai', 
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };


  const handleFetchDetailedAnalysis = useCallback(async () => {
    if (!isApiKeyValid) {
        setAnalysisError("상세 분석을 보려면 유효한 API 키가 필요합니다.");
        return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    setDetailedAnalysis(null);
    setAnalysisSources([]);
    try {
      const { analysis, groundingSources } = await getDetailedStockAnalysis(ticker, companyName);
      setDetailedAnalysis(analysis);
      setAnalysisSources(groundingSources);
    } catch (e: any) {
      setAnalysisError(e.message || "상세 분석 정보를 가져오는데 실패했습니다.");
    } finally {
      setAnalysisLoading(false);
    }
  }, [ticker, companyName, isApiKeyValid]);

  const handleFetchRelatedNews = useCallback(async () => {
    if (!isApiKeyValid) {
        setNewsError("관련 뉴스를 보려면 유효한 API 키가 필요합니다.");
        return;
    }
    setNewsLoading(true);
    setNewsError(null);
    setRelatedNews([]);
    try {
      const news = await fetchStockSpecificNews(ticker, companyName);
      setRelatedNews(news);
    } catch (e: any) {
      setNewsError(e.message || "관련 뉴스를 가져오는데 실패했습니다.");
    } finally {
      setNewsLoading(false);
    }
  }, [ticker, companyName, isApiKeyValid]);

  const handleFetchFinancialIndicators = useCallback(async () => {
    if (!isApiKeyValid) {
        setIndicatorsError("재무 지표를 보려면 유효한 API 키가 필요합니다.");
        return;
    }
    setIndicatorsLoading(true);
    setIndicatorsError(null);
    setFinancialIndicators(null);
    try {
      const data = await fetchStockFinancialIndicators(ticker, companyName);
      setFinancialIndicators(data);
    } catch (e: any) {
      setIndicatorsError(e.message || "주요 재무 지표를 가져오는데 실패했습니다.");
    } finally {
      setIndicatorsLoading(false);
    }
  }, [ticker, companyName, isApiKeyValid]);
  
  const renderSection = (
    title: string, 
    Icon: React.ElementType, 
    content: React.ReactNode, 
    iconColorClass = "text-primary",
    actionButton?: React.ReactNode,
    requiresApiKey?: boolean
  ) => (
    <section className="bg-base-DEFAULT dark:bg-neutral-800 p-6 rounded-xl shadow-lg" aria-label={title}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 flex items-center">
          <Icon size={22} className={`mr-3 ${iconColorClass}`} />
          {title}
        </h2>
        {actionButton}
      </div>
      {requiresApiKey && !isApiKeyValid && (
        <div role="alert" className="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 p-3 rounded-md text-sm mb-3 flex items-center">
            <KeyRound className="inline mr-2 h-4 w-4"/> 이 기능을 사용하려면 유효한 API 키가 필요합니다. 헤더에서 API 키를 설정해주세요.
        </div>
      )}
      {content}
    </section>
  );

  const actionButtonClasses = "flex items-center px-3 py-1.5 text-xs sm:text-sm bg-primary hover:bg-secondary text-white rounded-md shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const structuredAnalysisItems: { title: string; content: string }[] = [];
  if (detailedAnalysis) {
    const analysisParts = detailedAnalysis.split(/SECTION: (\w+)/s);
    for (let i = 1; i < analysisParts.length; i += 2) {
      const sectionName = analysisParts[i];
      const sectionContent = analysisParts[i + 1]?.trim() || "내용 없음";
      let title = sectionName;
      if (sectionName === "FinancialHealthSummary") title = "재무 건전성 요약";
      else if (sectionName === "GrowthPotential") title = "성장 잠재력";
      else if (sectionName === "RiskFactors") title = "위험 요인";
      else if (sectionName === "AnalystSentimentOverview") title = "애널리스트 동향";
      else if (sectionName === "RecentNewsImpact") title = "최근 뉴스 영향";
      structuredAnalysisItems.push({ title, content: sectionContent });
    }
  }

  const renderGroundingSources = (sources: GroundingSource[], title: string) => (
    <div className="mt-6">
      <h5 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2 flex items-center">
        <LinkIcon size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
        {title} (Google Search):
      </h5>
      <ul className="space-y-1.5 text-xs list-disc list-inside pl-1">
        {sources.map((source, idx) => (
          <li key={idx}>
            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline dark:text-sky-400 dark:hover:text-sky-300 break-all inline-flex items-center">
              <ExternalLink size={12} className="mr-1 flex-shrink-0" /> {source.title || source.uri}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 dark:text-neutral-100">
            {companyName} ({ticker})
          </h1>
          <p className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base">종목 상세 분석</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg shadow-md transition-colors text-sm sm:text-base"
          aria-label="대시보드로 돌아가기"
        >
          <ArrowLeft size={20} className="mr-2" />
          대시보드
        </button>
      </div>

      {renderSection("기업 개요", Briefcase, 
        <div className="space-y-2 text-neutral-700 dark:text-neutral-300">
          <p><strong>회사명:</strong> {companyName}</p>
          <p><strong>티커:</strong> {ticker}</p>
          {stockData?.confidenceScore && (
            <div className={`mt-2 flex items-center text-sm font-medium
              ${stockData.confidenceScore >= 75 ? 'text-green-600 dark:text-green-400' : 
                stockData.confidenceScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 
                'text-red-600 dark:text-red-400'}`}>
              <Zap size={16} className="mr-1.5" /> AI 추천 신뢰도: {stockData.confidenceScore}%
            </div>
          )}
        </div>,
        "text-indigo-500 dark:text-indigo-400"
      )}

      {initialRationale && renderSection("AI 추천 근거", Info,
        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed bg-yellow-50 dark:bg-yellow-700/20 border border-yellow-200 dark:border-yellow-600/30 p-4 rounded-lg">
          {initialRationale}
        </p>,
        "text-yellow-500 dark:text-yellow-400"
      )}
      
      {renderSection("상세 AI 분석", Brain, 
        <>
          {analysisLoading && <LoadingSpinner message="상세 분석 생성 중..." />}
          {analysisError && <div role="alert" className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-sm"><AlertCircle className="inline mr-2"/>{analysisError}</div>}
          
          {detailedAnalysis && !analysisLoading && isApiKeyValid && (
            <>
              <div className="space-y-4">
                {structuredAnalysisItems.map((item, idx) => (
                  <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-md text-primary dark:text-sky-400 mb-1.5">{item.title}</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-700 dark:text-neutral-300">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              {analysisSources.length > 0 && renderGroundingSources(analysisSources, "분석 정보 출처")}
            </>
          )}
          
          {!detailedAnalysis && !analysisLoading && !analysisError && isApiKeyValid && (
            <div className="text-center py-6 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
              <Brain size={36} className="mx-auto text-neutral-400 dark:text-neutral-500 mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                AI를 통해 {companyName}에 대한 심층 분석을 받아보세요. (버튼 클릭)
              </p>
            </div>
          )}
        </>,
        "text-green-500 dark:text-green-400",
        <button
          onClick={handleFetchDetailedAnalysis}
          disabled={analysisLoading || !isApiKeyValid}
          className={actionButtonClasses}
          aria-live="polite"
        >
          {analysisLoading ? <RefreshCw size={16} className="mr-1.5 animate-spin" /> : <Brain size={16} className="mr-1.5" />}
          {detailedAnalysis ? "분석 새로고침" : "상세 분석 생성"}
        </button>,
        true // Requires API Key
      )}
      
      {renderSection("주요 재무 지표", BarChart2,
        <>
          {indicatorsLoading && <LoadingSpinner message="재무 지표 로딩 중..." />}
          {indicatorsError && <div role="alert" className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-sm"><AlertCircle className="inline mr-2"/>{indicatorsError}</div>}
          
          {financialIndicators && !indicatorsLoading && isApiKeyValid && (
            <div className="space-y-4">
              {financialIndicators.dataAsOf && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 flex items-center">
                  <CalendarDays size={14} className="mr-1.5" />
                  데이터 기준일: {financialIndicators.dataAsOf}
                </div>
              )}
              {financialIndicators.dataComment && (
                <div className="text-xs text-neutral-600 dark:text-neutral-300 mb-3 p-2 bg-blue-50 dark:bg-blue-900/50 rounded-md border border-blue-200 dark:border-blue-700/50 flex items-start">
                  <MessageSquare size={16} className="mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{financialIndicators.dataComment}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {financialIndicators.indicators.map((indicator) => (
                  <div key={indicator.id} className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg shadow-sm">
                    <h4 className="text-sm font-semibold text-primary dark:text-sky-400 mb-1">{indicator.name}</h4>
                    <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{indicator.value}</p>
                    {indicator.notes && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{indicator.notes}</p>}
                  </div>
                ))}
              </div>
              {financialIndicators.groundingSources.length > 0 && renderGroundingSources(financialIndicators.groundingSources, "재무 지표 정보 출처")}
            </div>
          )}
          
          {!financialIndicators && !indicatorsLoading && !indicatorsError && isApiKeyValid && (
            <div className="text-center py-6 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
              <BarChart2 size={36} className="mx-auto text-neutral-400 dark:text-neutral-500 mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                AI를 통해 {companyName}의 주요 재무 지표를 확인해보세요. (버튼 클릭)
              </p>
            </div>
          )}
        </>,
        "text-blue-500 dark:text-blue-400",
        <button
          onClick={handleFetchFinancialIndicators}
          disabled={indicatorsLoading || !isApiKeyValid}
          className={actionButtonClasses}
          aria-live="polite"
        >
          {indicatorsLoading ? <RefreshCw size={16} className="mr-1.5 animate-spin" /> : <BarChart2 size={16} className="mr-1.5" />}
          {financialIndicators ? "지표 새로고침" : "재무 지표 불러오기"}
        </button>,
        true // Requires API Key
      )}

      {renderSection("관련 최신 뉴스", Newspaper,
        <>
          {newsLoading && <LoadingSpinner message="관련 뉴스 로딩 중..." />}
          {newsError && <div role="alert" className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-sm"><AlertCircle className="inline mr-2"/>{newsError}</div>}
          {!newsLoading && !newsError && relatedNews.length > 0 && isApiKeyValid && (
            <div className="grid grid-cols-1 gap-4">
              {relatedNews.map(article => (
                <NewsItem key={article.id} article={article} />
              ))}
            </div>
          )}
          {!newsLoading && !newsError && relatedNews.length === 0 && isApiKeyValid && (
            <div className="text-center py-6 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
              <Newspaper size={36} className="mx-auto text-neutral-400 dark:text-neutral-500 mb-2" />
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                버튼을 클릭하여 {companyName} 관련 최신 뉴스를 불러오세요. (최근 3개월 이내)
              </p>
            </div>
          )}
        </>,
        "text-orange-500 dark:text-orange-400",
        <button
          onClick={handleFetchRelatedNews}
          disabled={newsLoading || !isApiKeyValid}
          className={actionButtonClasses}
          aria-live="polite"
        >
          {newsLoading ? <RefreshCw size={16} className="mr-1.5 animate-spin" /> : <Newspaper size={16} className="mr-1.5" />}
          {relatedNews.length > 0 ? "뉴스 새로고침" : "관련 뉴스 불러오기"}
        </button>,
        true // Requires API Key
      )}

      {renderSection("추가 정보 및 리서치", Search,
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={googleFinanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-neutral-700 dark:text-neutral-200 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-red-500"><path d="M12.0026 10.9572L12 11L11.9969 10.9593C11.9863 10.6802 11.9392 10.4074 11.8576 10.1484C11.5178 9.07345 10.6358 8.21443 9.53097 7.91004C8.42617 7.60565 7.25197 7.96203 6.45427 8.8351L6.45231 8.83289L12.0026 10.9572ZM14.5458 8.8351L14.5477 8.83289C13.7497 7.95995 12.5786 7.60466 11.4721 7.90906C10.3656 8.21346 9.48427 9.07107 9.14389 10.1457L9.14231 10.1507L14.5458 8.8351ZM12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3ZM12 5C8.13401 5 5 8.13401 5 12C5 13.6265 5.50503 15.1299 6.33089 16.3268L16.3268 6.33089C15.1299 5.50503 13.6265 5 12 5ZM7.67325 17.6691L17.6691 7.67325C18.495 8.87014 19 10.3735 19 12C19 15.866 15.866 19 12 19C10.3735 19 8.87014 18.495 7.67325 17.6691Z"></path></svg>
            Google Finance
          </a>
          <a
            href={yahooFinanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-neutral-700 dark:text-neutral-200 font-medium"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-purple-500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-1.78 15.34l-3.27-3.23c-.18-.18-.28-.42-.28-.67s.1-.49.28-.67l.63-.62c.18-.18.42-.28.67-.28s.49.1.67.28l1.49 1.48l4.2-4.15c.18-.18.42-.28.67-.28s.49.1.67.28l.63.62c.18-.18.28.42.28.67s-.1.49-.28.67L10.9 15.34c-.18.18-.42.28-.67.28s-.49-.1-.45-.28z"></path></svg>
            Yahoo Finance
          </a>
        </div>,
        "text-gray-500 dark:text-gray-400"
      )}

      {renderSection(`AI에게 ${companyName}에 대해 더 물어보기`, MessageCircle,
        <div className="flex flex-col h-[400px]">
          <div className="flex-grow overflow-y-auto mb-4 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
          </div>
          {chatError && <div role="alert" className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded-md text-sm mb-2 text-center"><AlertCircle className="inline mr-1 h-4 w-4"/>{chatError}</div>}
          <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={!isApiKeyValid ? "API 키 설정 필요" : `${companyName}에게 질문하기...`}
              className="flex-grow p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:bg-neutral-700 dark:text-neutral-100 disabled:opacity-50"
              disabled={chatLoading || !isApiKeyValid || !chatInstance}
              aria-label="채팅 메시지 입력"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim() || !isApiKeyValid || !chatInstance}
              className="p-3 bg-primary hover:bg-secondary text-white rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="메시지 전송"
            >
              {chatLoading ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
        </div>,
        "text-purple-500 dark:text-purple-400",
        undefined, // No action button for chat section itself
        true // Requires API Key
      )}
    </div>
  );
};

export default StockDetailsPage;
