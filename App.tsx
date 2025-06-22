
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import UserInputForm from './components/UserInputForm';
import LoadingSpinner from './components/LoadingSpinner';
import StockRecommendationCard from './components/StockRecommendationCard';
import NewsItem from './components/NewsItem';
import VolatilityAlert from './components/VolatilityAlert';
import ChartComponent from './components/ChartComponent';
import UserProfileSummaryCard from './components/UserProfileSummaryCard';
import StockDetailsPage from './components/StockDetailsPage';
import { 
  getPortfolioRecommendations, 
  fetchRecentFinancialNews,
  updateGeminiApiKey // New import
} from './services/geminiService';
import { fetchEconomicIndicators, fetchInternationalVolatility, fetchDomesticVolatility } from './services/marketDataService';
import { UserProfile, PortfolioData, EconomicIndicator, NewsArticle, VolatilityAlertData, MarketPreference, InvestmentStrategy, StockRecommendation } from './types';
import { 
  Lightbulb, AlertCircle, Link as LinkIcon, BarChart2, Newspaper, TrendingUp as TrendingUpIcon, 
  ExternalLink, BriefcaseBusiness, BarChartHorizontalBig, LineChart as LineChartIcon, ListChecks, 
  Globe, MapPin, Filter, KeyRound
} from 'lucide-react';

type Theme = 'light' | 'dark';
type EconomicChartType = 'bar' | 'line';

const NEWS_CATEGORIES = ["전체", "기술", "금융", "글로벌 경제", "산업 동향", "시장 분석", "부동산", "에너지", "기업 뉴스", "기타"];
const USER_PROFILE_LOCAL_STORAGE_KEY = 'insightPickUserProfile';
const GEMINI_API_KEY_LOCAL_STORAGE_KEY = 'geminiApiKey';

interface SelectedStockDetail {
  ticker: string;
  companyName: string;
  rationale?: string;
  stockData?: StockRecommendation; 
}

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const savedProfileString = localStorage.getItem(USER_PROFILE_LOCAL_STORAGE_KEY);
      if (savedProfileString) {
        return JSON.parse(savedProfileString) as UserProfile;
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage on App mount:", error);
    }
    return null;
  });

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState<boolean>(false);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [economicIndicators, setEconomicIndicators] = useState<EconomicIndicator[]>([]);
  const [marketNews, setMarketNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [internationalVolatilityAlert, setInternationalVolatilityAlert] = useState<VolatilityAlertData | null>(null);
  const [domesticVolatilityAlert, setDomesticVolatilityAlert] = useState<VolatilityAlertData | null>(null);

  const [selectedStockForDetail, setSelectedStockForDetail] = useState<SelectedStockDetail | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'light';
  });

  const [economicChartType, setEconomicChartType] = useState<EconomicChartType>(() => {
    const savedChartType = localStorage.getItem('economicChartType') as EconomicChartType | null;
    return savedChartType || 'bar';
  });

  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>(NEWS_CATEGORIES[0]);
  
  // API Key Management State
  const [currentGlobalApiKey, setCurrentGlobalApiKey] = useState<string | null>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
  const [initialEnvApiKeyExists, setInitialEnvApiKeyExists] = useState<boolean>(false);


  useEffect(() => {
    const envKey = process.env.API_KEY;
    setInitialEnvApiKeyExists(!!envKey && envKey !== "YOUR_API_KEY_PLACEHOLDER_IGNORE");
    
    const storedKey = localStorage.getItem(GEMINI_API_KEY_LOCAL_STORAGE_KEY);
    const keyToUse = storedKey || envKey;
    
    setCurrentGlobalApiKey(keyToUse || null);
    const isValid = updateGeminiApiKey(keyToUse || null);
    setIsApiKeyValid(isValid);

    if (!isValid && !storedKey && !envKey) {
        console.warn("Gemini API Key가 로컬 스토리지 또는 환경 변수 어디에도 설정되어 있지 않습니다. 헤더에서 키를 설정해주세요.");
    } else if (!isValid && (storedKey || envKey)) {
        console.warn("제공된 Gemini API Key가 유효하지 않거나 초기화에 실패했습니다. 헤더에서 키를 확인하거나 새로 입력해주세요.");
    }

  }, []);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('economicChartType', economicChartType);
  }, [economicChartType]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleEconomicChartTypeChange = (type: EconomicChartType) => {
    setEconomicChartType(type);
  };

  const handleNewsCategoryChange = (category: string) => {
    setSelectedNewsCategory(category);
  };

  const handleSaveApiKey = (newKey: string) => {
    localStorage.setItem(GEMINI_API_KEY_LOCAL_STORAGE_KEY, newKey);
    setCurrentGlobalApiKey(newKey);
    const isValid = updateGeminiApiKey(newKey);
    setIsApiKeyValid(isValid);
    if (isValid) {
        // If key becomes valid, try to refetch data that might have failed
        if (newsError) fetchInitialDashboardData();
        if (error && userProfile) handleProfileSubmit(userProfile, true); // Retry profile submission if it previously failed
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem(GEMINI_API_KEY_LOCAL_STORAGE_KEY);
    const envKey = process.env.API_KEY;
    setCurrentGlobalApiKey(envKey || null);
    const isValid = updateGeminiApiKey(envKey || null);
    setIsApiKeyValid(isValid);
  };

  const fetchInitialDashboardData = useCallback(async () => {
    setIsLoadingInitialData(true); // For non-news general data
    
    // For news specific loading and error
    if (isApiKeyValid) {
        setIsLoadingNews(true);
        setNewsError(null);
    } else {
        setNewsError("최신 뉴스를 불러오려면 유효한 API 키가 필요합니다.");
        setIsLoadingNews(false); // Don't attempt to load news if key is invalid
    }
    setError(null); // Clear general error

    try {
      const indicatorsPromise = fetchEconomicIndicators();
      const intlVolatilityPromise = fetchInternationalVolatility();
      const domVolatilityPromise = fetchDomesticVolatility();
      
      let newsPromise: Promise<NewsArticle[]> = Promise.resolve([]);
      if (isApiKeyValid) {
        newsPromise = fetchRecentFinancialNews().catch(e => { 
          console.error("뉴스 데이터 로딩 오류 (Promise.all):", e);
          setNewsError(e.message || "최신 뉴스를 불러오는데 실패했습니다.");
          return [];
        });
      }

      const [indicators, intlVolatility, domVolatility, news] = await Promise.all([
        indicatorsPromise,
        intlVolatilityPromise,
        domVolatilityPromise,
        newsPromise
      ]);

      setEconomicIndicators(indicators);
      setInternationalVolatilityAlert(intlVolatility);
      setDomesticVolatilityAlert(domVolatility);
      if (isApiKeyValid) { // Only set news if we attempted to fetch it
        setMarketNews(news);
      } else {
        setMarketNews([]); // Clear news if API key is not valid
      }

    } catch (e: any) {
      // General error for non-news items if they fail
      if (!newsError && !e.message.includes("뉴스")) {
         setError("초기 시장 데이터를 불러오는데 실패했습니다 (지표/변동성).");
      }
      console.error("초기 대시보드 데이터 로딩 중 포괄적 오류:", e);
    } finally {
      setIsLoadingInitialData(false);
      if (isApiKeyValid || newsError) setIsLoadingNews(false); // Stop news loading if key was valid or an error occurred
    }
  }, [isApiKeyValid]); // Added isApiKeyValid. newsError removed to avoid loop if newsError itself changes.

  useEffect(() => {
    fetchInitialDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiKeyValid]); // Re-fetch initial data if API key validity changes


  const handleProfileSubmit = async (profile: UserProfile, isRetry: boolean = false) => {
    if (!isApiKeyValid) {
      setError("포트폴리오 추천을 받으려면 유효한 API 키가 필요합니다. 헤더에서 API 키를 설정해주세요.");
      setIsFetchingRecommendations(false);
      return;
    }
    setUserProfile(profile); 
    setIsFetchingRecommendations(true);
    setError(null);
    if (!isRetry) { // Don't clear portfolio data on retry if it was just an API key issue
        setPortfolioData(null);
        setSelectedStockForDetail(null); 
    }

    try {
      const { parsedData, groundingSources } = await getPortfolioRecommendations(profile);
      setPortfolioData({
        portfolioSummary: parsedData.portfolioSummary,
        stocks: parsedData.stockRecommendations,
        keyInsights: parsedData.keyInsights,
        groundingSources: groundingSources,
      });
    } catch (e: any) {
      setError(e.message || "포트폴리오 추천 정보를 가져오는데 실패했습니다.");
      console.error("handleProfileSubmit 오류:", e);
    } finally {
      setIsFetchingRecommendations(false);
    }
  };

  const handleResetForm = () => {
    setUserProfile(null);
    setPortfolioData(null);
    setError(null);
    setNewsError(null);
    setSelectedNewsCategory(NEWS_CATEGORIES[0]);
    setSelectedStockForDetail(null);
  };

  const handleViewStockDetails = (ticker: string, companyName: string, rationale?: string, stockData?: StockRecommendation) => {
    setSelectedStockForDetail({ ticker, companyName, rationale, stockData });
    window.scrollTo(0, 0); 
  };
  
  const getWelcomeMessage = () => {
    if (!isApiKeyValid && !userProfile) {
        return "AI 기반 금융 인사이트를 사용하려면 먼저 헤더에서 유효한 Gemini API 키를 설정해주세요.";
    }
    if (!isApiKeyValid && userProfile) {
        return `프로필이 설정되었습니다. 하지만, 인사이트를 생성하려면 유효한 Gemini API 키가 필요합니다. 헤더에서 키를 설정해주세요.`;
    }
    if (!userProfile) {
      return "맞춤형 주식 추천을 받으려면 투자 프로필을 설정하세요.";
    }
    
    let marketInfo = "";
    switch (userProfile.marketPreference) {
      case MarketPreference.US: marketInfo = "미국 주식 시장"; break;
      case MarketPreference.KR: marketInfo = "한국 주식 시장"; break;
      case MarketPreference.BOTH: marketInfo = "미국 및 한국 주식 시장"; break;
      default: marketInfo = "선택된 시장";
    }

    let strategyInfo = "";
    if (userProfile.investmentStrategy && userProfile.investmentStrategy !== InvestmentStrategy.UNDEFINED) {
      strategyInfo = `, '${userProfile.investmentStrategy}' 전략`;
    }

    if (portfolioData) {
      return `${userProfile.investmentGoal} (${userProfile.riskAppetite} 위험도), ${marketInfo} 선호${strategyInfo}에 따른 AI 기반 인사이트`;
    }
    if (isFetchingRecommendations) {
      return `${userProfile.investmentGoal} 프로필, ${marketInfo} 선호${strategyInfo}에 대한 인사이트를 생성 중입니다...`;
    }
    return `프로필이 설정되었습니다. '${userProfile.investmentGoal}', ${marketInfo} 선호${strategyInfo}. 인사이트를 생성하려면 버튼을 클릭하세요.`;
  };

  const filteredMarketNews = selectedNewsCategory === NEWS_CATEGORIES[0]
    ? marketNews
    : marketNews.filter(article => article.category === selectedNewsCategory);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-900 font-sans transition-colors duration-300">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isApiKeyValid={isApiKeyValid}
        currentGlobalApiKey={currentGlobalApiKey}
        onSaveApiKey={handleSaveApiKey}
        onClearApiKey={handleClearApiKey}
        initialEnvApiKeyExists={initialEnvApiKeyExists}
      />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isApiKeyValid && (
          <div role="alert" className="mb-6 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg shadow-md flex items-center">
            <KeyRound className="h-5 w-5 mr-3 text-red-500 dark:text-red-400" />
            <span>
              Gemini API 키가 필요합니다. 헤더의 열쇠 아이콘을 클릭하여 API 키를 설정해주세요. 
              API 키가 없으면 AI 기반 기능(포트폴리오 추천, 뉴스, 상세 분석 등)을 사용할 수 없습니다.
            </span>
          </div>
        )}

        {selectedStockForDetail ? (
          <StockDetailsPage
            ticker={selectedStockForDetail.ticker}
            companyName={selectedStockForDetail.companyName}
            initialRationale={selectedStockForDetail.rationale}
            stockData={selectedStockForDetail.stockData}
            onBack={() => setSelectedStockForDetail(null)}
            isApiKeyValid={isApiKeyValid}
            currentGlobalApiKey={currentGlobalApiKey}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <aside className="lg:col-span-1 space-y-8">
              <section aria-labelledby="user-profile-heading">
                <h2 id="user-profile-heading" className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">나의 투자 프로필</h2>
                <UserInputForm 
                  onSubmit={handleProfileSubmit} 
                  onReset={handleResetForm} 
                  isLoading={isFetchingRecommendations}
                  initialProfile={userProfile}
                />
              </section>

              {userProfile && !isFetchingRecommendations && (
                <section aria-labelledby="user-profile-summary-heading">
                  <h2 id="user-profile-summary-heading" className="sr-only">현재 프로필 요약</h2>
                  <UserProfileSummaryCard profile={userProfile} />
                </section>
              )}
              
              <section aria-labelledby="international-volatility-heading">
                <h2 id="international-volatility-heading" className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center">
                  <Globe size={22} className="mr-2 text-blue-500" /> 국제 시장 변동성
                </h2>
                {isLoadingInitialData && !internationalVolatilityAlert ? (
                  <LoadingSpinner message="국제 변동성 로딩 중..." />
                ) : (
                  <VolatilityAlert alert={internationalVolatilityAlert} />
                )}
              </section>

              <section aria-labelledby="domestic-volatility-heading">
                <h2 id="domestic-volatility-heading" className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center">
                  <MapPin size={22} className="mr-2 text-green-500" /> 국내 시장 변동성
                </h2>
                {isLoadingInitialData && !domesticVolatilityAlert ? (
                  <LoadingSpinner message="국내 변동성 로딩 중..." />
                ) : (
                  <VolatilityAlert alert={domesticVolatilityAlert} />
                )}
              </section>

              <section aria-labelledby="economic-indicators-heading">
                <div className="flex justify-between items-center mb-4">
                  <h2 id="economic-indicators-heading" className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 flex items-center">
                    <BarChart2 size={24} className="mr-2 text-primary" /> 경제 스냅샷
                  </h2>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEconomicChartTypeChange('bar')}
                      aria-pressed={economicChartType === 'bar'}
                      className={`p-1.5 rounded-md ${economicChartType === 'bar' ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      title="막대 차트 보기"
                    >
                      <BarChartHorizontalBig size={18} />
                      <span className="sr-only">막대 차트</span>
                    </button>
                    <button
                      onClick={() => handleEconomicChartTypeChange('line')}
                      aria-pressed={economicChartType === 'line'}
                      className={`p-1.5 rounded-md ${economicChartType === 'line' ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}
                      title="선형 차트 보기"
                    >
                      <LineChartIcon size={18} />
                      <span className="sr-only">선형 차트</span>
                    </button>
                  </div>
                </div>
                {isLoadingInitialData && economicIndicators.length === 0 ? (
                  <LoadingSpinner message="경제 지표 로딩 중..." />
                ) : economicIndicators.length > 0 ? (
                  <ChartComponent data={economicIndicators} chartType={economicChartType}/>
                ) : !isLoadingInitialData && economicIndicators.length === 0 && !error && !newsError ? (
                  <p className="text-neutral-500 dark:text-neutral-400">경제 지표 데이터가 없습니다.</p>
                ) : null }
              </section>
            </aside>

            <div className="lg:col-span-2 space-y-8">
              <section aria-labelledby="portfolio-recommendation-heading" className="bg-base-DEFAULT dark:bg-neutral-800 p-6 rounded-xl shadow-lg">
                <h2 id="portfolio-recommendation-heading" className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-1 flex items-center">
                  <TrendingUpIcon size={28} className="mr-2 text-accent" /> 포트폴리오 인사이트
                </h2>
                <p className="text-neutral-600 dark:text-neutral-300 mb-6">{getWelcomeMessage()}</p>

                {isFetchingRecommendations && <LoadingSpinner message="개인 맞춤형 포트폴리오 생성 중..." />}
                {error && <div role="alert" className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 dark:bg-opacity-30 p-4 rounded-md shadow"><AlertCircle className="inline mr-2"/>{error}</div>}

                {portfolioData && !isFetchingRecommendations && isApiKeyValid && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3 flex items-center">
                        <Lightbulb size={22} className="mr-2 text-yellow-500" /> AI 포트폴리오 요약
                      </h3>
                      <p className="text-neutral-700 dark:text-neutral-200 bg-yellow-50 dark:bg-yellow-700/20 border border-yellow-200 dark:border-yellow-600/30 p-4 rounded-lg">
                        {portfolioData.portfolioSummary}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">추천 주식</h3>
                      {portfolioData.stocks.length === 0 && <p className="text-neutral-500 dark:text-neutral-400">현재 조건에 맞는 추천 주식이 없습니다.</p>}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {portfolioData.stocks.map((stock, index) => (
                          <StockRecommendationCard 
                            key={index} 
                            stock={stock} 
                            onViewDetails={handleViewStockDetails}
                          />
                        ))}
                      </div>
                    </div>

                    {portfolioData.keyInsights.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3 flex items-center">
                          <ListChecks size={22} className="mr-2 text-blue-500" /> 주요 시장 인사이트
                        </h3>
                        <ul className="space-y-3">
                          {portfolioData.keyInsights.map((insight, index) => (
                            <li 
                              key={index} 
                              className="bg-blue-50 dark:bg-blue-900/60 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700/50 shadow-sm"
                            >
                              <p>{insight.insight}</p>
                              {insight.sourceDetails && <p className="text-xs mt-1 opacity-75">{insight.sourceDetails}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {portfolioData.groundingSources.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3 flex items-center">
                          <LinkIcon size={20} className="mr-2 text-gray-500 dark:text-gray-400"/> 정보 출처 (Google Search)
                        </h3>
                        <ul className="space-y-3 text-sm">
                          {portfolioData.groundingSources.map((source, index) => (
                            <li 
                              key={index} 
                              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200 ease-in-out"
                            >
                              <a 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary hover:underline flex items-center dark:text-sky-400 dark:hover:text-sky-300"
                              >
                                <ExternalLink size={14} className="mr-2 flex-shrink-0" />
                                <span className="truncate">{source.title || source.uri}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!isFetchingRecommendations && (!portfolioData || !isApiKeyValid) && !error && (
                  <div className="text-center py-10">
                    <BriefcaseBusiness size={48} className="mx-auto text-neutral-400 dark:text-neutral-500 mb-4" />
                     <p className="text-neutral-500 dark:text-neutral-400 text-lg">
                      {isApiKeyValid ? 
                        (userProfile ? 
                          `'${userProfile.investmentGoal}' 프로필에 대한 인사이트를 생성하려면 "포트폴리오 인사이트 받기" 버튼을 클릭하세요.`
                          : "개인 맞춤형 금융 인사이트가 여기에 표시됩니다. 시작하려면 투자 프로필을 설정하세요.")
                        : "API 키가 유효하지 않습니다. 헤더에서 API 키를 설정한 후 다시 시도해주세요."
                      }
                    </p>
                    {isApiKeyValid && !userProfile && <p className="text-neutral-400 dark:text-neutral-500">시작하려면 투자 목표와 위험 선호도를 선택해주세요.</p>}
                  </div>
                )}
              </section>
              
              <section aria-labelledby="market-news-heading">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h2 id="market-news-heading" className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 flex items-center mb-3 sm:mb-0">
                    <Newspaper size={24} className="mr-2 text-secondary" /> 최신 금융 뉴스
                  </h2>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="뉴스 카테고리 필터">
                    {NEWS_CATEGORIES.filter(cat => cat !== "기업 뉴스").map(category => ( 
                      <button
                        key={category}
                        onClick={() => handleNewsCategoryChange(category)}
                        aria-pressed={selectedNewsCategory === category}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors duration-150 ease-in-out
                          ${selectedNewsCategory === category 
                            ? 'bg-secondary text-white shadow-md' 
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                          }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                {isLoadingNews && isApiKeyValid && <LoadingSpinner message="최신 뉴스 로딩 중..." />}
                {newsError && <div role="alert" className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 dark:bg-opacity-30 p-4 rounded-md shadow"><AlertCircle className="inline mr-2"/>{newsError}</div>}
                
                {!isLoadingNews && !newsError && isApiKeyValid && filteredMarketNews.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredMarketNews.map(article => (
                      <NewsItem key={article.id} article={article} />
                    ))}
                  </div>
                )}
                {!isLoadingNews && !newsError && isApiKeyValid && marketNews.length > 0 && filteredMarketNews.length === 0 && (
                  <div className="text-center py-10">
                      <Filter size={48} className="mx-auto text-neutral-400 dark:text-neutral-500 mb-4" />
                      <p className="text-neutral-500 dark:text-neutral-400 text-lg">
                        선택하신 '{selectedNewsCategory}' 카테고리에는 뉴스가 없습니다.
                      </p>
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">다른 카테고리를 선택해보세요.</p>
                    </div>
                )}
                {(!isLoadingNews || !isApiKeyValid) && !newsError && marketNews.length === 0 && (
                   <div className="text-center py-10">
                     <Newspaper size={48} className="mx-auto text-neutral-400 dark:text-neutral-500 mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                        {isApiKeyValid ? "표시할 뉴스가 없습니다. 잠시 후 다시 시도해주세요." : "API 키가 설정되어야 뉴스를 불러올 수 있습니다."}
                    </p>
                   </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
