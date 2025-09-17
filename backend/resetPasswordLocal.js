const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function resetPasswordLocal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB (Local)');
    
    // Resetar senha do admin para 'admin123'
    const admin = await User.findOne({ email: 'admin@oee.com' });
    if (admin) {
      admin.password = 'admin123';
      await admin.save();
      console.log('✅ Senha do admin resetada para: admin123');
    }
    
    // Resetar senha do supervisor
    const supervisor = await User.findOne({ email: 'supervisor@oee.com' });
    if (supervisor) {
      supervisor.password = 'supervisor123';
      await supervisor.save();
      console.log('✅ Senha do supervisor resetada para: supervisor123');
    }
    
    // Resetar senha do operador
    const operator = await User.findOne({ email: 'operator@oee.com' });
    if (operator) {
      operator.password = 'operator123';
      await operator.save();
      console.log('✅ Senha do operador resetada para: operator123');
    }
    
    console.log('🎉 Senhas resetadas com sucesso no ambiente local!');
    console.log('\n📋 Credenciais atualizadas:');
    console.log('👨‍💼 Admin: admin@oee.com / admin123');
    console.log('👨‍🔧 Supervisor: supervisor@oee.com / supervisor123');
    console.log('👨‍🏭 Operador: operator@oee.com / operator123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

resetPasswordLocal();