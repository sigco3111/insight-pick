
import { GoogleGenAI, GenerateContentResponse, GroundingMetadata } from "@google/genai";
import { GEMINI_MODEL_NAME_TEXT } from '../constants';
import { UserProfile, GeminiTextParseResult, StockRecommendation, KeyInsight, GroundingSource, MarketPreference, InvestmentStrategy, NewsArticle, StockFinancialsData, StockFinancialIndicator } from '../types';

let geminiAI: GoogleGenAI | null = null;

// 뉴스 카테고리 (App.tsx와 동기화 필요)
const NEWS_CATEGORIES_FOR_PROMPT = ["기술", "금융", "글로벌 경제", "산업 동향", "시장 분석", "부동산", "에너지", "기업 뉴스"];

export const updateGeminiApiKey = (apiKey: string | null): boolean => {
  if (apiKey && apiKey.trim() !== "" && apiKey !== "YOUR_API_KEY_PLACEHOLDER_IGNORE") { // "YOUR_API_KEY_PLACEHOLDER_IGNORE" is just a string unlikely to be a real key
    try {
      geminiAI = new GoogleGenAI({ apiKey });
      console.log("Gemini AI client updated/initialized successfully.");
      return true;
    } catch (error) {
      console.error("Failed to initialize Gemini AI client with the provided key:", error);
      geminiAI = null;
      return false;
    }
  } else {
    geminiAI = null;
    console.log("Gemini AI client cleared or API key is invalid/missing.");
    return false;
  }
};

export const getGeminiClient = (): GoogleGenAI | null => {
  return geminiAI;
};

const ensureClient = (): GoogleGenAI => {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API Key가 설정되지 않았거나 유효하지 않습니다. 헤더 메뉴에서 API 키를 입력하고 저장해주세요.");
  }
  return client;
}

function parseGeminiResponse(text: string): GeminiTextParseResult {
  const result: GeminiTextParseResult = {
    portfolioSummary: "",
    stockRecommendations: [],
    keyInsights: [],
  };

  let cleanText = text.replace(/^```json\s*|```\s*$/g, '').trim();

  const sections = cleanText.split(/SECTION: (\w+)/s);

  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i].trim();
    const sectionContent = sections[i + 1].trim();

    if (sectionName === "PortfolioSummary") {
      result.portfolioSummary = sectionContent;
    } else if (sectionName === "StockRecommendations") {
      const stocksText = sectionContent.split(/- Ticker:/s).slice(1);
      stocksText.forEach(stockStr => {
        const stock: Partial<StockRecommendation> = {};
        
        const tickerMatch = stockStr.match(/^\s*([\w.-]+)/); 
        if (tickerMatch) stock.ticker = tickerMatch[1].trim();

        const companyNameMatch = stockStr.match(/CompanyName:\s*(.*?)\n/s);
        if (companyNameMatch) stock.companyName = companyNameMatch[1].trim();
        
        const rationaleMatch = stockStr.match(/Rationale:\s*(.*?)\n(?:- ConfidenceScore|- AllocationPercentage|\s*$)/s);
        if (rationaleMatch) stock.rationale = rationaleMatch[1].trim();
        
        const confidenceScoreMatch = stockStr.match(/ConfidenceScore:\s*(\d+)/);
        if (confidenceScoreMatch) stock.confidenceScore = parseInt(confidenceScoreMatch[1], 10);

        const allocationPercentageMatch = stockStr.match(/AllocationPercentage:\s*(\d+\.?\d*)/);
        if (allocationPercentageMatch) stock.allocationPercentage = parseFloat(allocationPercentageMatch[1]);

        if (stock.ticker && stock.companyName && stock.rationale) {
          result.stockRecommendations.push(stock as StockRecommendation);
        } else {
            console.warn("Skipping stock due to missing fields:", stockStr, stock);
        }
      });

      if (result.stockRecommendations.length > 0) {
        const allStocksHavePercentage = result.stockRecommendations.every(
          s => typeof s.allocationPercentage === 'number' && s.allocationPercentage >= 0
        );
        let totalPercentage = 0;

        if (allStocksHavePercentage) {
          totalPercentage = result.stockRecommendations.reduce((sum, s) => sum + s.allocationPercentage!, 0);

          if (Math.abs(totalPercentage - 100) > 5) { 
            console.warn(`Total allocation (${totalPercentage}%) is significantly different from 100%. Clearing all allocation percentages for fallback to equal distribution.`);
            result.stockRecommendations.forEach(s => delete s.allocationPercentage);
          } else if (Math.abs(totalPercentage - 100) > 0.1) { 
            console.warn(`Normalizing allocation percentages. Original sum: ${totalPercentage}%.`);
            const factor = 100 / totalPercentage;
            result.stockRecommendations.forEach(s => {
              s.allocationPercentage = parseFloat((s.allocationPercentage! * factor).toFixed(1));
            });
          }
        } else { 
          console.warn(`Not all stocks have valid allocation percentages. Clearing all allocation percentages for fallback to equal distribution.`);
          result.stockRecommendations.forEach(s => delete s.allocationPercentage);
        }
      }

    } else if (sectionName === "KeyInsights") {
      const insightsText = sectionContent.split('- Insight:').slice(1);
      insightsText.forEach(insightStr => {
        const insight: Partial<KeyInsight> = {};
        
        const insightTextMatch = insightStr.match(/(.*?)\n(?:- \(Optional\) SourceDetails|\s*$)/s);
        if (insightTextMatch) insight.insight = insightTextMatch[1].trim();

        const sourceDetailsMatch = insightStr.match(/\(Optional\) SourceDetails:\s*(.*?)(?:\n---END OF RESPONSE---|\s*$)/s);
        if (sourceDetailsMatch) insight.sourceDetails = sourceDetailsMatch[1].trim();
        
        if(insight.insight) {
            result.keyInsights.push(insight as KeyInsight);
        }
      });
    }
  }
  return result;
}


export const getPortfolioRecommendations = async (
  userProfile: UserProfile
): Promise<{ parsedData: GeminiTextParseResult; groundingSources: GroundingSource[] }> => {
  const client = ensureClient();
  
  let marketSpecificInstructions = "";
  let tickerExample = "AAPL, GOOG (미국 주식)";

  if (userProfile.marketPreference === MarketPreference.KR) {
    marketSpecificInstructions = "주로 한국 주식 시장(KOSPI, KOSDAQ)의 주식을 추천해주세요.";
    tickerExample = "005930.KS, 035720.KS (한국 주식)";
  } else if (userProfile.marketPreference === MarketPreference.US) {
    marketSpecificInstructions = "주로 미국 주식 시장(NYSE, NASDAQ)의 주식을 추천해주세요.";
    tickerExample = "AAPL, MSFT (미국 주식)";
  } else if (userProfile.marketPreference === MarketPreference.BOTH) {
    marketSpecificInstructions = "미국 주식 시장과 한국 주식 시장의 주식을 혼합하여 추천해주세요.";
    tickerExample = "AAPL (미국 주식), 005930.KS (한국 주식)";
  }

  let strategyInstruction = "";
  if (userProfile.investmentStrategy && userProfile.investmentStrategy !== InvestmentStrategy.UNDEFINED) {
    strategyInstruction = `사용자의 주요 투자 전략은 '${userProfile.investmentStrategy}'입니다. 이 전략에 부합하는 종목을 우선적으로 고려하고, 추천 근거에 해당 전략과의 연관성을 언급해주세요.`;
  } else {
    strategyInstruction = "사용자는 특정 투자 전략을 선택하지 않았습니다. 전반적인 시장 상황과 사용자 프로필을 고려하여 추천해주세요.";
  }
  
  const prompt = `
당신은 인사이트픽(InsightPick)이라는 이름의 전문 금융 자문 AI입니다.
사용자 프로필:
- 투자 목표: ${userProfile.investmentGoal}
- 위험 선호도: ${userProfile.riskAppetite}
- 선호 시장: ${userProfile.marketPreference}
- 투자 전략: ${userProfile.investmentStrategy}

${marketSpecificInstructions}
${strategyInstruction}
최신 경제 지표, 시장 동향, 금융 뉴스(Google Search를 통해 획득)를 기반으로 응답해주세요:

각 섹션에 명확하게 레이블을 붙여 다음 정보를 제공해주세요.
\`\`\`json과 같은 마크다운 코드 펜스는 사용하지 마세요.

SECTION: PortfolioSummary
[포트폴리오 전략에 대한 간략한 전체 요약(최대 3문장)과 이것이 사용자 프로필(투자 목표, 위험 선호도, 투자 전략 포함)에 적합한 이유를 제공해주세요.]

SECTION: StockRecommendations
[선택한 시장 선호도와 투자 전략에 맞춰 3-5개의 주식 추천 목록을 제공해주세요. 각 주식에 대해 다음 정보를 포함해주세요. 각 추천은 "- Ticker:"로 시작해야 합니다.
또한, 추천된 각 주식에 대해, 전체 포트폴리오 내에서 해당 주식에 할당할 최적의 비율(%)을 AllocationPercentage 필드에 명시해주세요. 모든 AllocationPercentage의 합계는 100%가 되어야 합니다. 사용자의 위험 선호도, 투자 목표, 그리고 각 주식의 잠재력과 위험도를 고려하여 분배 비율을 결정해주세요. 만약 특정 주식에 대한 할당 비율 추천이 어렵다면, 해당 필드를 생략하거나 0으로 설정할 수 있습니다.]
- Ticker: [티커 심볼, 예: ${tickerExample}]
- CompanyName: [전체 회사명]
- Rationale: [현재 시장 상황, 뉴스, 그리고 사용자의 투자 전략과 연결된 간결한 근거. 최대 2문장.]
- ConfidenceScore: [사용 가능한 정보를 바탕으로 추정할 수 있다면 0에서 100까지의 숫자]
- AllocationPercentage: [이 주식에 대한 포트폴리오 할당 비율(%). 모든 추천 주식의 할당 비율 합계는 100%가 되어야 합니다. 예: 30은 30%를 의미. 제공할 수 없다면 0 또는 생략]

SECTION: KeyInsights
[이러한 추천에 영향을 준 2-3가지 주요 시장 인사이트 또는 뉴스 스니펫 목록을 제공해주세요. 각 인사이트에 대해 다음 정보를 포함해주세요:]
- Insight: [인사이트 또는 뉴스 요약]
- (Optional) SourceDetails: [검색 결과에서 직접 가져온 경우, 간략히 언급. 예: "출처: example.com의 뉴스 기사 제목"]

---END OF RESPONSE---
`;

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_MODEL_NAME_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || "";
    const parsedData = parseGeminiResponse(rawText);
    
    const groundingMeta = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    const groundingSources: GroundingSource[] = [];
    if (groundingMeta?.groundingChunks) {
      groundingMeta.groundingChunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          groundingSources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    return { parsedData, groundingSources };

  } catch (error) {
    console.error("포트폴리오 추천 정보를 가져오는 중 오류 발생:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API 오류: ${error.message}`);
    }
    throw new Error("추천 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.");
  }
};

const extractJsonFromString = (text: string): string => {
  let jsonString = text.trim();
  
  const fenceMatch = jsonString.match(/^```(?:json)?\s*\n?(.*?)\n?\s*```$/s);
  if (fenceMatch && fenceMatch[1]) {
    jsonString = fenceMatch[1].trim();
  } else {
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');

    let startIndex = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex !== -1) {
      jsonString = jsonString.substring(startIndex);
    }
  }
  return jsonString;
};


export const fetchRecentFinancialNews = async (): Promise<NewsArticle[]> => {
  const client = ensureClient();

  const prompt = `
당신은 최신 금융 뉴스 애그리게이터 AI입니다. Google Search를 사용하여 최근 24-48시간 동안의 주요 금융 뉴스 기사 5개를 찾아주세요.
각 뉴스 기사에 대해 다음 정보를 포함하는 **완벽하게 유효한 JSON 배열 형식**으로 응답해주세요. **JSON 문자열 값 내부에 큰따옴표(")가 포함된 경우, 반드시 백슬래시(\\)로 이스케이프 처리해주세요(예: "잘못된 \\"제목\\"" -> "잘못된 \\\\\\"제목\\\\\\"").**
[
  {
    "title": "뉴스 기사 제목",
    "summary": "뉴스 기사에 대한 간략한 요약 (2-3 문장)",
    "url": "실제 뉴스 기사 URL (Google Search 결과에서 가져옴)",
    "sourceName": "뉴스 출처 또는 웹사이트명 (예: 'Reuters', 'Bloomberg', 'yna.co.kr')",
    "category": "다음 카테고리 중 하나: ${NEWS_CATEGORIES_FOR_PROMPT.filter(c => c !== "기업 뉴스").join(", ")}",
    "publishedDateText": "발행일 또는 '최근' (정확한 날짜를 알 수 없는 경우)"
  }
]
JSON 응답은 반드시 이 배열 형식이어야 하며, 다른 텍스트는 포함하지 마세요. 각 기사의 URL은 Google Search를 통해 확인된 실제 접근 가능한 URL이어야 합니다. **응답 시작부터 끝까지 오직 JSON 배열만 포함해야 합니다. 코드 블록 펜스(예: \`\`\`json ... \`\`\`)를 사용하지 마세요.**
`;

  let rawApiResponseText = "";
  let jsonToParse = "";
  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_MODEL_NAME_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    rawApiResponseText = response.text || "";
    jsonToParse = extractJsonFromString(rawApiResponseText);
    
    let parsedNewsData: Omit<NewsArticle, 'id'>[] = [];
    try {
      parsedNewsData = JSON.parse(jsonToParse);
    } catch (e) {
      console.error("뉴스 JSON 파싱 실패:", e, "\n파싱 시도 텍스트:", jsonToParse, "\n원본 API 응답 전체:", rawApiResponseText);
      throw new Error(`Gemini API로부터 유효한 뉴스 데이터를 파싱할 수 없습니다. 원본 오류: ${(e as Error).message}. 시도된 텍스트: '${jsonToParse.substring(0,100)}...'`);
    }

    if (!Array.isArray(parsedNewsData)) {
        console.error("파싱된 뉴스 데이터가 배열이 아닙니다:", parsedNewsData);
        throw new Error("Gemini API로부터 뉴스 배열을 받지 못했습니다.");
    }

    const newsArticles: NewsArticle[] = parsedNewsData.map((item, index) => ({
      ...item,
      id: `news-${Date.now()}-${index}`,
      url: item.url || '#',
      category: NEWS_CATEGORIES_FOR_PROMPT.includes(item.category) ? item.category : "기타",
      sourceName: item.sourceName || "출처 미상",
      publishedDateText: item.publishedDateText || "최근",
    }));
    
    return newsArticles;

  } catch (error) {
    console.error("최신 금융 뉴스 정보를 가져오는 중 오류 발생:", error);
    if (error instanceof Error && error.message.startsWith("Gemini API로부터 유효한 뉴스 데이터를 파싱할 수 없습니다")) {
        throw error;
    } else if (error instanceof Error && error.message.startsWith("Gemini API Key가 설정되지 않았거나 유효하지 않습니다")) {
        throw error; // Propagate specific API key error
    } else if (error instanceof Error) {
        throw new Error(`Gemini API 오류 (뉴스): ${error.message}`);
    }
    throw new Error("뉴스 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.");
  }
};

export const getDetailedStockAnalysis = async (
  ticker: string,
  companyName: string
): Promise<{ analysis: string; groundingSources: GroundingSource[] }> => {
  const client = ensureClient();

  const prompt = `
당신은 전문 금융 애널리스트 AI입니다. 회사명 ${companyName}(티커: ${ticker})에 대한 상세 분석을 제공해주세요.
Google Search를 통해 발견할 수 있는 정보에 집중하고, 응답을 명확하게 구조화해주세요.
\`\`\`json과 같은 마크다운 코드 펜스는 사용하지 마세요.

SECTION: FinancialHealthSummary
[회사의 재무 건전성에 대한 간략한 개요를 제공해주세요. 공개적으로 이용 가능한 정보를 바탕으로 매출, 수익성, 부채 수준의 일반적인 추세를 언급해주세요. 검색을 통해 찾은 경우가 아니면 특정 수치를 만들지 마세요.]

SECTION: GrowthPotential
[회사의 잠재적 성장 동력(예: 신제품, 시장 확장, 경쟁 우위)에 대해 논의해주세요. 최근 뉴스나 발표를 기반으로 작성해주세요.]

SECTION: RiskFactors
[회사에 영향을 미칠 수 있는 주요 위험 요인(산업별 위험, 회사 특정 과제, 시장 변동성 영향 포함)을 식별해주세요. 최근 동향을 참조해주세요.]

SECTION: AnalystSentimentOverview
[최근 검색 결과에서 식별 가능한 경우 애널리스트 심리(예: "일반적으로 낙관적", "혼재됨", "최근 사건으로 인해 신중함")에 대한 일반적인 요약을 제공해주세요. 널리 보고되지 않는 한 특정 목표 주가는 피해주세요.]

SECTION: RecentNewsImpact
[최근 몇 달 동안 ${companyName}과(와) 특별히 관련된 1-2가지 중요한 최근 뉴스 항목의 잠재적 영향을 간략하게 요약해주세요.]

---END OF RESPONSE---
`;

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_MODEL_NAME_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const analysisText = response.text || "분석 결과를 받지 못했습니다."; 
    
    const groundingMeta = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    const groundingSources: GroundingSource[] = [];
    if (groundingMeta?.groundingChunks) {
      groundingMeta.groundingChunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          groundingSources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }
    return { analysis: analysisText, groundingSources };

  } catch (error) {
    console.error(`상세 주식 분석(${ticker}) 정보를 가져오는 중 오류 발생:`, error);
     if (error instanceof Error && error.message.startsWith("Gemini API Key가 설정되지 않았거나 유효하지 않습니다")) {
        throw error;
    } else if (error instanceof Error) {
      throw new Error(`Gemini API 오류 (상세 분석): ${error.message}`);
    }
    throw new Error("상세 주식 분석 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.");
  }
};

export const fetchStockSpecificNews = async (
  ticker: string,
  companyName: string
): Promise<NewsArticle[]> => {
  const client = ensureClient();

  const prompt = `
당신은 뉴스 애그리게이션 AI입니다. Google Search를 사용하여 ${companyName}(티커: ${ticker})에 관한 최근 3개월 이내의 뉴스 기사 2-3개를 찾아주세요.
각 객체가 "title", "summary"(2-3 문장), "url"(검색 결과에서), "sourceName", "publishedDateText"를 포함하는 **완벽하게 유효한 JSON 배열 형식**으로 응답해주세요. **JSON 문자열 값 내부에 큰따옴표(")가 포함된 경우, 반드시 백슬래시(\\)로 이스케이프 처리해주세요(예: "잘못된 \\"제목\\"" -> "잘못된 \\\\\\"제목\\\\\\"").**
항상 "category" 필드를 "기업 뉴스"로 설정해주세요.
예시:
[
  {
    "title": "${companyName} 신제품 발표",
    "summary": "${companyName} 오늘 혁신적인 신제품 출시를 발표했습니다...",
    "url": "https://example.com/news/article1",
    "sourceName": "Example News Provider",
    "publishedDateText": "2024-07-28",
    "category": "기업 뉴스"
  }
]
URL이 유효하고 검색 결과에서 직접 가져온 것인지 확인해주세요. 특정 뉴스를 찾을 수 없으면 빈 배열 []을 반환해주세요. **응답 시작부터 끝까지 오직 JSON 배열만 포함해야 합니다. 코드 블록 펜스(예: \`\`\`json ... \`\`\`)를 사용하지 마세요.**
`;
  let rawApiResponseText = "";
  let jsonToParse = "";
  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_MODEL_NAME_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    rawApiResponseText = response.text || "";
    jsonToParse = extractJsonFromString(rawApiResponseText);
        
    let parsedNewsData: Omit<NewsArticle, 'id'>[] = [];
    try {
      parsedNewsData = JSON.parse(jsonToParse);
    } catch (e) {
      console.error(`종목 관련 뉴스 JSON 파싱 실패 (${ticker}):`, e, "\n파싱 시도 텍스트:", jsonToParse, "\n원본 API 응답 전체:", rawApiResponseText);
      throw new Error(`Gemini API로부터 유효한 종목 관련 뉴스 데이터를 파싱할 수 없습니다. 원본 오류: ${(e as Error).message}. 시도된 텍스트: '${jsonToParse.substring(0,100)}...'`);
    }

    if (!Array.isArray(parsedNewsData)) {
        console.error("파싱된 종목 관련 뉴스 데이터가 배열이 아닙니다:", parsedNewsData);
        throw new Error("Gemini API로부터 종목 관련 뉴스 배열을 받지 못했습니다.");
    }
    
    const newsArticles: NewsArticle[] = parsedNewsData.map((item, index) => ({
      ...item,
      id: `stock-news-${ticker}-${Date.now()}-${index}`,
      url: item.url || '#',
      category: "기업 뉴스", 
      sourceName: item.sourceName || "출처 미상",
      publishedDateText: item.publishedDateText || "최근",
    }));

    return newsArticles;

  } catch (error) {
    console.error(`종목 관련 뉴스(${ticker}) 정보를 가져오는 중 오류 발생:`, error);
     if (error instanceof Error && error.message.startsWith("Gemini API로부터 유효한 종목 관련 뉴스 데이터를 파싱할 수 없습니다")) {
        throw error;
    } else if (error instanceof Error && error.message.startsWith("Gemini API Key가 설정되지 않았거나 유효하지 않습니다")) {
        throw error;
    } else if (error instanceof Error) {
      throw new Error(`Gemini API 오류 (종목 뉴스): ${error.message}`);
    }
    throw new Error("종목 관련 뉴스 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.");
  }
};


export const fetchStockFinancialIndicators = async (
  ticker: string,
  companyName: string
): Promise<StockFinancialsData> => {
  const client = ensureClient();

  const prompt = `
당신은 금융 데이터 분석 AI입니다. Google Search를 사용하여 ${companyName}(티커: ${ticker})의 주요 최신 재무 지표를 찾아주세요.
다음 지표들을 포함하여 응답해주시고, 각 지표에 대해 'id', 'name', 'value', 그리고 가능한 경우 'notes'(예: TTM, 최근 분기 등)를 포함한 **완벽하게 유효한 JSON 객체**로 제공해주세요. **JSON 문자열 값 내부에 큰따옴표(")가 포함된 경우, 반드시 백슬래시(\\)로 이스케이프 처리해주세요(예: "부가 \\"설명\\"" -> "부가 \\\\\\"설명\\\\\\"").**

응답은 다음 JSON 형식이어야 합니다. **코드 블록 펜스(예: \`\`\`json ... \`\`\`)를 사용하지 말고, 응답 시작부터 끝까지 오직 JSON 객체만 포함해야 합니다:**
{
  "indicators": [
    { "id": "pe_ratio", "name": "P/E 비율", "value": "값", "notes": "부가 설명" },
    { "id": "eps", "name": "주당순이익 (EPS)", "value": "값 USD", "notes": "부가 설명" }
  ],
  "dataAsOf": "YYYY-MM-DD 또는 '최신 자료 기준'",
  "dataComment": "제공된 수치는 Google Search를 통해 얻은 가장 최근 정보에 기반하며, 실제 거래소 데이터와 약간의 차이가 있을 수 있습니다. (선택적 코멘트)"
}
모든 수치는 가능한 최신 정보를 반영해야 합니다. 데이터를 찾을 수 없는 지표는 생략해도 괜찮습니다.
`;
  let rawApiResponseText = "";
  let jsonToParse = "";
  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_MODEL_NAME_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    rawApiResponseText = response.text || "";
    jsonToParse = extractJsonFromString(rawApiResponseText);
    
    let parsedData: Partial<StockFinancialsData> = {};
    try {
      parsedData = JSON.parse(jsonToParse);
    } catch (e) {
      console.error(`재무 지표 JSON 파싱 실패 (${ticker}):`, e, "\n파싱 시도 텍스트:", jsonToParse, "\n원본 API 응답 전체:", rawApiResponseText);
      throw new Error(`Gemini API로부터 유효한 재무 지표 데이터를 파싱할 수 없습니다. 원본 오류: ${(e as Error).message}. 시도된 텍스트: '${jsonToParse.substring(0,100)}...'`);
    }

    if (!parsedData.indicators || !Array.isArray(parsedData.indicators)) {
      console.error("파싱된 재무 지표 데이터에 indicators 배열이 없습니다:", parsedData);
      throw new Error("Gemini API로부터 유효한 'indicators' 배열을 받지 못했습니다.");
    }
    
    const groundingMeta = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    const groundingSources: GroundingSource[] = [];
    if (groundingMeta?.groundingChunks) {
      groundingMeta.groundingChunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          groundingSources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    return {
      indicators: parsedData.indicators as StockFinancialIndicator[],
      dataAsOf: parsedData.dataAsOf || "날짜 정보 없음",
      dataComment: parsedData.dataComment,
      groundingSources: groundingSources,
    };

  } catch (error) {
    console.error(`재무 지표(${ticker}) 정보를 가져오는 중 오류 발생:`, error);
    if (error instanceof Error && error.message.startsWith("Gemini API로부터 유효한 재무 지표 데이터를 파싱할 수 없습니다")) {
        throw error;
    } else if (error instanceof Error && error.message.startsWith("Gemini API Key가 설정되지 않았거나 유효하지 않습니다")) {
        throw error;
    } else if (error instanceof Error) {
      throw new Error(`Gemini API 오류 (재무 지표): ${error.message}`);
    }
    throw new Error("재무 지표 정보를 가져오는 중 알 수 없는 오류가 발생했습니다.");
  }
};
