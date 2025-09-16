import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OEEChartData {
  time: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

interface OEEChartProps {
  data: OEEChartData[];
  type?: 'line' | 'bar' | 'area';
  title?: string;
  height?: number;
}

export const OEEChart: React.FC<OEEChartProps> = ({ 
  data, 
  type = 'line', 
  title = 'OEE Histórico',
  height = 300 
}) => {
  const formatTooltip = (value: number, name: string) => {
    const labels: Record<string, string> = {
      oee: 'OEE',
      availability: 'Disponibilidade',
      performance: 'Performance',
      quality: 'Qualidade'
    };
    
    const safeValue = value !== undefined && value !== null ? value : 0;
    return [`${safeValue.toFixed(1)}%`, labels[name] || name];
  };

  const getOEEStatus = (oee: number) => {
    if (oee >= 85) return { color: '#22c55e', status: 'Excelente' };
    if (oee >= 65) return { color: '#eab308', status: 'Bom' };
    if (oee >= 50) return { color: '#f97316', status: 'Razoável' };
    return { color: '#ef4444', status: 'Crítico' };
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Bar dataKey="availability" fill="hsl(var(--availability))" name="Disponibilidade" />
            <Bar dataKey="performance" fill="hsl(var(--performance))" name="Performance" />
            <Bar dataKey="quality" fill="hsl(var(--quality))" name="Qualidade" />
          </BarChart>
        );
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="oeeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="oee" 
              stroke="hsl(var(--primary))" 
              fill="url(#oeeGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        );
      
      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="oee" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              name="OEE"
            />
            <Line 
              type="monotone" 
              dataKey="availability" 
              stroke="hsl(var(--availability))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--availability))', strokeWidth: 2, r: 3 }}
              name="Disponibilidade"
            />
            <Line 
              type="monotone" 
              dataKey="performance" 
              stroke="hsl(var(--performance))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--performance))', strokeWidth: 2, r: 3 }}
              name="Performance"
            />
            <Line 
              type="monotone" 
              dataKey="quality" 
              stroke="hsl(var(--quality))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--quality))', strokeWidth: 2, r: 3 }}
              name="Qualidade"
            />
          </LineChart>
        );
    }
  };

  const currentOEE = data.length > 0 && data[data.length - 1]?.oee !== undefined ? data[data.length - 1].oee : 0;
  const { color, status } = getOEEStatus(currentOEE);

  return (
    <Card className="chart-container">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Badge 
          variant="outline"
          style={{ color, borderColor: color }}
        >
          {status} • {currentOEE.toFixed(1)}%
        </Badge>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};