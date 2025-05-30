import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
}

const StatCard = ({ title, value, icon, trend, color }: StatCardProps) => {
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary-50 text-primary-600';
      case 'secondary':
        return 'bg-secondary-50 text-secondary-600';
      case 'accent':
        return 'bg-accent-50 text-accent-600';
      case 'success':
        return 'bg-success-50 text-success-600';
      case 'warning':
        return 'bg-warning-50 text-warning-600';
      case 'error':
        return 'bg-error-50 text-error-600';
      default:
        return 'bg-primary-50 text-primary-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900">{value}</h3>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-success-600' : 'text-error-600'}`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">from last month</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-full ${getColorClasses()}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;