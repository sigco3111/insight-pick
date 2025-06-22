export enum InvestmentGoal {
  LONG_TERM_GROWTH = "장기 성장",
  SHORT_TERM_GAINS = "단기 수익",
  DIVIDEND_INCOME = "배당금 수익",
  CAPITAL_PRESERVATION = "자본 보존",
  BALANCED = "균형 포트폴리오",
}

export enum RiskAppetite {
  LOW = "낮음",
  MEDIUM = "중간",
  HIGH = "높음",
  VERY_HIGH = "매우 높음",
}

export enum MarketPreference {
  US = "미국 주식",
  KR = "한국 주식",
  BOTH = "둘 다 (미국 및 한국)",
}

export enum InvestmentStrategy {
  VALUE = "가치 투자",
  GROWTH = "성장주 투자",
  DIVIDEND = "배당주 투자",
  INDEX_TRACKING = "인덱스 추종",
  ESG = "ESG 투자",
  MOMENTUM = "모멘텀 투자",
  CONTRARIAN = "역발상 투자",
  SMALL_CAP = "소형주 투자",
  SECTOR_ROTATION = "섹터 순환매",
  UNDEFINED = "특정 전략 없음",
}

export interface UserProfile {
  investmentGoal: InvestmentGoal;
  riskAppetite: RiskAppetite;
  marketPreference: MarketPreference;
  investmentStrategy: InvestmentStrategy;
}

export interface StockRecommendation {
  ticker: string;
  companyName: string;
  rationale: string;
  confidenceScore?: number; // 0-100
  allocationPercentage?: number; // 0-100, AI-suggested portfolio allocation
}

export interface KeyInsight {
  insight: string;
  sourceDetails?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PortfolioData {
  portfolioSummary: string;
  stocks: StockRecommendation[];
  keyInsights: KeyInsight[];
  groundingSources: GroundingSource[];
}

export interface EconomicIndicator {
  id: string;
  name: string;
  value: string | number;
  trend: "up" | "down" | "neutral";
  lastUpdated: string;
  unit?: string;
}

export interface NewsArticle {
  id: string; // 클라이언트에서 생성
  title: string;
  summary: string;
  url: string; // Grounding을 통해 제공
  sourceName?: string; // 예: "Reuters", "yna.co.kr" 또는 웹사이트 제목
  publishedDateText?: string; // 예: "2024-07-26" 또는 "최근"
  category: string; // Gemini가 미리 정의된 목록에서 선택
}

export interface VolatilityAlertData {
  id: string;
  market: string; // 예: "글로벌 시장 변동성 (VIX 기준)" - UI에 표시될 전체 제목
  indexName?: string; // 예: "VIX", "VKOSPI" - 실제 지수 명칭
  indexValue?: number; // 예: 15.5 - 실제 지수 값
  level: "low" | "moderate" | "high" | "extreme";
  message: string;
  timestamp: string;
}

// For Gemini API response parsing for portfolio recommendations
export interface GeminiTextParseResult {
  portfolioSummary: string;
  stockRecommendations: StockRecommendation[];
  keyInsights: KeyInsight[];
}

// For Grounding Metadata
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

// For Stock Financial Indicators
export interface StockFinancialIndicator {
  id: string; // e.g., 'pe_ratio', 'eps', 'market_cap', 'dividend_yield'
  name: string; // e.g., "P/E 비율", "주당순이익 (EPS)"
  value: string | number; // e.g., 15.5, "2.50 USD"
  notes?: string; // e.g., "TTM", "최근 분기", "연간"
}

export interface StockFinancialsData {
  indicators: StockFinancialIndicator[];
  dataAsOf?: string; // e.g., "2024-07-29" 또는 "최신 자료 기준"
  dataComment?: string; // Optional comment from AI about the data
  groundingSources: GroundingSource[];
}

// For Stock Detail Page Chat
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}