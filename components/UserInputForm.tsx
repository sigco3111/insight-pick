
import React, { useState, useEffect, useCallback } from 'react';
import { InvestmentGoal, RiskAppetite, MarketPreference, UserProfile, InvestmentStrategy } from '../types';
import { DEFAULT_INVESTMENT_GOAL_OPTIONS, DEFAULT_RISK_APPETITE_OPTIONS, DEFAULT_MARKET_PREFERENCE_OPTIONS, DEFAULT_INVESTMENT_STRATEGY_OPTIONS } from '../constants';
import { Send, RotateCcw } from 'lucide-react';

interface UserInputFormProps {
  onSubmit: (profile: UserProfile) => void;
  onReset: () => void;
  isLoading: boolean;
  initialProfile?: UserProfile | null; // Added to potentially sync with App's initial load
}

const LOCAL_STORAGE_KEY = 'insightPickUserProfile';

const UserInputForm: React.FC<UserInputFormProps> = ({ onSubmit, onReset, isLoading, initialProfile }) => {
  const defaultGoal = DEFAULT_INVESTMENT_GOAL_OPTIONS[4] as InvestmentGoal;
  const defaultRisk = DEFAULT_RISK_APPETITE_OPTIONS[1] as RiskAppetite;
  const defaultMarket = DEFAULT_MARKET_PREFERENCE_OPTIONS[2] as MarketPreference;
  const defaultStrategy = DEFAULT_INVESTMENT_STRATEGY_OPTIONS[8] as InvestmentStrategy; // "소형주 투자"

  const getInitialState = useCallback(() => {
    try {
      const savedProfileString = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedProfileString) {
        const savedProfile = JSON.parse(savedProfileString) as UserProfile;
        // Validate if saved profile values are still valid options
        return {
          investmentGoal: DEFAULT_INVESTMENT_GOAL_OPTIONS.includes(savedProfile.investmentGoal) ? savedProfile.investmentGoal : defaultGoal,
          riskAppetite: DEFAULT_RISK_APPETITE_OPTIONS.includes(savedProfile.riskAppetite) ? savedProfile.riskAppetite : defaultRisk,
          marketPreference: DEFAULT_MARKET_PREFERENCE_OPTIONS.includes(savedProfile.marketPreference) ? savedProfile.marketPreference : defaultMarket,
          investmentStrategy: DEFAULT_INVESTMENT_STRATEGY_OPTIONS.includes(savedProfile.investmentStrategy) ? savedProfile.investmentStrategy : defaultStrategy,
        };
      }
    } catch (error) {
      console.error("Failed to parse user profile from localStorage:", error);
      // Fallback to defaults if parsing fails
    }
    // If initialProfile from App.tsx is provided and valid, use it. This helps sync if App loads first.
    if (initialProfile) {
         return {
            investmentGoal: DEFAULT_INVESTMENT_GOAL_OPTIONS.includes(initialProfile.investmentGoal) ? initialProfile.investmentGoal : defaultGoal,
            riskAppetite: DEFAULT_RISK_APPETITE_OPTIONS.includes(initialProfile.riskAppetite) ? initialProfile.riskAppetite : defaultRisk,
            marketPreference: DEFAULT_MARKET_PREFERENCE_OPTIONS.includes(initialProfile.marketPreference) ? initialProfile.marketPreference : defaultMarket,
            investmentStrategy: DEFAULT_INVESTMENT_STRATEGY_OPTIONS.includes(initialProfile.investmentStrategy) ? initialProfile.investmentStrategy : defaultStrategy,
        };
    }
    return { investmentGoal: defaultGoal, riskAppetite: defaultRisk, marketPreference: defaultMarket, investmentStrategy: defaultStrategy };
  }, [initialProfile, defaultGoal, defaultRisk, defaultMarket, defaultStrategy]);


  const [investmentGoal, setInvestmentGoal] = useState<InvestmentGoal>(getInitialState().investmentGoal);
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>(getInitialState().riskAppetite);
  const [marketPreference, setMarketPreference] = useState<MarketPreference>(getInitialState().marketPreference);
  const [investmentStrategy, setInvestmentStrategy] = useState<InvestmentStrategy>(getInitialState().investmentStrategy);

  useEffect(() => {
    // Sync with initialProfile if it changes after mount (e.g. App loads profile)
    if (initialProfile) {
        if (DEFAULT_INVESTMENT_GOAL_OPTIONS.includes(initialProfile.investmentGoal)) setInvestmentGoal(initialProfile.investmentGoal);
        if (DEFAULT_RISK_APPETITE_OPTIONS.includes(initialProfile.riskAppetite)) setRiskAppetite(initialProfile.riskAppetite);
        if (DEFAULT_MARKET_PREFERENCE_OPTIONS.includes(initialProfile.marketPreference)) setMarketPreference(initialProfile.marketPreference);
        if (DEFAULT_INVESTMENT_STRATEGY_OPTIONS.includes(initialProfile.investmentStrategy)) setInvestmentStrategy(initialProfile.investmentStrategy);
    }
  }, [initialProfile]);


  useEffect(() => {
    const currentProfile: UserProfile = { investmentGoal, riskAppetite, marketPreference, investmentStrategy };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentProfile));
    } catch (error) {
      console.error("Failed to save user profile to localStorage:", error);
    }
  }, [investmentGoal, riskAppetite, marketPreference, investmentStrategy]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ investmentGoal, riskAppetite, marketPreference, investmentStrategy });
  };

  const handleReset = () => {
    setInvestmentGoal(defaultGoal);
    setRiskAppetite(defaultRisk);
    setMarketPreference(defaultMarket);
    setInvestmentStrategy(defaultStrategy);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to remove user profile from localStorage:", error);
    }
    onReset();
  };

  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="bg-base-DEFAULT dark:bg-neutral-800 p-6 rounded-xl shadow-lg space-y-6">
      <div>
        <label htmlFor="investmentGoal" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          투자 목표
        </label>
        <select
          id="investmentGoal"
          name="investmentGoal"
          value={investmentGoal}
          onChange={(e) => setInvestmentGoal(e.target.value as InvestmentGoal)}
          className={selectClassName}
          disabled={isLoading}
          aria-describedby="investmentGoal-description"
        >
          {DEFAULT_INVESTMENT_GOAL_OPTIONS.map(goal => (
            <option key={goal} value={goal}>{goal}</option>
          ))}
        </select>
        <p id="investmentGoal-description" className="sr-only">선호하는 투자 목표를 선택하세요.</p>
      </div>

      <div>
        <label htmlFor="riskAppetite" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          위험 선호도
        </label>
        <select
          id="riskAppetite"
          name="riskAppetite"
          value={riskAppetite}
          onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite)}
          className={selectClassName}
          disabled={isLoading}
          aria-describedby="riskAppetite-description"
        >
          {DEFAULT_RISK_APPETITE_OPTIONS.map(risk => (
            <option key={risk} value={risk}>{risk}</option>
          ))}
        </select>
        <p id="riskAppetite-description" className="sr-only">감수할 수 있는 투자 위험 수준을 선택하세요.</p>
      </div>

      <div>
        <label htmlFor="marketPreference" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          투자 시장 선호
        </label>
        <select
          id="marketPreference"
          name="marketPreference"
          value={marketPreference}
          onChange={(e) => setMarketPreference(e.target.value as MarketPreference)}
          className={selectClassName}
          disabled={isLoading}
          aria-describedby="marketPreference-description"
        >
          {DEFAULT_MARKET_PREFERENCE_OPTIONS.map(market => (
            <option key={market} value={market}>{market}</option>
          ))}
        </select>
        <p id="marketPreference-description" className="sr-only">선호하는 투자 시장을 선택하세요 (미국, 한국, 또는 둘 다).</p>
      </div>

      <div>
        <label htmlFor="investmentStrategy" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          투자 전략
        </label>
        <select
          id="investmentStrategy"
          name="investmentStrategy"
          value={investmentStrategy}
          onChange={(e) => setInvestmentStrategy(e.target.value as InvestmentStrategy)}
          className={selectClassName}
          disabled={isLoading}
          aria-describedby="investmentStrategy-description"
        >
          {DEFAULT_INVESTMENT_STRATEGY_OPTIONS.map(strategy => (
            <option key={strategy} value={strategy}>{strategy}</option>
          ))}
        </select>
        <p id="investmentStrategy-description" className="sr-only">선호하는 투자 전략을 선택하세요.</p>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed transition-colors"
          aria-label={isLoading ? "인사이트 생성 중..." : "포트폴리오 인사이트 받기"}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              인사이트 생성 중...
            </>
          ) : (
            <>
              <Send size={20} className="mr-2"/> 포트폴리오 인사이트 받기
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm text-base font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-neutral-200 dark:disabled:bg-neutral-500 disabled:text-neutral-400 dark:disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
          aria-label="입력 및 결과 초기화"
        >
          <RotateCcw size={20} className="mr-2"/> 초기화
        </button>
      </div>
    </form>
  );
};

export default UserInputForm;
