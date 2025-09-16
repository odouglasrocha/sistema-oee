# OEE Monitor - Sistema de Monitoramento Industrial

Sistema completo de monitoramento e cálculo de OEE (Overall Equipment Effectiveness) com análise inteligente de dados industriais.

## 🚀 Funcionalidades

### ✅ **Implementado na Versão 1.0**

- **🔐 Autenticação & Autorização**
  - Sistema de login com perfis hierárquicos
  - Perfis: Operador, Supervisor, Administrador
  - Interface responsiva e moderna

- **📊 Dashboard Principal**
  - Métricas OEE em tempo real
  - Visualização de disponibilidade, performance e qualidade
  - Status das máquinas com alertas visuais
  - Gráficos interativos com Recharts

- **🏭 Gestão de Máquinas**
  - CRUD completo (Criar, Listar, Editar, Excluir)
  - Status em tempo real (Ativa, Manutenção, Parada, Inativa)
  - Configuração de capacidades e fatores de conversão
  - Filtros e busca avançada
  - Visualização detalhada com turnos
  - Agendamento de manutenções

- **⚙️ Controle de Produção**
  - Registro de produção por turno
  - Cálculo automático de OEE
  - Controle de refugos (filme e orgânico)
  - Registro de operadores e observações
  - Filtros por data e turno

- **📋 Sistema de Relatórios**
  - Visão geral com métricas consolidadas
  - Relatórios detalhados de OEE
  - Análise de paradas e perdas
  - Gráficos de tendência e distribuição
  - Exportação para Excel e PDF

- **👥 Gestão de Usuários**
  - CRUD completo de usuários
  - Sistema de perfis e permissões
  - Ativação/desativação de contas
  - Controle por departamento e localização
  - Dashboard estatístico

- **🧠 Análise Avançada (IA)**
  - Predição de OEE baseada em dados históricos
  - Identificação de padrões de falha
  - Análise multidimensional com radar charts
  - Recomendações inteligentes de otimização
  - Sistema de insights com diferentes níveis de confiança

- **🎨 Design System Profissional**
  - Paleta de cores industrial moderna
  - Componentes reutilizáveis baseados em shadcn/ui
  - Animações suaves e interações intuitivas
  - Suporte a temas claro/escuro automático

### 🔧 **Recursos Técnicos**

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Gráficos**: Recharts para visualização de dados
- **Roteamento**: React Router DOM
- **Estado**: Context API + React Query
- **Ícones**: Lucide React
- **Build**: Vite com otimizações de produção

## 🎯 **Contas de Demonstração**

- **Administrador**: `admin@oee.com` | senha: `demo123`
- **Supervisor**: `supervisor@oee.com` | senha: `demo123`
- **Operador**: `operator@oee.com` | senha: `demo123`

## 🔮 **Roadmap - Próximas Versões**

### Versão 1.1 - Configurações & Integrações
- [ ] Página de configurações do sistema
- [ ] Configuração de alertas personalizados
- [ ] Integração com sistemas MES/ERP
- [ ] Configuração de turnos customizados

### Versão 1.2 - Backend & API
- [ ] API Node.js + Express
- [ ] Integração MongoDB
- [ ] Autenticação JWT
- [ ] WebSockets para tempo real

### Versão 2.0 - IA Avançada
- [ ] Machine Learning para predições
- [ ] Análise de séries temporais
- [ ] Detecção de anomalias
- [ ] Otimização automática de parâmetros

## 📈 **Métricas de Qualidade**

### OEE (Overall Equipment Effectiveness)
- **Excelente**: ≥ 85% (Verde)
- **Bom**: 65-84% (Amarelo)
- **Razoável**: 50-64% (Laranja)
- **Crítico**: < 50% (Vermelho)

### Componentes do OEE
- **Disponibilidade** = (Tempo Real ÷ Tempo Planejado) × 100
- **Performance** = (Produção Real ÷ Produção Teórica) × 100
- **Qualidade** = (Produção Boa ÷ Produção Total) × 100
- **OEE** = Disponibilidade × Performance × Qualidade

## 🎨 **Design System**

### Cores Principais
- **Primary**: Azul Industrial (`hsl(214 78% 35%)`)
- **Accent**: Laranja Técnico (`hsl(25 95% 53%)`)
- **Success**: Verde Operacional (`hsl(142 76% 36%)`)
- **Warning**: Amarelo Atenção (`hsl(45 93% 47%)`)
- **Error**: Vermelho Crítico (`hsl(0 85% 60%)`)

### Componentes Especializados
- Cartões de métricas com status colorido
- Gráficos industriais responsivos
- Indicadores de status em tempo real
- Animações industriais suaves

## 🚀 **Como Executar**

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🏗️ **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn)
│   ├── MetricCard.tsx  # Cartões de métricas
│   ├── OEEChart.tsx    # Gráficos OEE
│   └── Layout.tsx      # Layout principal
├── contexts/           # Contextos React
│   └── AuthContext.tsx # Autenticação
├── pages/              # Páginas da aplicação
│   ├── Login.tsx       # Página de login
│   ├── Dashboard.tsx   # Dashboard principal
│   └── Analytics.tsx   # Análise avançada
├── types/              # Definições TypeScript
├── hooks/              # Custom hooks
└── assets/             # Recursos estáticos
```

## 🔧 **Configuração**

### Variáveis de Ambiente
```env
# Em produção, configurar:
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
```

### Integração Futura
- **MongoDB**: Banco de dados principal
- **Node.js API**: Backend para integração
- **WebSockets**: Atualizações em tempo real
- **IoT Sensors**: Coleta automática de dados

---

## 📄 **Licença**

MIT License - Sistema OEE Monitor

## 🤝 **Contribuição**

Este é um sistema em desenvolvimento ativo. Contribuições são bem-vindas!

---

*Sistema desenvolvido com foco na excelência operacional e indústria 4.0* 🏭