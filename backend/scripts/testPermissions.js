const mongoose = require('mongoose');
const ProductionRecord = require('../models/ProductionRecord');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

async function testPermissions() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Buscar o registro específico
    const recordId = '68c8a577057af2df3a9fdaf7';
    const record = await ProductionRecord.findById(recordId);
    
    if (!record) {
      console.log('❌ Registro não encontrado');
      return;
    }
    
    console.log('📋 Registro encontrado:');
    console.log('- ID:', record._id);
    console.log('- Criado por:', record.createdBy);
    console.log('- Data:', record.date);
    
    // Listar todos os usuários com seus roles
    const allUsers = await User.find({}).populate('role');
    console.log('\n👥 Usuários no banco:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.role ? user.role.name : 'Sem role'}`);
    });
    
    // Buscar usuário administrador
    const adminUser = await User.findOne({ email: 'admin@oee.com' }).populate('role');
    
    if (!adminUser) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('\n👤 Usuário admin:');
    console.log('- ID:', adminUser._id);
    console.log('- Email:', adminUser.email);
    console.log('- Nome:', adminUser.name);
    console.log('- Role:', adminUser.role ? adminUser.role.name : 'Sem role');
    console.log('- Permissões:', adminUser.role ? adminUser.role.permissions : 'Nenhuma');
    
    // Simular verificação de permissões
    console.log('\n🔒 Verificação de permissões:');
    console.log('- record.createdBy:', record.createdBy.toString());
    console.log('- adminUser._id:', adminUser._id.toString());
    console.log('- É criador?', record.createdBy.toString() === adminUser._id.toString());
    
    const isCreator = record.createdBy.toString() === adminUser._id.toString();
    const isAdmin = adminUser.role && (adminUser.role.name === 'administrador');
    const hasDeletePermission = adminUser.role && adminUser.role.permissions.includes('production.delete');
    
    console.log('- É admin?', isAdmin);
    console.log('- Tem permissão de delete?', hasDeletePermission);
    
    const canDelete = isCreator || isAdmin || hasDeletePermission;
    console.log('- Pode excluir?', canDelete);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testPermissions();