const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const ProductionRecord = require('../models/ProductionRecord');
const { authenticateToken } = require('../middleware/auth');

// Middleware para autenticação (opcional para dados públicos de dashboard)
// router.use(authenticateToken);

// Rota principal do dashboard OEE - dados em tempo real
router.get('/oee', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    // Definir período de consulta
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Buscar todas as máquinas ativas no sistema
    const machines = await Machine.find({ 
      isActive: true 
    }).select('name code location oeeConfig status');

    // Buscar registros de produção recentes para cada máquina
    const machinesWithOEE = await Promise.all(
      machines.map(async (machine) => {
        // Buscar registros de produção mais recentes
        const recentRecords = await ProductionRecord.find({
          machine: machine._id,
          date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1, createdAt: -1 }).limit(10);

        // Calcular métricas médias
        let avgOEE = 0, avgAvailability = 0, avgPerformance = 0, avgQuality = 0;
        let status = 'inactive';
        
        if (recentRecords.length > 0) {
          const validRecords = recentRecords.filter(r => r.oee && r.oee.overall !== undefined);
          
          if (validRecords.length > 0) {
            avgOEE = validRecords.reduce((sum, r) => sum + r.oee.overall, 0) / validRecords.length;
            avgAvailability = validRecords.reduce((sum, r) => sum + r.oee.availability, 0) / validRecords.length;
            avgPerformance = validRecords.reduce((sum, r) => sum + r.oee.performance, 0) / validRecords.length;
            avgQuality = validRecords.reduce((sum, r) => sum + r.oee.quality, 0) / validRecords.length;
            
            // Determinar status baseado no OEE (sempre ativo se há dados)
            if (avgOEE >= 85) status = 'excellent';
            else if (avgOEE >= 65) status = 'good';
            else if (avgOEE >= 50) status = 'warning';
            else status = 'critical';
          }
        }

        // Buscar último registro para determinar se está ativa
        const lastRecord = recentRecords[0];
        const isRecentlyActive = lastRecord && 
          (new Date() - new Date(lastRecord.createdAt)) < 24 * 60 * 60 * 1000; // 24 horas (mais flexível)

        return {
          id: machine._id.toString(),
          name: machine.name,
          code: machine.code,
          location: machine.location,
          oee: Math.round(avgOEE * 10) / 10,
          availability: Math.round(avgAvailability * 10) / 10,
          performance: Math.round(avgPerformance * 10) / 10,
          quality: Math.round(avgQuality * 10) / 10,
          status: isRecentlyActive ? status : 'inactive',
          lastUpdate: lastRecord ? lastRecord.createdAt : null,
          recordsCount: recentRecords.length,
          target: machine.oeeConfig?.targetOEE || 85
        };
      })
    );

    // Calcular métricas gerais
    const activeMachines = machinesWithOEE.filter(m => m.status !== 'inactive');
    const machinesWithData = machinesWithOEE.filter(m => m.recordsCount > 0); // Máquinas com dados
    

    
    const overallOEE = machinesWithData.length > 0 
      ? machinesWithData.reduce((sum, m) => sum + m.oee, 0) / machinesWithData.length 
      : 0;
    const overallAvailability = machinesWithData.length > 0 
      ? machinesWithData.reduce((sum, m) => sum + m.availability, 0) / machinesWithData.length 
      : 0;
    const overallPerformance = machinesWithData.length > 0 
      ? machinesWithData.reduce((sum, m) => sum + m.performance, 0) / machinesWithData.length 
      : 0;
    const overallQuality = machinesWithData.length > 0 
      ? machinesWithData.reduce((sum, m) => sum + m.quality, 0) / machinesWithData.length 
      : 0;

    const criticalMachines = machinesWithData.filter(m => m.oee < 65).length;

    res.json({
      success: true,
      data: {
        machines: machinesWithOEE,
        summary: {
          overallOEE: Math.round(overallOEE * 10) / 10,
          overallAvailability: Math.round(overallAvailability * 10) / 10,
          overallPerformance: Math.round(overallPerformance * 10) / 10,
          overallQuality: Math.round(overallQuality * 10) / 10,
          activeMachines: activeMachines.length,
          totalMachines: machines.length,
          criticalMachines,
          period,
          lastUpdate: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard OEE:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Rota para dados históricos de OEE (gráfico de tendência)
router.get('/oee/trend', async (req, res) => {
  try {
    const { machineId, hours = 24 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - parseInt(hours) * 60 * 60 * 1000);
    
    let query = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (machineId && machineId !== 'all') {
      query.machine = machineId;
    }
    
    const records = await ProductionRecord.find(query)
      .populate('machine', 'name code')
      .sort({ date: 1, createdAt: 1 });
    
    // Agrupar dados por hora
    const hourlyData = {};
    
    records.forEach(record => {
      const hour = new Date(record.date).toISOString().substring(0, 13) + ':00:00.000Z';
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          time: new Date(hour).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          oee: [],
          availability: [],
          performance: [],
          quality: []
        };
      }
      
      if (record.oee) {
        hourlyData[hour].oee.push(record.oee.overall || 0);
        hourlyData[hour].availability.push(record.oee.availability || 0);
        hourlyData[hour].performance.push(record.oee.performance || 0);
        hourlyData[hour].quality.push(record.oee.quality || 0);
      }
    });
    
    // Calcular médias por hora
    const trendData = Object.keys(hourlyData)
      .sort()
      .map(hour => {
        const data = hourlyData[hour];
        return {
          time: data.time,
          oee: data.oee.length > 0 ? Math.round((data.oee.reduce((a, b) => a + b, 0) / data.oee.length) * 10) / 10 : 0,
          availability: data.availability.length > 0 ? Math.round((data.availability.reduce((a, b) => a + b, 0) / data.availability.length) * 10) / 10 : 0,
          performance: data.performance.length > 0 ? Math.round((data.performance.reduce((a, b) => a + b, 0) / data.performance.length) * 10) / 10 : 0,
          quality: data.quality.length > 0 ? Math.round((data.quality.reduce((a, b) => a + b, 0) / data.quality.length) * 10) / 10 : 0
        };
      });
    
    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Erro ao buscar dados de tendência OEE:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Rota para detalhes de uma máquina específica
router.get('/machine/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'today' } = req.query;
    
    // Buscar máquina
    const machine = await Machine.findById(id)
      .populate('responsible.operator', 'name email')
      .populate('responsible.technician', 'name email')
      .populate('responsible.supervisor', 'name email');
    
    if (!machine) {
      return res.status(404).json({ 
        success: false, 
        error: 'Máquina não encontrada' 
      });
    }
    
    // Definir período
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    
    // Buscar registros de produção
    const productionRecords = await ProductionRecord.find({
      machine: id,
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('operator', 'name email')
    .sort({ date: -1, createdAt: -1 });
    
    // Calcular estatísticas
    const stats = {
      totalRecords: productionRecords.length,
      totalProduction: productionRecords.reduce((sum, r) => sum + (r.production?.good || 0), 0),
      totalWaste: productionRecords.reduce((sum, r) => sum + ((r.production?.waste?.film || 0) + (r.production?.waste?.organic || 0)), 0),
      totalDowntime: productionRecords.reduce((sum, r) => sum + (r.time?.downtime || 0), 0),
      avgOEE: 0,
      avgAvailability: 0,
      avgPerformance: 0,
      avgQuality: 0
    };
    
    const validRecords = productionRecords.filter(r => r.oee && r.oee.overall !== undefined);
    if (validRecords.length > 0) {
      stats.avgOEE = Math.round((validRecords.reduce((sum, r) => sum + r.oee.overall, 0) / validRecords.length) * 10) / 10;
      stats.avgAvailability = Math.round((validRecords.reduce((sum, r) => sum + r.oee.availability, 0) / validRecords.length) * 10) / 10;
      stats.avgPerformance = Math.round((validRecords.reduce((sum, r) => sum + r.oee.performance, 0) / validRecords.length) * 10) / 10;
      stats.avgQuality = Math.round((validRecords.reduce((sum, r) => sum + r.oee.quality, 0) / validRecords.length) * 10) / 10;
    }
    
    // Análise de paradas
    const downtimeAnalysis = {};
    productionRecords.forEach(record => {
      if (record.downtimeEntries && record.downtimeEntries.length > 0) {
        record.downtimeEntries.forEach(entry => {
          if (!downtimeAnalysis[entry.reason]) {
            downtimeAnalysis[entry.reason] = {
              count: 0,
              totalDuration: 0,
              percentage: 0
            };
          }
          downtimeAnalysis[entry.reason].count++;
          downtimeAnalysis[entry.reason].totalDuration += entry.duration;
        });
      }
    });
    
    // Calcular percentuais de parada
    const totalDowntimeMinutes = Object.values(downtimeAnalysis).reduce((sum, item) => sum + item.totalDuration, 0);
    Object.keys(downtimeAnalysis).forEach(reason => {
      downtimeAnalysis[reason].percentage = totalDowntimeMinutes > 0 
        ? Math.round((downtimeAnalysis[reason].totalDuration / totalDowntimeMinutes) * 100)
        : 0;
    });
    
    res.json({
      success: true,
      data: {
        machine: {
          id: machine._id,
          name: machine.name,
          code: machine.code,
          description: machine.description,
          location: machine.location,
          category: machine.category,
          type: machine.type,
          status: machine.status,
          capacity: machine.capacity,
          oeeConfig: machine.oeeConfig,
          responsible: machine.responsible,
          maintenance: machine.maintenance
        },
        stats,
        downtimeAnalysis,
        recentRecords: productionRecords.slice(0, 10),
        period,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da máquina:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

module.exports = router;