import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ChartType = 'line' | 'area' | 'bar';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: any[];
  type: ChartType;
  dataKey: string;
  xAxisDataKey: string;
  color?: string;
}

const ChartCard = ({
  title,
  subtitle,
  data,
  type,
  dataKey,
  xAxisDataKey,
  color = '#047857',
}: ChartCardProps) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey={xAxisDataKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: 'none',
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey={xAxisDataKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: 'none',
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey={xAxisDataKey}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: 'none',
              }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCard;