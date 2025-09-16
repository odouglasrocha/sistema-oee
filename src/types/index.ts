export interface Machine {
  id: string;
  name: string;
  code: string;
  capacity: number; // UND/h or TON/h
  unit: 'UND/h' | 'TON/h';
  status: 'active' | 'maintenance' | 'stopped' | 'inactive';
  conversionFactor: number; // KG → UND
  location?: string;
  description?: string;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
}

export interface Production {
  id: string;
  machineId: string;
  date: Date;
  shift: 'morning' | 'afternoon' | 'night';
  startTime: Date;
  endTime: Date;
  goodProduction: number; // UND
  filmWaste: number; // UND
  organicWaste: number; // KG
  organicWasteUnd: number; // Converted to UND
  plannedTime: number; // minutes
  actualTime: number; // minutes
  operatorId: string;
  notes?: string;
}

export interface Downtime {
  id: string;
  machineId: string;
  productionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  category: 'setup' | 'breakdown' | 'no_operator' | 'no_material' | 'quality' | 'planned_maintenance' | 'other';
  reason: string;
  description?: string;
  cost?: number;
}

export interface OEEMetrics {
  availability: number; // 0-100%
  performance: number; // 0-100%
  quality: number; // 0-100%
  oee: number; // 0-100%
  totalWaste: number; // UND
  totalProduction: number; // UND
  goodProduction: number; // UND
  plannedTime: number; // minutes
  actualTime: number; // minutes
  downtimeTotal: number; // minutes
}

export interface OEEStatus {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  label: string;
}

export interface DashboardData {
  overall: OEEMetrics;
  machines: Array<{
    machine: Machine;
    metrics: OEEMetrics;
    status: OEEStatus;
    lastUpdate: Date;
  }>;
  trends: {
    hourly: Array<{ time: string; oee: number; availability: number; performance: number; quality: number; }>;
    daily: Array<{ date: string; oee: number; availability: number; performance: number; quality: number; }>;
  };
  downtimes: Array<{
    category: string;
    duration: number;
    count: number;
    percentage: number;
  }>;
}

export interface AIInsight {
  id: string;
  type: 'prediction' | 'optimization' | 'pattern' | 'anomaly' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  confidence: number; // 0-100%
  machineId?: string;
  data?: any;
  status: 'active' | 'applied' | 'dismissed' | 'expired';
  appliedAt?: Date;
  appliedBy?: string;
  expiresAt?: Date;
  tags?: string[];
  metrics?: {
    impactOEE?: number;
    impactAvailability?: number;
    impactPerformance?: number;
    impactQuality?: number;
    estimatedSavings?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  type: 'oee_low' | 'machine_down' | 'quality_issue' | 'maintenance_due' | 'ai_insight';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  machineId?: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export const getOEEStatus = (oee: number): OEEStatus => {
  if (oee >= 85) {
    return {
      level: 'excellent',
      color: 'hsl(var(--oee-excellent))',
      label: 'Excelente'
    };
  } else if (oee >= 65) {
    return {
      level: 'good',
      color: 'hsl(var(--oee-good))',
      label: 'Bom'
    };
  } else if (oee >= 50) {
    return {
      level: 'fair',
      color: 'hsl(var(--oee-fair))',
      label: 'Razoável'
    };
  } else {
    return {
      level: 'poor',
      color: 'hsl(var(--oee-poor))',
      label: 'Ruim'
    };
  }
};

// Novas interfaces para Analytics
export interface OptimizationOpportunity {
  id: string;
  title: string;
  category: 'speed' | 'setup_time' | 'waste_reduction' | 'availability' | 'quality' | 'maintenance' | 'energy';
  machineId: string;
  currentValue: {
    value: number;
    unit: string;
  };
  potentialValue: {
    value: number;
    unit: string;
  };
  impact: {
    oee?: number;
    availability?: number;
    performance?: number;
    quality?: number;
  };
  difficulty: 'low' | 'medium' | 'high';
  estimatedCost?: number;
  estimatedSavings?: {
    monthly?: number;
    annual?: number;
  };
  implementationTime?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'identified' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  requirements?: string[];
  assignedTo?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progress: number;
  notes?: string;
  aiGenerated: boolean;
  confidence?: number;
  dataSource?: 'manual' | 'ai_analysis' | 'historical_data' | 'benchmark';
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationSchedule {
  id: string;
  week: number;
  year: number;
  title: string;
  description: string;
  category: 'speed_optimization' | 'setup_reduction' | 'quality_improvement' | 'maintenance' | 'training' | 'equipment_upgrade' | 'process_improvement';
  machineIds: string[];
  opportunityId?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progress: number;
  assignedTo: string[];
  responsibleUser: string;
  estimatedHours?: number;
  actualHours?: number;
  estimatedCost?: number;
  actualCost?: number;
  expectedResults?: {
    oeeImprovement?: number;
    availabilityImprovement?: number;
    performanceImprovement?: number;
    qualityImprovement?: number;
    costSavings?: number;
  };
  actualResults?: {
    oeeImprovement?: number;
    availabilityImprovement?: number;
    performanceImprovement?: number;
    qualityImprovement?: number;
    costSavings?: number;
  };
  tasks?: Array<{
    title: string;
    description?: string;
    assignedTo?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    dueDate?: Date;
    completedAt?: Date;
    estimatedHours?: number;
    actualHours?: number;
  }>;
  milestones?: Array<{
    title: string;
    description?: string;
    targetDate: Date;
    completedAt?: Date;
    status: 'pending' | 'completed' | 'missed';
  }>;
  notes?: string;
  autoGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvancedAlert {
  id: string;
  type: 'predictive_maintenance' | 'optimization_opportunity' | 'pattern_detected' | 'anomaly' | 'quality_issue' | 'performance_degradation' | 'efficiency_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  machineId: string;
  confidence: number;
  confidenceLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  aiGenerated: boolean;
  algorithm?: 'pattern_recognition' | 'anomaly_detection' | 'predictive_model' | 'statistical_analysis' | 'machine_learning';
  dataSource?: {
    sensors?: string[];
    timeRange?: {
      start: Date;
      end: Date;
    };
    dataPoints?: number;
  };
  metrics?: {
    currentOEE?: number;
    predictedOEE?: number;
    availability?: number;
    performance?: number;
    quality?: number;
    trend?: 'improving' | 'stable' | 'declining' | 'critical';
  };
  prediction?: {
    timeToFailure?: {
      value: number;
      unit: string;
    };
    failureProbability?: number;
    impactAssessment?: {
      productionLoss?: number;
      downtimeEstimate?: number;
      costImpact?: number;
    };
  };
  recommendations?: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedTime?: number;
    estimatedCost?: number;
    expectedBenefit?: string;
    resources?: string[];
  }>;
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed' | 'expired';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  escalationLevel: number;
  escalatedAt?: Date;
  escalatedTo?: string[];
  relatedAlerts?: string[];
  tags?: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionData {
  date: string;
  predicted: number;
  actual?: number;
  confidence: number;
}

export interface FailurePattern {
  category: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  color: string;
}

export interface RadarData {
  metric: string;
  value: number;
}

export interface AnalyticsDashboard {
  insights: AIInsight[];
  opportunities: OptimizationOpportunity[];
  alerts: AdvancedAlert[];
  schedules: OptimizationSchedule[];
  summary: {
    totalInsights: number;
    totalOpportunities: number;
    totalAlerts: number;
    totalSchedules: number;
  };
}

export const calculateOEE = (data: {
  goodProduction: number;
  totalWaste: number;
  plannedTime: number;
  actualTime: number;
  capacity: number;
}): OEEMetrics => {
  const { goodProduction, totalWaste, plannedTime, actualTime, capacity } = data;
  
  const totalProduction = goodProduction + totalWaste;
  const theoreticalProduction = (actualTime / 60) * capacity;
  
  const availability = plannedTime > 0 ? (actualTime / plannedTime) * 100 : 0;
  const performance = theoreticalProduction > 0 ? (totalProduction / theoreticalProduction) * 100 : 0;
  const quality = totalProduction > 0 ? (goodProduction / totalProduction) * 100 : 0;
  
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
  
  return {
    availability: Math.round(availability * 100) / 100,
    performance: Math.round(performance * 100) / 100,
    quality: Math.round(quality * 100) / 100,
    oee: Math.round(oee * 100) / 100,
    totalWaste,
    totalProduction,
    goodProduction,
    plannedTime,
    actualTime,
    downtimeTotal: plannedTime - actualTime
  };
};