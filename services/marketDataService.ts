import { EconomicIndicator, VolatilityAlertData } from '../types';
import { MOCK_API_DELAY } from '../constants';

const mockEconomicIndicators: EconomicIndicator[] = [
  { id: '1', name: '인플레이션율 (CPI YoY)', value: '2.8', unit: '%', trend: 'down', lastUpdated: '2024-07-15' },
  { id: '2', name: '실업률', value: '3.9', unit: '%', trend: 'neutral', lastUpdated: '2024-07-05' },
  { id: '3', name: 'GDP 성장률 (QoQ)', value: '0.5', unit: '%', trend: 'up', lastUpdated: '2024-06-28' },
  { id: '4', name: '기준 금리 (중앙은행)', value: '5.25', unit: '%', trend: 'neutral', lastUpdated: '2024-07-20'},
];

const delay = <T,>(data: T): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), MOCK_API_DELAY));

export const fetchEconomicIndicators = async (): Promise<EconomicIndicator[]> => {
  console.log("MockService: 경제 지표 가져오는 중...");
  return delay(mockEconomicIndicators);
};

const generateVolatilityData = (
  id: string,
  marketName: string,
  indexName: string,
  minVal: number,
  maxVal: number
): VolatilityAlertData => {
  const value = parseFloat((Math.random() * (maxVal - minVal) + minVal).toFixed(2));
  let level: "low" | "moderate" | "high" | "extreme";
  let message: string;

  if (value < (minVal + (maxVal - minVal) * 0.25)) { 
    level = "low";
    message = `${indexName} 지수가 안정적인 수준을 보이며, 시장 변동성이 낮습니다.`;
  } else if (value < (minVal + (maxVal - minVal) * 0.5)) { 
    level = "moderate";
    message = `${indexName} 지수가 다소 상승하였으나, 시장 변동성은 보통 수준입니다.`;
  } else if (value < (minVal + (maxVal - minVal) * 0.75)) { 
    level = "high";
    message = `${indexName} 지수가 높은 수준으로, 시장 변동성이 확대되고 있습니다. 투자에 유의하세요.`;
  } else {
    level = "extreme";
    message = `${indexName} 지수가 매우 높은 수준으로, 시장 변동성이 극심합니다. 각별한 주의가 필요합니다.`;
  }

  return {
    id,
    market: marketName,
    indexName,
    indexValue: value,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
};

export const fetchInternationalVolatility = async (): Promise<VolatilityAlertData> => {
  console.log("MockService: 국제 시장 변동성 지수 가져오는 중...");
  return delay(generateVolatilityData('vix', '글로벌 시장 변동성 (VIX 기준)', 'VIX', 10, 40));
};

export const fetchDomesticVolatility = async (): Promise<VolatilityAlertData> => {
  console.log("MockService: 국내 시장 변동성 지수 가져오는 중...");
  return delay(generateVolatilityData('vkospi', '국내 시장 변동성 (VKOSPI 기준)', 'VKOSPI', 10, 45));
};