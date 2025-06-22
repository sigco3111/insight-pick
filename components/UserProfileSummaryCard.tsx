import React from 'react';
import { UserProfile, MarketPreference, InvestmentStrategy } from '../types';
import { Target, ShieldAlert, Globe, MapPin, Combine, Brain, Settings2 } from 'lucide-react';

interface UserProfileSummaryCardProps {
  profile: UserProfile;
}

const UserProfileSummaryCard: React.FC<UserProfileSummaryCardProps> = ({ profile }) => {
  const getMarketIcon = (marketPreference: MarketPreference) => {
    switch (marketPreference) {
      case MarketPreference.US:
        return <Globe size={18} className="mr-2 text-blue-500" />;
      case MarketPreference.KR:
        return <MapPin size={18} className="mr-2 text-green-500" />;
      case MarketPreference.BOTH:
        return <Combine size={18} className="mr-2 text-purple-500" />;
      default:
        return <Globe size={18} className="mr-2 text-gray-500" />;
    }
  };

  const profileItems = [
    { label: "투자 목표", value: profile.investmentGoal, Icon: <Target size={18} className="mr-2 text-red-500" /> },
    { label: "위험 선호도", value: profile.riskAppetite, Icon: <ShieldAlert size={18} className="mr-2 text-orange-500" /> },
    { label: "선호 시장", value: profile.marketPreference, Icon: getMarketIcon(profile.marketPreference) },
    { 
      label: "투자 전략", 
      value: profile.investmentStrategy === InvestmentStrategy.UNDEFINED ? "특정 전략 없음" : profile.investmentStrategy, 
      Icon: profile.investmentStrategy === InvestmentStrategy.UNDEFINED ? <Settings2 size={18} className="mr-2 text-indigo-500" /> : <Brain size={18} className="mr-2 text-teal-500" />
    },
  ];

  return (
    <div className="bg-base-DEFAULT dark:bg-neutral-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">나의 현재 프로필 설정</h3>
      <ul className="space-y-3">
        {profileItems.map(item => (
          <li key={item.label} className="flex items-center text-sm">
            {item.Icon}
            <span className="font-medium text-neutral-600 dark:text-neutral-300 w-24">{item.label}:</span>
            <span className="text-neutral-700 dark:text-neutral-200">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserProfileSummaryCard;