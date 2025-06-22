
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { EconomicIndicator } from '../types';

interface ChartComponentProps {
  data: EconomicIndicator[];
  chartType?: 'bar' | 'line';
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, chartType = 'bar' }) => {
  // 현재 테마 감지 (간단한 방식, App.tsx에서 props로 받는 것이 더 견고함)
  const isDarkMode = document.documentElement.classList.contains('dark');
  const axisAndLegendColor = isDarkMode ? '#cbd5e1' : '#334155'; // neutral-300 dark, neutral-700 light
  const gridColor = isDarkMode ? '#475569' : '#e2e8f0'; // neutral-600 dark, neutral-200 light
  const tooltipBackgroundColor = isDarkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)'; // neutral-800 dark, white light
  const tooltipTextColor = isDarkMode ? '#f1f5f9' : '#0f172a'; // neutral-100 dark, neutral-900 light

  if (!data || data.length === 0) {
    return <p className="text-neutral-500 dark:text-neutral-400">차트에 표시할 데이터가 없습니다.</p>;
  }

  const chartData = data.map(item => ({
    name: item.name.length > 15 ? item.name.substring(0,12) + '...' : item.name,
    value: typeof item.value === 'string' ? parseFloat(item.value.replace(/[^0-9.-]+/g,"")) : item.value,
    unit: item.unit || ''
  })).filter(item => !isNaN(item.value));

  if (chartData.length === 0) {
    return <p className="text-neutral-500 dark:text-neutral-400">차트에 표시할 유효한 숫자 데이터가 없습니다.</p>;
  }

  const commonXAxisProps = {
    dataKey: "name",
    angle: -30,
    textAnchor: "end" as const,
    interval: 0,
    style: { fontSize: '0.75rem' },
    tick: { fill: axisAndLegendColor }
  };

  const commonYAxisProps = {
    style: { fontSize: '0.75rem' },
    tick: { fill: axisAndLegendColor }
  };
  
  const commonTooltipProps = {
    formatter: (value: number, _name: string, props: any) => [`${value} ${props.payload.unit || ''}`, "값"],
    cursor: { fill: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)' }, // neutral-600 dark, neutral-300 light (semi-transparent)
    contentStyle: { 
      backgroundColor: tooltipBackgroundColor, 
      borderColor: gridColor,
      borderRadius: '0.375rem', /* rounded-md */
      color: tooltipTextColor,
    },
    labelStyle: { color: tooltipTextColor, fontWeight: 'bold' as 'bold' }
  };

  const commonLegendProps = {
    wrapperStyle: { fontSize: "0.8rem", color: axisAndLegendColor }
  };

  const ChartToRender = chartType === 'bar' ? (
    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
      <XAxis {...commonXAxisProps} />
      <YAxis {...commonYAxisProps} />
      <Tooltip {...commonTooltipProps} />
      <Legend {...commonLegendProps} />
      <Bar dataKey="value" fill="#3490dc" name="값" />
    </BarChart>
  ) : (
    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
      <XAxis {...commonXAxisProps} />
      <YAxis {...commonYAxisProps} />
      <Tooltip {...commonTooltipProps} />
      <Legend {...commonLegendProps}/>
      <Line type="monotone" dataKey="value" stroke="#3490dc" activeDot={{ r: 8 }} name="값" />
    </LineChart>
  );

  return (
    <div className="bg-base-DEFAULT dark:bg-neutral-800 p-4 rounded-lg shadow h-80">
      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-4">주요 경제 지표</h3>
      <ResponsiveContainer width="100%" height="85%">
        {ChartToRender}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
