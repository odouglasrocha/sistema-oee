import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ComponentType<any>;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  status?: 'excellent' | 'good' | 'fair' | 'poor';
  className?: string;
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  status,
  className,
  children
}) => {
  const getStatusClasses = () => {
    if (!status) return '';
    
    switch (status) {
      case 'excellent':
        return 'border-l-4 border-l-oee-excellent bg-gradient-to-r from-green-50/50 to-transparent';
      case 'good':
        return 'border-l-4 border-l-oee-good bg-gradient-to-r from-yellow-50/50 to-transparent';
      case 'fair':
        return 'border-l-4 border-l-oee-fair bg-gradient-to-r from-orange-50/50 to-transparent';
      case 'poor':
        return 'border-l-4 border-l-oee-poor bg-gradient-to-r from-red-50/50 to-transparent';
      default:
        return '';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    if (trend.isPositive === undefined) {
      return trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground';
    }
    
    return trend.isPositive ? 'text-success' : 'text-destructive';
  };

  return (
    <Card className={cn(
      'metric-card hover-lift',
      getStatusClasses(),
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">
            {value}
          </div>
          {unit && (
            <span className="text-sm text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={cn('text-xs font-medium', getTrendColor())}>
              {Math.abs(trend.value)}% vs. anterior
            </span>
          </div>
        )}
        
        {status && (
          <Badge 
            variant="outline" 
            className={cn('text-xs', {
              'border-oee-excellent text-oee-excellent': status === 'excellent',
              'border-oee-good text-oee-good': status === 'good',
              'border-oee-fair text-oee-fair': status === 'fair',
              'border-oee-poor text-oee-poor': status === 'poor',
            })}
          >
            {status === 'excellent' && 'Excelente'}
            {status === 'good' && 'Bom'}
            {status === 'fair' && 'Razoável'}
            {status === 'poor' && 'Crítico'}
          </Badge>
        )}
        
        {children}
      </CardContent>
    </Card>
  );
};