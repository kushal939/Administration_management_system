import React from 'react';

// Bar Chart Component
export const BarChart = ({ data, title, height = 300, color = '#3B82F6' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const chartHeight = height - 60;

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="flex items-end justify-around h-full pb-8">
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
            return (
              <div key={index} className="flex flex-col items-center flex-1 mx-1">
                <div className="relative w-full flex items-end justify-center" style={{ height: `${chartHeight}px` }}>
                  <div
                    className="w-full rounded-t transition-all duration-500 hover:opacity-80 relative group"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: color,
                      minHeight: item.value > 0 ? '4px' : '0'
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {item.value}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center mt-2 text-gray-600 truncate w-full px-1">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Line Chart Component
export const LineChart = ({ data, title, height = 300, color = '#10B981' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  const chartHeight = height - 60;
  const chartWidth = 100;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full" style={{ height: `${chartHeight + 40}px` }} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * chartWidth;
            const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="0.5"
                fill={color}
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <div key={index} className="text-xs text-gray-600 text-center flex-1">
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pie Chart Component
export const PieChart = ({ data, title, size = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
  
  let currentAngle = -90;
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      path: `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length],
      label: item.label,
      value: item.value,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <svg width={size} height={size} className="flex-shrink-0">
          {slices.map((slice, index) => (
            <g key={index}>
              <path
                d={slice.path}
                fill={slice.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>{`${slice.label}: ${slice.value} (${slice.percentage}%)`}</title>
              </path>
            </g>
          ))}
        </svg>
        <div className="flex-1">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: slice.color }}></div>
              <span className="text-sm text-gray-700">
                {slice.label}: <span className="font-semibold">{slice.value}</span> ({slice.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ value, max, label, color = '#3B82F6' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{label}</span>
          <span className="text-gray-600">{value} / {max}</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color
          }}
        >
          {percentage > 10 && (
            <span className="text-xs text-white font-semibold">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
export const StatCard = ({ title, value, subtitle, icon, trend }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="text-sm text-gray-500 mb-1">{title}</div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
          {trend && (
            <div className={`text-xs mt-2 flex items-center ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-1">{trend.direction === 'up' ? '↑' : '↓'}</span>
              {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
