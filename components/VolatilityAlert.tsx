import React from 'react';
import { VolatilityAlertData } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Globe, MapPin } from 'lucide-react';

interface VolatilityAlertProps {
  alert: VolatilityAlertData | null;
}

const VolatilityAlert: React.FC<VolatilityAlertProps> = ({ alert }) => {
  if (!alert) {
    return null;
  }

  let alertBaseColorClass = '';
  let alertTextColorClass = '';
  let Icon = Activity;
  let displayLevelText: string;

  switch (alert.level) {
    case 'low':
      alertBaseColorClass = 'bg-green-100 dark:bg-green-800 dark:bg-opacity-30';
      alertTextColorClass = 'text-green-700 dark:text-green-300';
      Icon = TrendingDown;
      displayLevelText = '낮음';
      break;
    case 'moderate':
      alertBaseColorClass = 'bg-yellow-100 dark:bg-yellow-700 dark:bg-opacity-30';
      alertTextColorClass = 'text-yellow-700 dark:text-yellow-300';
      Icon = Activity;
      displayLevelText = '보통';
      break;
    case 'high':
      alertBaseColorClass = 'bg-orange-100 dark:bg-orange-700 dark:bg-opacity-30';
      alertTextColorClass = 'text-orange-700 dark:text-orange-300';
      Icon = TrendingUp;
      displayLevelText = '높음';
      break;
    case 'extreme':
      alertBaseColorClass = 'bg-red-100 dark:bg-red-800 dark:bg-opacity-30';
      alertTextColorClass = 'text-red-700 dark:text-red-300';
      Icon = AlertTriangle;
      displayLevelText = '매우 높음';
      break;
    default:
      alertBaseColorClass = 'bg-info dark:bg-teal-700 dark:bg-opacity-30';
      alertTextColorClass = 'text-info-content dark:text-teal-300';
      // Icon will remain Activity as default
      displayLevelText = (alert.level as string).charAt(0).toUpperCase() + (alert.level as string).slice(1);
      break;
  }

  // Determine icon based on market type if available in ID or market name
  let MarketSpecificIcon = Icon;
  if (alert.id === 'vix' || alert.market.toLowerCase().includes('global') || alert.market.toLowerCase().includes('vix')) {
    MarketSpecificIcon = Globe;
  } else if (alert.id === 'vkospi' || alert.market.toLowerCase().includes('domestic') || alert.market.toLowerCase().includes('kospi')) {
    MarketSpecificIcon = MapPin;
  }


  return (
    <div className={`p-4 rounded-lg shadow-md ${alertBaseColorClass} ${alertTextColorClass} flex items-start`}>
      <MarketSpecificIcon className={`h-6 w-6 mr-3 flex-shrink-0`} />
      <div>
        <h4 className="font-bold">
          {alert.market} - {displayLevelText.toUpperCase()}
          {alert.indexName && typeof alert.indexValue === 'number' && (
            <span className="ml-2 font-normal">({alert.indexName}: {alert.indexValue.toFixed(2)})</span>
          )}
        </h4>
        <p className="text-sm">{alert.message}</p>
        <p className="text-xs mt-1 opacity-80">
          기준 시각: {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default VolatilityAlert;