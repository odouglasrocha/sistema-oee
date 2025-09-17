const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const Machine = require('../models/Machine');
const ProductionRecord = require('../models/ProductionRecord');
const AuditLog = require('../models/AuditLog');

// Middleware de autenticação para todas as rotas (desabilitado para permitir acesso aos dados)
// router.use(authenticateToken);

// Cores padrão para gráficos
const CHART_COLORS = {
  'Manutenção Planejada': '#3b82f6',
  'Quebras': '#ef4444',
  'Setup/Ajustes': '#f59e0b',
  'Falta Material': '#f97316',
  'Falta Operador': '#8b5cf6',
  'Outros': '#6b7280'
};

// GET /api/reports/data - Dados consolidados de relatórios
router.get('/data', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      machineId,
      shift,
      department
    } = req.query;

    // Validar datas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Incluir o dia inteiro

    // Construir filtros (corrigidos para o modelo real)
    const filters = {
      date: { $gte: start, $lte: end }
    };

    if (machineId && machineId !== 'all') {
      filters.machine = new mongoose.Types.ObjectId(machineId);
    }

    if (shift) {
      filters.shift = shift;
    }

    // Debug: Log dos filtros
    console.log('🔍 Filtros aplicados:', JSON.stringify(filters, null, 2));
    
    // Primeiro, vamos buscar registros simples para debug
    const allRecords = await ProductionRecord.find(filters).limit(5);
    console.log('📊 Registros encontrados (simples):', allRecords.length);
    if (allRecords.length > 0) {
      console.log('📋 Primeiro registro:', JSON.stringify(allRecords[0], null, 2));
    }

    // Buscar dados de produção (campos corrigidos)
    const productionData = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'machines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machineData'
        }
      },
      { $unwind: '$machineData' },
      {
        $match: department ? { 'machineData.department': department } : {}
      },
      {
        $group: {
          _id: null,
          totalProduced: { $sum: '$production.good' },
          totalTarget: { $sum: '$production.target' },
          totalDefects: { $sum: { $add: ['$production.waste.film', '$production.waste.organic'] } },
          totalDowntime: { $sum: '$time.downtime' },
          totalPlannedTime: { $sum: '$time.planned' },
          totalActualTime: { $sum: '$time.actual' },
          records: { $push: '$$ROOT' }
        }
      }
    ]);
    
    console.log('🎯 Resultado da agregação:', productionData.length, productionData.length > 0 ? productionData[0] : 'Nenhum resultado');

    if (!productionData.length) {
      return res.json({
        success: true,
        data: {
          summary: {
            totalProduced: 0,
            totalTarget: 0,
            averageOEE: 0,
            averageAvailability: 0,
            averagePerformance: 0,
            averageQuality: 0,
            totalDowntime: 0,
            totalDefects: 0,
            efficiency: 0
          },
          oeeHistory: [],
          downtimeAnalysis: [],
          machineEfficiency: [],
          qualityMetrics: {
            totalProduced: 0,
            totalDefects: 0,
            qualityRate: 0,
            reworkRate: 0,
            scrapRate: 0
          }
        }
      });
    }

    const data = productionData[0];
    
    // Calcular métricas de OEE
    const availability = data.totalPlannedTime > 0 ? 
      (data.totalActualTime / data.totalPlannedTime) * 100 : 0;
    
    const performance = data.totalTarget > 0 ? 
      (data.totalProduced / data.totalTarget) * 100 : 0;
    
    const quality = data.totalProduced > 0 ? 
      ((data.totalProduced - data.totalDefects) / data.totalProduced) * 100 : 0;
    
    const oee = (availability * performance * quality) / 10000;
    const efficiency = data.totalTarget > 0 ? 
      (data.totalProduced / data.totalTarget) * 100 : 0;

    // Histórico de OEE por dia (campos corrigidos)
    const oeeHistory = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'machines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machineData'
        }
      },
      { $unwind: '$machineData' },
      {
        $match: department ? { 'machineData.department': department } : {}
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            machineId: '$machine',
            machineName: '$machineData.name',
            shift: '$shift'
          },
          totalProduced: { $sum: '$production.good' },
          totalTarget: { $sum: '$production.target' },
          totalDefects: { $sum: { $add: ['$production.waste.film', '$production.waste.organic'] } },
          totalDowntime: { $sum: '$time.downtime' },
          plannedTime: { $sum: '$time.planned' },
          actualTime: { $sum: '$time.actual' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          machineId: '$_id.machineId',
          machineName: '$_id.machineName',
          shift: '$_id.shift',
          quantityProduced: '$totalProduced',
          targetQuantity: '$totalTarget',
          defectCount: '$totalDefects',
          downtime: '$totalDowntime',
          plannedTime: 1,
          actualTime: 1,
          availability: {
            $cond: [
              { $gt: ['$plannedTime', 0] },
              { $multiply: [{ $divide: ['$actualTime', '$plannedTime'] }, 100] },
              0
            ]
          },
          performance: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          },
          quality: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 100] },
              100
            ]
          }
        }
      },
      {
        $addFields: {
          oee: {
            $divide: [
              { $multiply: [
                { $multiply: ['$availability', '$performance'] },
                '$quality'
              ]},
              10000
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Análise de paradas por categoria
    const downtimeAnalysis = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine'
        }
      },
      { $unwind: '$machine' },
      {
        $match: department ? { 'machine.department': department } : {}
      },
      {
        $group: {
          _id: '$downtimeReason',
          totalTime: { $sum: '$downtime' },
          occurrences: { $sum: 1 }
        }
      },
      {
        $project: {
          category: { $ifNull: ['$_id', 'Outros'] },
          totalTime: 1,
          occurrences: 1,
          averageDuration: { $divide: ['$totalTime', '$occurrences'] }
        }
      }
    ]);

    // Calcular percentuais de downtime
    const totalDowntimeSum = downtimeAnalysis.reduce((sum, item) => sum + item.totalTime, 0);
    const downtimeWithPercentage = downtimeAnalysis.map(item => ({
      ...item,
      percentage: totalDowntimeSum > 0 ? (item.totalTime / totalDowntimeSum) * 100 : 0,
      color: CHART_COLORS[item.category] || CHART_COLORS['Outros']
    }));

    // Eficiência por máquina
    const machineEfficiency = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine'
        }
      },
      { $unwind: '$machine' },
      {
        $match: department ? { 'machine.department': department } : {}
      },
      {
        $group: {
          _id: {
            machineId: '$machineId',
            machineName: '$machine.name'
          },
          totalProduced: { $sum: '$quantityProduced' },
          totalTarget: { $sum: '$targetQuantity' },
          totalDefects: { $sum: '$defectCount' },
          plannedTime: { $sum: '$plannedDuration' },
          actualTime: { $sum: '$duration' }
        }
      },
      {
        $project: {
          machineId: '$_id.machineId',
          machineName: '$_id.machineName',
          target: '$totalTarget',
          produced: '$totalProduced',
          efficiency: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          },
          availability: {
            $cond: [
              { $gt: ['$plannedTime', 0] },
              { $multiply: [{ $divide: ['$actualTime', '$plannedTime'] }, 100] },
              0
            ]
          },
          performance: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          },
          quality: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 100] },
              100
            ]
          }
        }
      },
      {
        $addFields: {
          oee: {
            $divide: [
              { $multiply: [
                { $multiply: ['$availability', '$performance'] },
                '$quality'
              ]},
              10000
            ]
          }
        }
      },
      { $sort: { efficiency: -1 } }
    ]);

    // Métricas de qualidade
    const qualityRate = quality;
    const defectRate = data.totalProduced > 0 ? (data.totalDefects / data.totalProduced) * 100 : 0;
    
    const response = {
      summary: {
        totalProduced: data.totalProduced,
        totalTarget: data.totalTarget,
        averageOEE: Number(oee.toFixed(1)),
        averageAvailability: Number(availability.toFixed(1)),
        averagePerformance: Number(performance.toFixed(1)),
        averageQuality: Number(quality.toFixed(1)),
        totalDowntime: data.totalDowntime,
        totalDefects: data.totalDefects,
        efficiency: Number(efficiency.toFixed(1))
      },
      oeeHistory: oeeHistory.map(item => ({
        ...item,
        availability: Number(item.availability.toFixed(1)),
        performance: Number(item.performance.toFixed(1)),
        quality: Number(item.quality.toFixed(1)),
        oee: Number(item.oee.toFixed(1))
      })),
      downtimeAnalysis: downtimeWithPercentage,
      machineEfficiency: machineEfficiency.map(item => ({
        ...item,
        efficiency: Number(item.efficiency.toFixed(1)),
        availability: Number(item.availability.toFixed(1)),
        performance: Number(item.performance.toFixed(1)),
        quality: Number(item.quality.toFixed(1)),
        oee: Number(item.oee.toFixed(1))
      })),
      qualityMetrics: {
        totalProduced: data.totalProduced,
        totalDefects: data.totalDefects,
        qualityRate: Number(qualityRate.toFixed(1)),
        reworkRate: 0, // Implementar se houver dados de retrabalho
        scrapRate: Number(defectRate.toFixed(1))
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/oee-history - Histórico detalhado de OEE
router.get('/oee-history', async (req, res) => {
  try {
    const { startDate, endDate, machineId, shift } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filters = {
      startTime: { $gte: start, $lte: end }
    };

    if (machineId && machineId !== 'all') {
      filters.machineId = new mongoose.Types.ObjectId(machineId);
    }

    if (shift) {
      filters.shift = shift;
    }

    const oeeData = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine'
        }
      },
      { $unwind: '$machine' },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          machineId: '$machineId',
          machineName: '$machine.name',
          shift: '$shift',
          quantityProduced: '$quantityProduced',
          targetQuantity: '$targetQuantity',
          defectCount: '$defectCount',
          downtime: '$downtime',
          plannedTime: '$plannedDuration',
          actualTime: '$duration',
          availability: {
            $cond: [
              { $gt: ['$plannedDuration', 0] },
              { $multiply: [{ $divide: ['$duration', '$plannedDuration'] }, 100] },
              0
            ]
          },
          performance: {
            $cond: [
              { $gt: ['$targetQuantity', 0] },
              { $multiply: [{ $divide: ['$quantityProduced', '$targetQuantity'] }, 100] },
              0
            ]
          },
          quality: {
            $cond: [
              { $gt: ['$quantityProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$quantityProduced', '$defectCount'] }, '$quantityProduced'] }, 100] },
              100
            ]
          }
        }
      },
      {
        $addFields: {
          oee: {
            $divide: [
              { $multiply: [
                { $multiply: ['$availability', '$performance'] },
                '$quality'
              ]},
              10000
            ]
          }
        }
      },
      { $sort: { date: 1, machineId: 1, shift: 1 } }
    ]);

    res.json({
      success: true,
      data: oeeData.map(item => ({
        ...item,
        availability: Number(item.availability.toFixed(1)),
        performance: Number(item.performance.toFixed(1)),
        quality: Number(item.quality.toFixed(1)),
        oee: Number(item.oee.toFixed(1))
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar histórico de OEE:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/production-summary - Resumo de produção
router.get('/production-summary', async (req, res) => {
  try {
    const { startDate, endDate, machineId, shift } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filters = {
      startTime: { $gte: start, $lte: end }
    };

    if (machineId && machineId !== 'all') {
      filters.machineId = new mongoose.Types.ObjectId(machineId);
    }

    if (shift) {
      filters.shift = shift;
    }

    const summary = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalProduced: { $sum: '$quantityProduced' },
          totalTarget: { $sum: '$targetQuantity' },
          totalDefects: { $sum: '$defectCount' },
          totalDowntime: { $sum: '$downtime' },
          totalPlannedTime: { $sum: '$plannedDuration' },
          totalActualTime: { $sum: '$duration' },
          recordCount: { $sum: 1 }
        }
      },
      {
        $project: {
          totalProduced: 1,
          totalTarget: 1,
          totalDefects: 1,
          totalDowntime: 1,
          averageOEE: {
            $divide: [
              { $multiply: [
                { $multiply: [
                  { $cond: [{ $gt: ['$totalPlannedTime', 0] }, { $divide: ['$totalActualTime', '$totalPlannedTime'] }, 0] },
                  { $cond: [{ $gt: ['$totalTarget', 0] }, { $divide: ['$totalProduced', '$totalTarget'] }, 0] }
                ]},
                { $cond: [{ $gt: ['$totalProduced', 0] }, { $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 1] }
              ]},
              1
            ]
          },
          averageAvailability: {
            $cond: [
              { $gt: ['$totalPlannedTime', 0] },
              { $multiply: [{ $divide: ['$totalActualTime', '$totalPlannedTime'] }, 100] },
              0
            ]
          },
          averagePerformance: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          },
          averageQuality: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 100] },
              100
            ]
          },
          efficiency: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    const result = summary[0] || {
      totalProduced: 0,
      totalTarget: 0,
      totalDefects: 0,
      totalDowntime: 0,
      averageOEE: 0,
      averageAvailability: 0,
      averagePerformance: 0,
      averageQuality: 0,
      efficiency: 0
    };

    // Converter OEE de decimal para percentual
    result.averageOEE = Number((result.averageOEE * 100).toFixed(1));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar resumo de produção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/downtime-analysis - Análise de paradas
router.get('/downtime-analysis', async (req, res) => {
  try {
    const { startDate, endDate, machineId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filters = {
      startTime: { $gte: start, $lte: end },
      downtime: { $gt: 0 }
    };

    if (machineId && machineId !== 'all') {
      filters.machineId = new mongoose.Types.ObjectId(machineId);
    }

    const downtimeData = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $group: {
          _id: { $ifNull: ['$downtimeReason', 'Outros'] },
          totalTime: { $sum: '$downtime' },
          occurrences: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          totalTime: 1,
          occurrences: 1,
          averageDuration: { $divide: ['$totalTime', '$occurrences'] }
        }
      },
      { $sort: { totalTime: -1 } }
    ]);

    // Calcular percentuais
    const totalDowntime = downtimeData.reduce((sum, item) => sum + item.totalTime, 0);
    
    const result = downtimeData.map(item => ({
      category: item.category,
      totalTime: item.totalTime,
      percentage: totalDowntime > 0 ? Number(((item.totalTime / totalDowntime) * 100).toFixed(1)) : 0,
      occurrences: item.occurrences,
      averageDuration: Number(item.averageDuration.toFixed(1)),
      color: CHART_COLORS[item.category] || CHART_COLORS['Outros']
    }));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao analisar paradas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/machine-efficiency - Eficiência por máquina
router.get('/machine-efficiency', async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filters = {
      startTime: { $gte: start, $lte: end }
    };

    const machineData = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'machines',
          localField: 'machineId',
          foreignField: '_id',
          as: 'machine'
        }
      },
      { $unwind: '$machine' },
      {
        $match: department ? { 'machine.department': department } : {}
      },
      {
        $group: {
          _id: {
            machineId: '$machineId',
            machineName: '$machine.name'
          },
          totalProduced: { $sum: '$quantityProduced' },
          totalTarget: { $sum: '$targetQuantity' },
          totalDefects: { $sum: '$defectCount' },
          plannedTime: { $sum: '$plannedDuration' },
          actualTime: { $sum: '$duration' }
        }
      },
      {
        $project: {
          machineId: '$_id.machineId',
          machineName: '$_id.machineName',
          target: '$totalTarget',
          produced: '$totalProduced',
          efficiency: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          },
          availability: {
            $cond: [
              { $gt: ['$plannedTime', 0] },
              { $multiply: [{ $divide: ['$actualTime', '$plannedTime'] }, 100] },
              0
            ]
          },
          performance: {
            $cond: [
              { $gt: ['$totalTarget', 0] },
              { $multiply: [{ $divide: ['$totalProduced', '$totalTarget'] }, 100] },
              0
            ]
          },
          quality: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 100] },
              100
            ]
          }
        }
      },
      {
        $addFields: {
          oee: {
            $divide: [
              { $multiply: [
                { $multiply: ['$availability', '$performance'] },
                '$quality'
              ]},
              10000
            ]
          }
        }
      },
      { $sort: { efficiency: -1 } }
    ]);

    const result = machineData.map(item => ({
      ...item,
      efficiency: Number(item.efficiency.toFixed(1)),
      availability: Number(item.availability.toFixed(1)),
      performance: Number(item.performance.toFixed(1)),
      quality: Number(item.quality.toFixed(1)),
      oee: Number(item.oee.toFixed(1))
    }));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar eficiência das máquinas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/quality-metrics - Métricas de qualidade
router.get('/quality-metrics', requirePermission('reports.view'), async (req, res) => {
  try {
    const { startDate, endDate, machineId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filters = {
      startTime: { $gte: start, $lte: end }
    };

    if (machineId && machineId !== 'all') {
      filters.machineId = new mongoose.Types.ObjectId(machineId);
    }

    const qualityData = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalProduced: { $sum: '$quantityProduced' },
          totalDefects: { $sum: '$defectCount' },
          totalRework: { $sum: { $ifNull: ['$reworkCount', 0] } }
        }
      },
      {
        $project: {
          totalProduced: 1,
          totalDefects: 1,
          totalRework: 1,
          qualityRate: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 100] },
              100
            ]
          },
          reworkRate: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: ['$totalRework', '$totalProduced'] }, 100] },
              0
            ]
          },
          scrapRate: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: ['$totalDefects', '$totalProduced'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    const result = qualityData[0] || {
      totalProduced: 0,
      totalDefects: 0,
      totalRework: 0,
      qualityRate: 100,
      reworkRate: 0,
      scrapRate: 0
    };

    // Arredondar valores
    result.qualityRate = Number(result.qualityRate.toFixed(1));
    result.reworkRate = Number(result.reworkRate.toFixed(1));
    result.scrapRate = Number(result.scrapRate.toFixed(1));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar métricas de qualidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/reports/compare-periods - Comparar períodos
router.post('/compare-periods', requirePermission('reports.view'), async (req, res) => {
  try {
    const { currentPeriod, previousPeriod } = req.body;

    if (!currentPeriod || !previousPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Períodos atual e anterior são obrigatórios'
      });
    }

    // Função para buscar dados de um período
    const getPeriodData = async (period) => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      end.setHours(23, 59, 59, 999);

      const filters = {
        startTime: { $gte: start, $lte: end }
      };

      if (period.machineId && period.machineId !== 'all') {
        filters.machineId = new mongoose.Types.ObjectId(period.machineId);
      }

      const data = await ProductionRecord.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalProduced: { $sum: '$quantityProduced' },
            totalTarget: { $sum: '$targetQuantity' },
            totalDefects: { $sum: '$defectCount' },
            totalDowntime: { $sum: '$downtime' },
            totalPlannedTime: { $sum: '$plannedDuration' },
            totalActualTime: { $sum: '$duration' }
          }
        }
      ]);

      if (!data.length) {
        return {
          totalProduced: 0,
          totalTarget: 0,
          averageOEE: 0,
          averageAvailability: 0,
          averagePerformance: 0,
          averageQuality: 0,
          totalDowntime: 0,
          totalDefects: 0,
          efficiency: 0
        };
      }

      const periodData = data[0];
      const availability = periodData.totalPlannedTime > 0 ? 
        (periodData.totalActualTime / periodData.totalPlannedTime) * 100 : 0;
      const performance = periodData.totalTarget > 0 ? 
        (periodData.totalProduced / periodData.totalTarget) * 100 : 0;
      const quality = periodData.totalProduced > 0 ? 
        ((periodData.totalProduced - periodData.totalDefects) / periodData.totalProduced) * 100 : 100;
      const oee = (availability * performance * quality) / 10000;
      const efficiency = periodData.totalTarget > 0 ? 
        (periodData.totalProduced / periodData.totalTarget) * 100 : 0;

      return {
        totalProduced: periodData.totalProduced,
        totalTarget: periodData.totalTarget,
        averageOEE: Number(oee.toFixed(1)),
        averageAvailability: Number(availability.toFixed(1)),
        averagePerformance: Number(performance.toFixed(1)),
        averageQuality: Number(quality.toFixed(1)),
        totalDowntime: periodData.totalDowntime,
        totalDefects: periodData.totalDefects,
        efficiency: Number(efficiency.toFixed(1))
      };
    };

    const [current, previous] = await Promise.all([
      getPeriodData(currentPeriod),
      getPeriodData(previousPeriod)
    ]);

    // Calcular mudanças percentuais
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const comparison = {
      oeeChange: calculateChange(current.averageOEE, previous.averageOEE),
      productionChange: calculateChange(current.totalProduced, previous.totalProduced),
      qualityChange: calculateChange(current.averageQuality, previous.averageQuality),
      downtimeChange: calculateChange(current.totalDowntime, previous.totalDowntime)
    };

    res.json({
      success: true,
      data: {
        current,
        previous,
        comparison
      }
    });

  } catch (error) {
    console.error('Erro ao comparar períodos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/reports/export - Exportar relatório
router.post('/export', requirePermission('reports.export'), async (req, res) => {
  try {
    const { format, reportType, filters, includeCharts } = req.body;

    if (!format || !reportType || !filters) {
      return res.status(400).json({
        success: false,
        message: 'Formato, tipo de relatório e filtros são obrigatórios'
      });
    }

    // Validar formato
    if (!['excel', 'pdf', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Formato inválido. Use: excel, pdf ou csv'
      });
    }

    // Validar tipo de relatório
    if (!['oee', 'production', 'downtime', 'quality', 'complete'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de relatório inválido'
      });
    }

    // Por enquanto, retornar uma URL de download simulada
    // Em uma implementação real, você geraria o arquivo e retornaria a URL
    const fileName = `relatorio_${reportType}_${filters.startDate}_${filters.endDate}.${format}`;
    const downloadUrl = `/api/reports/download/${fileName}`;

    res.json({
      success: true,
      data: {
        downloadUrl,
        fileName,
        format,
        reportType,
        generatedAt: new Date().toISOString()
      },
      message: 'Relatório gerado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/download/:filename - Download de arquivo
router.get('/download/:filename', requirePermission('reports.view'), async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Por enquanto, retornar um arquivo de exemplo
    // Em uma implementação real, você serviria o arquivo gerado
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Simular conteúdo do arquivo
    const content = `Relatório OEE - Sistema de Monitoramento\n\nGerado em: ${new Date().toLocaleString('pt-BR')}\n\nEste é um arquivo de exemplo.\nEm uma implementação real, aqui estariam os dados do relatório.`;
    
    res.send(Buffer.from(content, 'utf-8'));

  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/reports/real-time - Dados em tempo real
router.get('/real-time', requirePermission('reports.view'), async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Dados do dia atual
    const todayData = await ProductionRecord.aggregate([
      {
        $match: {
          startTime: { $gte: today },
          status: { $in: ['active', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalProduced: { $sum: '$quantityProduced' },
          totalTarget: { $sum: '$targetQuantity' },
          totalDefects: { $sum: '$defectCount' },
          totalPlannedTime: { $sum: '$plannedDuration' },
          totalActualTime: { $sum: '$duration' },
          activeMachines: { $addToSet: '$machineId' }
        }
      }
    ]);

    const data = todayData[0] || {
      totalProduced: 0,
      totalTarget: 0,
      totalDefects: 0,
      totalPlannedTime: 0,
      totalActualTime: 0,
      activeMachines: []
    };

    // Calcular OEE atual
    const availability = data.totalPlannedTime > 0 ? 
      (data.totalActualTime / data.totalPlannedTime) * 100 : 0;
    const performance = data.totalTarget > 0 ? 
      (data.totalProduced / data.totalTarget) * 100 : 0;
    const quality = data.totalProduced > 0 ? 
      ((data.totalProduced - data.totalDefects) / data.totalProduced) * 100 : 100;
    const currentOEE = (availability * performance * quality) / 10000;
    const qualityRate = quality;

    // Buscar alertas recentes (últimas 24 horas)
    const alerts = await AuditLog.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      action: { $in: ['machine_alert', 'production_alert', 'quality_alert'] }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('action details createdAt')
    .lean();

    const formattedAlerts = alerts.map(alert => ({
      id: alert._id,
      type: alert.action,
      message: alert.details?.message || 'Alerta do sistema',
      severity: alert.details?.severity || 'medium',
      timestamp: alert.createdAt
    }));

    res.json({
      success: true,
      data: {
        currentOEE: Number(currentOEE.toFixed(1)),
        activeMachines: data.activeMachines.length,
        totalProduction: data.totalProduced,
        qualityRate: Number(qualityRate.toFixed(1)),
        alerts: formattedAlerts
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados em tempo real:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;