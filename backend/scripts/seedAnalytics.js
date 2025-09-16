const mongoose = require('mongoose');
const AIInsight = require('../models/AIInsight');
const OptimizationOpportunity = require('../models/OptimizationOpportunity');
const OptimizationSchedule = require('../models/OptimizationSchedule');
const AdvancedAlert = require('../models/AdvancedAlert');
const Machine = require('../models/Machine');
const User = require('../models/User');
require('dotenv').config();

// Conectar ao MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/?retryWrites=true&w=majority&appName=Banco';

const seedAnalytics = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB!');

    // Buscar máquinas e usuários existentes
    const machines = await Machine.find().limit(3);
    const users = await User.find().limit(2);
    
    if (machines.length === 0) {
      console.log('⚠️ Nenhuma máquina encontrada. Execute o seed principal primeiro.');
      return;
    }
    
    if (users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado. Execute o seed principal primeiro.');
      return;
    }

    const machine1 = machines[0];
    const machine2 = machines[1] || machine1;
    const machine3 = machines[2] || machine1;
    const user1 = users[0];
    const user2 = users[1] || user1;

    console.log('🧠 Criando insights de IA...');
    
    // Limpar dados existentes
    await AIInsight.deleteMany({});
    await OptimizationOpportunity.deleteMany({});
    await OptimizationSchedule.deleteMany({});
    await AdvancedAlert.deleteMany({});

    // Criar insights de IA
    const insights = [
  {
    type: 'maintenance',
    severity: 'high',
    title: 'Desgaste nas Garras de Conveyor',
    description: `Sistema de transporte da ${machine1.name} apresenta desgaste avançado nas garras de movimentação. Vida útil restante: aproximadamente 120 horas.`,
    recommendation: 'Substituir conjunto completo de garras e verificar alinhamento dos trilhos.',
    confidence: 85,
    machineId: machine1._id,
    metrics: {
      impactOEE: -18,
      impactAvailability: -22,
      estimatedSavings: 8200
    },
    tags: ['conveyor', 'garras', 'transporte', 'manutencao']
  },
  {
    type: 'optimization',
    severity: 'medium',
    title: 'Otimização do Tempo de Exaustão',
    description: `Ajuste fino no tempo de exaustão pode reduzir ciclo em 8% na ${machine2.name} sem comprometer qualidade do vácuo.`,
    recommendation: 'Reduzir tempo de exaustão em 0.3 segundos e monitorar qualidade da selagem.',
    confidence: 88,
    machineId: machine2._id,
    metrics: {
      impactOEE: 8,
      impactPerformance: 11,
      estimatedSavings: 4800
    },
    tags: ['exaustao', 'ciclo', 'vazio', 'otimizacao']
  },
  {
    type: 'pattern',
    severity: 'low',
    title: 'Padrão de Vazamento em Turno Noturno',
    description: 'Aumento de 12% em embalagens com vazamento detectado entre 22h-06h em todos os modelos.',
    recommendation: 'Verificar umidade ambiente e treinamento da equipe noturna nos procedimentos de limpeza dos selos.',
    confidence: 79,
    metrics: {
      impactPerformance: -7,
      impactQuality: -15
    },
    tags: ['vazamento', 'selagem', 'turno', 'qualidade']
  },
  {
    type: 'anomaly',
    severity: 'medium',
    title: 'Anomalia na Pressão de Selagem',
    description: `${machine3.name} apresenta variações anômalas de pressão nas barras de selagem (±15% do padrão).`,
    recommendation: 'Calibrar sistema pneumático e verificar válvulas de controle de pressão.',
    confidence: 76,
    machineId: machine3._id,
    metrics: {
      impactOEE: -9,
      impactQuality: -12,
      estimatedSavings: 3500
    },
    tags: ['pressao', 'selagem', 'anomalia', 'calibracao']
  },
  {
    type: 'prediction',
    severity: 'critical',
    title: 'Predição de Falha no Sistema Térmico',
    description: `Modelo indica 92% de probabilidade de queima das resistências térmicas da ${machine1.name} nas próximas 36 horas.`,
    recommendation: 'Parar imediatamente para substituição preventiva das resistências e termopares.',
    confidence: 92,
    machineId: machine1._id,
    metrics: {
      impactOEE: -100,
      impactAvailability: -100,
      estimatedSavings: 18700
    },
    tags: ['termico', 'resistencia', 'critico', 'parada']
  },
  {
    type: 'maintenance',
    severity: 'medium',
    title: 'Calibração de Sensores Ópticos',
    description: `Sensores de posicionamento da ${machine2.name} necessitam calibração urgente. Desvio de 3.8mm detectado.`,
    recommendation: 'Realizar calibração completa dos sensores fotelétricos e verificar refletores.',
    confidence: 83,
    machineId: machine2._id,
    metrics: {
      impactOEE: -6,
      impactQuality: -9,
      estimatedSavings: 4200
    },
    tags: ['sensores', 'opticos', 'calibracao', 'posicionamento']
  },
  {
    type: 'optimization',
    severity: 'high',
    title: 'Otimização de Sequência de Produtos',
    description: `Agrupamento inteligente de produtos similares pode reduzir tempo de setup em 40% na ${machine3.name}.`,
    recommendation: 'Reorganizar ordem de produção para minimizar trocas de ferramentas e ajustes.',
    confidence: 91,
    machineId: machine3._id,
    metrics: {
      impactOEE: 15,
      impactAvailability: 18,
      estimatedSavings: 11200
    },
    tags: ['sequencia', 'setup', 'producao', 'otimizacao']
  },
  {
    type: 'anomaly',
    severity: 'low',
    title: 'Consumo Anômalo de Gás Inerte',
    description: `${machine1.name} apresenta consumo de nitrogênio 20% acima do padrão estabelecido.`,
    recommendation: 'Verificar vazamentos nas mangueiras e conexões do sistema de atmosfera modificada.',
    confidence: 81,
    machineId: machine1._id,
    metrics: {
      impactOEE: -4,
      estimatedSavings: 2800
    },
    tags: ['gas', 'consumo', 'vazamento', 'anomalia']
  }
];

    const createdInsights = await AIInsight.insertMany(insights);
    console.log(`✅ ${createdInsights.length} insights criados!`);

    console.log('🎯 Criando oportunidades de otimização...');
    
    // Criar oportunidades de otimização
    const opportunities = [
  {
    title: 'Otimização da Velocidade de Ciclo de Vácuo',
    category: 'speed',
    machineId: machine1._id,
    currentValue: { value: 12, unit: 'ciclos/min' },
    potentialValue: { value: 15, unit: 'ciclos/min' },
    impact: { oee: 14, performance: 18 },
    difficulty: 'low',
    priority: 'high',
    status: 'identified',
    description: 'Aumento da velocidade de ciclismo do sistema de vácuo através de ajustes nos parâmetros de exaustão e calibração dos sensores de pressão.',
    requirements: ['Calibração de sensores de vácuo', 'Ajuste de temporizadores', 'Teste gradual de performance'],
    estimatedCost: 3200,
    estimatedSavings: { monthly: 9200, annual: 110400 },
    implementationTime: 2,
    aiGenerated: true,
    confidence: 88,
    dataSource: 'ai_analysis'
  },
  {
    title: 'Redução do Tempo de Troca de Filme',
    category: 'setup_time',
    machineId: machine2._id,
    currentValue: { value: 25, unit: 'min' },
    potentialValue: { value: 15, unit: 'min' },
    impact: { availability: 12, oee: 9 },
    difficulty: 'medium',
    priority: 'high',
    status: 'planned',
    description: 'Implementação de sistema rápido de troca de bobinas e padronização dos procedimentos de alimentação de filme.',
    requirements: ['Sistema de tensionamento rápido', 'Treinamento da equipe', 'Procedimentos padronizados'],
    estimatedCost: 7500,
    estimatedSavings: { monthly: 7800, annual: 93600 },
    implementationTime: 10,
    assignedTo: user1._id,
    plannedStartDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    plannedEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    aiGenerated: true,
    confidence: 85,
    dataSource: 'historical_data'
  },
  {
    title: 'Redução de Refugo por Falha de Selagem',
    category: 'waste_reduction',
    machineId: machine3._id,
    currentValue: { value: 2.8, unit: '%' },
    potentialValue: { value: 1.2, unit: '%' },
    impact: { quality: 1.6, oee: 3 },
    difficulty: 'medium',
    priority: 'high',
    status: 'identified',
    description: 'Implementação de sistema de monitoramento contínuo da temperatura de selagem e detecção precoce de falhas.',
    requirements: ['Sensores térmicos adicionais', 'Sistema de alerta precoce', 'Calibração das resistências'],
    estimatedCost: 9800,
    estimatedSavings: { monthly: 6500, annual: 78000 },
    implementationTime: 14,
    aiGenerated: true,
    confidence: 82,
    dataSource: 'historical_data'
  },
  {
    title: 'Otimização do Consumo de Gás Inerte',
    category: 'energy',
    machineId: machine1._id,
    currentValue: { value: 12.5, unit: 'm³/h' },
    potentialValue: { value: 8.2, unit: 'm³/h' },
    impact: { energy: 34, oee: 2 },
    difficulty: 'medium',
    priority: 'medium',
    status: 'in_progress',
    description: 'Ajuste fino do sistema de atmosfera modificada para reduzir consumo de nitrogênio mantendo qualidade da embalagem.',
    requirements: ['Calibração de fluxômetros', 'Ajuste de dosagem', 'Monitoramento de qualidade'],
    estimatedCost: 4500,
    estimatedSavings: { monthly: 4200, annual: 50400 },
    implementationTime: 7,
    assignedTo: user2._id,
    actualStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    progress: 40,
    aiGenerated: true,
    confidence: 79,
    dataSource: 'ai_analysis'
  },
  {
    title: 'Automatização do Ajuste de Pressão',
    category: 'maintenance',
    machineId: machine2._id,
    currentValue: { value: 75, unit: '% manual' },
    potentialValue: { value: 95, unit: '% automático' },
    impact: { performance: 8, quality: 3, availability: 5 },
    difficulty: 'high',
    priority: 'medium',
    status: 'identified',
    description: 'Implementação de sistema automático de ajuste de pressão baseado no tipo de embalagem e produto.',
    requirements: ['Sensores de pressão inteligentes', 'Software de controle', 'Integração com PLC'],
    estimatedCost: 18500,
    estimatedSavings: { monthly: 8800, annual: 105600 },
    implementationTime: 25,
    aiGenerated: true,
    confidence: 76,
    dataSource: 'benchmark'
  },
  {
    title: 'Otimização do Sistema de Exaustão',
    category: 'maintenance',
    machineId: machine3._id,
    currentValue: { value: 82, unit: '% eficiência' },
    potentialValue: { value: 94, unit: '% eficiência' },
    impact: { availability: 7, oee: 6, energy: 15 },
    difficulty: 'medium',
    priority: 'high',
    status: 'completed',
    description: 'Melhoria do sistema de exaustão e vácuo para aumentar eficiência energética e reduzir tempo de ciclo.',
    requirements: ['Substituição de filtros', 'Limpeza do sistema', 'Calibração de sensores'],
    estimatedCost: 6800,
    estimatedSavings: { monthly: 7200, annual: 86400 },
    implementationTime: 6,
    assignedTo: user2._id,
    actualStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    actualEndDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    progress: 100,
    results: { actualSavings: 7800, roi: 114.7 },
    aiGenerated: false,
    dataSource: 'manual'
  }
];
    const createdOpportunities = await OptimizationOpportunity.insertMany(opportunities);
    console.log(`✅ ${createdOpportunities.length} oportunidades criadas!`);

    console.log('📅 Criando cronograma de otimização...');
    
    // Criar cronograma de otimização
    const currentDate = new Date();
    const currentWeek = Math.ceil((currentDate.getDate() - currentDate.getDay() + 1) / 7);
    const currentYear = currentDate.getFullYear();
    
    const schedules = [
      {
        week: currentWeek,
        year: currentYear,
        title: 'Ajuste de Velocidade - Linha Principal',
        description: 'Implementação de otimização de velocidade na linha principal de produção',
        category: 'speed_optimization',
        machineIds: [machine1._id],
        opportunityId: createdOpportunities[0]._id,
        status: 'in_progress',
        priority: 'high',
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        actualStartDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        progress: 60,
        assignedTo: [user1._id],
        responsibleUser: user1._id,
        estimatedHours: 24,
        actualHours: 16,
        estimatedCost: 2500,
        expectedResults: {
          oeeImprovement: 12,
          performanceImprovement: 15,
          costSavings: 8500
        },
        tasks: [
          {
            title: 'Calibração de sensores',
            status: 'completed',
            assignedTo: user1._id,
            completedAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            estimatedHours: 4,
            actualHours: 3.5
          },
          {
            title: 'Ajuste de parâmetros',
            status: 'in_progress',
            assignedTo: user1._id,
            estimatedHours: 8
          },
          {
            title: 'Testes de validação',
            status: 'pending',
            assignedTo: user1._id,
            estimatedHours: 12
          }
        ],
        milestones: [
          {
            title: 'Calibração concluída',
            targetDate: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            completedAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            status: 'completed'
          },
          {
            title: 'Testes finalizados',
            targetDate: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            status: 'pending'
          }
        ]
      },
      {
        week: currentWeek + 1,
        year: currentYear,
        title: 'Treinamento de Setup Rápido',
        description: 'Programa de treinamento para redução do tempo de setup',
        category: 'training',
        machineIds: [machine2._id],
        opportunityId: createdOpportunities[1]._id,
        status: 'planned',
        priority: 'medium',
        startDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        progress: 0,
        assignedTo: [user1._id, user2._id],
        responsibleUser: user2._id,
        estimatedHours: 40,
        estimatedCost: 5000,
        expectedResults: {
          availabilityImprovement: 8,
          oeeImprovement: 6,
          costSavings: 6200
        }
      },
      {
        week: currentWeek + 2,
        year: currentYear,
        title: 'Implementação de Sensores IoT',
        description: 'Instalação de sensores IoT para monitoramento em tempo real',
        category: 'equipment_upgrade',
        machineIds: [machine1._id, machine2._id, machine3._id],
        status: 'planned',
        priority: 'high',
        startDate: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(currentDate.getTime() + 21 * 24 * 60 * 60 * 1000),
        progress: 0,
        assignedTo: [user1._id],
        responsibleUser: user1._id,
        estimatedHours: 60,
        estimatedCost: 12000,
        expectedResults: {
          availabilityImprovement: 10,
          performanceImprovement: 8,
          qualityImprovement: 5,
          oeeImprovement: 15
        }
      },
      {
        week: currentWeek + 3,
        year: currentYear,
        title: 'Manutenção Preventiva Completa',
        description: 'Programa de manutenção preventiva baseado em dados preditivos',
        category: 'maintenance',
        machineIds: [machine3._id],
        status: 'planned',
        priority: 'critical',
        startDate: new Date(currentDate.getTime() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(currentDate.getTime() + 23 * 24 * 60 * 60 * 1000),
        progress: 0,
        assignedTo: [user2._id],
        responsibleUser: user2._id,
        estimatedHours: 32,
        estimatedCost: 8000,
        expectedResults: {
          availabilityImprovement: 15,
          oeeImprovement: 12,
          costSavings: 15000
        }
      }
    ];

    const createdSchedules = await OptimizationSchedule.insertMany(schedules);
    console.log(`✅ ${createdSchedules.length} itens de cronograma criados!`);

    console.log('🚨 Criando alertas avançados...');
    
    // Criar alertas avançados
    const alerts = [
      {
        type: 'predictive_maintenance',
        severity: 'critical',
        title: 'Falha Iminente no Sistema Hidráulico',
        description: `Sistema hidráulico da ${machine1.name} apresenta sinais críticos de desgaste. Falha prevista em 18-24 horas.`,
        machineId: machine1._id,
        confidence: 94,
        algorithm: 'predictive_model',
        dataSource: {
          sensors: ['pressao_hidraulica', 'temperatura_oleo', 'vibracao'],
          timeRange: {
            start: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: currentDate
          },
          dataPoints: 10080
        },
        metrics: {
          currentOEE: 72,
          predictedOEE: 0,
          availability: 85,
          trend: 'critical'
        },
        prediction: {
          timeToFailure: { value: 20, unit: 'hours' },
          failureProbability: 94,
          impactAssessment: {
            productionLoss: 2400,
            downtimeEstimate: 480,
            costImpact: 35000
          }
        },
        recommendations: [
          {
            action: 'Parar produção imediatamente',
            priority: 'urgent',
            estimatedTime: 0,
            estimatedCost: 0,
            expectedBenefit: 'Evitar danos maiores ao equipamento',
            resources: ['Operador', 'Supervisor']
          },
          {
            action: 'Substituir componentes hidráulicos',
            priority: 'urgent',
            estimatedTime: 240,
            estimatedCost: 8500,
            expectedBenefit: 'Restaurar operação normal',
            resources: ['Técnico especializado', 'Peças de reposição']
          }
        ],
        tags: ['hidraulico', 'critico', 'parada_programada']
      },
      {
        type: 'optimization_opportunity',
        severity: 'medium',
        title: 'Oportunidade de Melhoria na Eficiência Energética',
        description: `${machine2.name} está consumindo 18% mais energia que o padrão nas últimas 72 horas.`,
        machineId: machine2._id,
        confidence: 82,
        algorithm: 'statistical_analysis',
        dataSource: {
          sensors: ['consumo_energia', 'temperatura_ambiente'],
          timeRange: {
            start: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            end: currentDate
          },
          dataPoints: 4320
        },
        metrics: {
          currentOEE: 78,
          predictedOEE: 85,
          performance: 82,
          trend: 'declining'
        },
        recommendations: [
          {
            action: 'Verificar calibração dos motores',
            priority: 'medium',
            estimatedTime: 120,
            estimatedCost: 500,
            expectedBenefit: 'Redução de 15% no consumo energético',
            resources: ['Técnico elétrico']
          },
          {
            action: 'Limpeza do sistema de ventilação',
            priority: 'low',
            estimatedTime: 60,
            estimatedCost: 200,
            expectedBenefit: 'Melhoria na dissipação de calor',
            resources: ['Operador de manutenção']
          }
        ],
        tags: ['energia', 'eficiencia', 'calibracao']
      },
      {
        type: 'pattern_detected',
        severity: 'low',
        title: 'Padrão de Redução de Qualidade Detectado',
        description: 'Detectado padrão de aumento de refugo entre 15h-17h nos últimos 5 dias.',
        machineId: machine3._id,
        confidence: 88,
        algorithm: 'pattern_recognition',
        dataSource: {
          sensors: ['qualidade_produto', 'temperatura_processo'],
          timeRange: {
            start: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
            end: currentDate
          },
          dataPoints: 7200
        },
        metrics: {
          currentOEE: 81,
          quality: 94,
          trend: 'declining'
        },
        recommendations: [
          {
            action: 'Investigar condições ambientais no período',
            priority: 'medium',
            estimatedTime: 180,
            estimatedCost: 300,
            expectedBenefit: 'Identificar causa raiz da variação',
            resources: ['Engenheiro de qualidade']
          },
          {
            action: 'Ajustar parâmetros de processo',
            priority: 'medium',
            estimatedTime: 90,
            estimatedCost: 150,
            expectedBenefit: 'Estabilizar qualidade do produto',
            resources: ['Operador especializado']
          }
        ],
        tags: ['qualidade', 'padrao', 'refugo']
      },
      {
        type: 'anomaly',
        severity: 'high',
        title: 'Anomalia na Vibração do Equipamento',
        description: `Detectada vibração anômala na ${machine1.name}. Amplitude 40% acima do normal.`,
        machineId: machine1._id,
        confidence: 91,
        algorithm: 'anomaly_detection',
        dataSource: {
          sensors: ['vibracao_x', 'vibracao_y', 'vibracao_z'],
          timeRange: {
            start: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000),
            end: currentDate
          },
          dataPoints: 1440
        },
        metrics: {
          currentOEE: 75,
          availability: 88,
          trend: 'declining'
        },
        prediction: {
          timeToFailure: { value: 72, unit: 'hours' },
          failureProbability: 65,
          impactAssessment: {
            productionLoss: 1200,
            downtimeEstimate: 240,
            costImpact: 18000
          }
        },
        recommendations: [
          {
            action: 'Inspeção visual dos rolamentos',
            priority: 'high',
            estimatedTime: 60,
            estimatedCost: 200,
            expectedBenefit: 'Identificar desgaste prematuro',
            resources: ['Técnico mecânico']
          },
          {
            action: 'Análise de óleo lubrificante',
            priority: 'medium',
            estimatedTime: 30,
            estimatedCost: 150,
            expectedBenefit: 'Detectar contaminação ou degradação',
            resources: ['Laboratório']
          }
        ],
        tags: ['vibracao', 'anomalia', 'rolamentos']
      },
      {
        type: 'performance_degradation',
        severity: 'medium',
        title: 'Degradação Gradual de Performance',
        description: `Performance da ${machine2.name} reduziu 8% nas últimas 2 semanas.`,
        machineId: machine2._id,
        confidence: 76,
        algorithm: 'statistical_analysis',
        dataSource: {
          sensors: ['velocidade_producao', 'tempo_ciclo'],
          timeRange: {
            start: new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000),
            end: currentDate
          },
          dataPoints: 20160
        },
        metrics: {
          currentOEE: 79,
          performance: 84,
          trend: 'declining'
        },
        recommendations: [
          {
            action: 'Verificar desgaste de ferramentas',
            priority: 'medium',
            estimatedTime: 90,
            estimatedCost: 300,
            expectedBenefit: 'Restaurar velocidade de corte',
            resources: ['Operador qualificado']
          },
          {
            action: 'Limpeza e lubrificação geral',
            priority: 'low',
            estimatedTime: 120,
            estimatedCost: 250,
            expectedBenefit: 'Reduzir atrito e melhorar fluidez',
            resources: ['Equipe de manutenção']
          }
        ],
        tags: ['performance', 'degradacao', 'ferramentas']
      }
    ];

    const createdAlerts = await AdvancedAlert.insertMany(alerts);
    console.log(`✅ ${createdAlerts.length} alertas criados!`);

    console.log('\n🎉 Seed de Analytics concluído com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   • ${createdInsights.length} insights de IA`);
    console.log(`   • ${createdOpportunities.length} oportunidades de otimização`);
    console.log(`   • ${createdSchedules.length} itens de cronograma`);
    console.log(`   • ${createdAlerts.length} alertas avançados`);
    console.log('\n✨ Dados prontos para uso na página Analytics!');

  } catch (error) {
    console.error('❌ Erro ao executar seed de Analytics:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada.');
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedAnalytics();
}

module.exports = seedAnalytics;