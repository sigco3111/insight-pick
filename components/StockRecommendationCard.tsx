
import React from 'react';
import { StockRecommendation } from '../types';
import { Info, Zap, ChevronRight } from 'lucide-react';

interface StockRecommendationCardProps {
  stock: StockRecommendation;
  onViewDetails: (ticker: string, companyName: string, rationale?: string, stockData?: StockRecommendation) => void;
}

const StockRecommendationCard: React.FC<StockRecommendationCardProps> = ({ stock, onViewDetails }) => {
  return (
    <div className="bg-base-DEFAULT dark:bg-neutral-700 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden flex flex-col justify-between">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{stock.companyName} ({stock.ticker})</h3>
          {stock.confidenceScore && (
             <div className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold
               ${stock.confidenceScore >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 
                 stock.confidenceScore >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100' : 
                 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
               <Zap size={14} className="mr-1" /> 신뢰도: {stock.confidenceScore}%
             </div>
           )}
        </div>
        <div className="flex items-start text-neutral-700 dark:text-neutral-300 mb-4">
          <Info size={18} className="mr-2 mt-1 text-primary flex-shrink-0" />
          <p className="text-sm leading-relaxed">{stock.rationale}</p>
        </div>
      </div>
       <div className="bg-neutral-50 dark:bg-neutral-600 px-6 py-4 border-t border-neutral-200 dark:border-neutral-600">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">티커: {stock.ticker}</span>
            <button
              onClick={() => onViewDetails(stock.ticker, stock.companyName, stock.rationale, stock)}
              className="inline-flex items-center text-xs font-medium text-primary hover:text-secondary dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
              aria-label={`${stock.companyName} 상세 분석 보기`}
            >
              상세 분석
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
    </div>
  );
};

export default StockRecommendationCard;
