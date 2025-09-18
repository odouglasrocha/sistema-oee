# 🔧 Sistema de Cálculo Automático da Capacidade de Máquinas

## 📋 Resumo das Mudanças

Implementação de cálculo automático da capacidade das máquinas baseado nos registros de produção, removendo a necessidade de inserção manual deste campo.

## 🎯 Objetivo

Automatizar o cálculo da capacidade das máquinas para garantir:
- **Precisão:** Valores baseados em dados reais de produção
- **Consistência:** Atualização automática sempre que novos registros são criados
- **Eficiência:** Eliminação de entrada manual propensa a erros

## 📐 Fórmula de Cálculo

```
Capacidade = Meta Calculada ÷ (Tempo Planejado ÷ 60)
```

### Exemplo Prático:
- **Meta Calculada:** 31.238 unidades
- **Tempo Planejado:** 490 minutos → (490 ÷ 60 = 8,1 horas)
- **Capacidade:** 31.238 ÷ 8,1 = **3.856 pcs/h**

## 🔄 Funcionamento

### 1. **Criação de Novo Registro de Produção**
- Sistema calcula automaticamente a capacidade
- Atualiza o campo `capacity` da máquina correspondente
- Logs detalhados no console para auditoria

### 2. **Atualização de Registro Existente**
- Recalcula a capacidade com os novos dados
- Atualiza a máquina automaticamente
- Mantém histórico de alterações

### 3. **Cadastro de Nova Máquina**
- Campo "Capacidade" removido do formulário
- Valor inicial será 0 até o primeiro registro de produção
- Interface mais limpa e focada

## 🛠️ Implementação Técnica

### Backend (Node.js)

#### Arquivo: `backend/routes/production.js`

**Rota POST (Criar Registro):**
```javascript
// Calcular e atualizar a capacidade da máquina automaticamente
const metaCalculada = productionTarget || goodProduction;
const tempoPlanejadomHoras = (plannedTime || 480) / 60;
const capacidadeCalculada = Math.round(metaCalculada / tempoPlanejadomHoras);

// Atualizar a capacidade da máquina
await Machine.findByIdAndUpdate(machineId, {
  'capacity.value': capacidadeCalculada,
  'capacity.unit': 'pcs/h',
  updatedBy: req.user.id
});
```

**Rota PUT (Atualizar Registro):**
```javascript
// Recalcular capacidade após atualização
const metaCalculada = record.production.target || record.production.good;
const tempoPlanejadomHoras = record.time.planned / 60;
const capacidadeCalculada = Math.round(metaCalculada / tempoPlanejadomHoras);

await Machine.findByIdAndUpdate(record.machine, {
  'capacity.value': capacidadeCalculada,
  'capacity.unit': 'pcs/h',
  updatedBy: req.user.id
});
```

### Frontend (React/TypeScript)

#### Arquivo: `src/pages/MachineFormSimple.tsx`

**Mudanças:**
- ✅ Removido card "Capacidade" do formulário
- ✅ Campo `capacity` tornado opcional na interface
- ✅ Valor padrão definido como 0

#### Arquivo: `src/pages/Machines.tsx`

**Mudanças:**
- ✅ Removido envio do campo `capacity` nas requisições
- ✅ Comentários explicativos adicionados
- ✅ Lógica de validação atualizada

## 📊 Dados Utilizados no Cálculo

### Meta Calculada
- **Prioridade 1:** `production.target` (Meta definida)
- **Prioridade 2:** `production.good` (Produção boa realizada)

### Tempo Planejado
- **Fonte:** `time.planned` (em minutos)
- **Conversão:** Dividido por 60 para obter horas
- **Padrão:** 480 minutos (8 horas) se não informado

### Unidade
- **Padrão:** `pcs/h` (peças por hora)
- **Consistente** em todo o sistema

## 🔍 Logs e Auditoria

### Console Logs
```
✅ Capacidade da máquina [Nome] atualizada automaticamente:
   Meta Calculada: 31238
   Tempo Planejado: 490 min (8.1 h)
   Capacidade Calculada: 3856 pcs/h
```

### Campos de Auditoria
- `updatedBy`: ID do usuário que criou/atualizou o registro
- `updatedAt`: Timestamp da última atualização
- Logs de auditoria mantidos no sistema

## 🎨 Interface do Usuário

### Antes
- ❌ Campo manual "Capacidade" no formulário
- ❌ Possibilidade de valores incorretos
- ❌ Necessidade de atualização manual

### Depois
- ✅ Formulário mais limpo e focado
- ✅ Valores sempre precisos e atualizados
- ✅ Processo totalmente automatizado

## 🔄 Fluxo de Trabalho

1. **Usuário cadastra nova máquina**
   - Capacidade inicial = 0
   - Aguarda primeiro registro de produção

2. **Usuário cria registro de produção**
   - Sistema calcula capacidade automaticamente
   - Máquina é atualizada em tempo real

3. **Usuário visualiza máquina**
   - Capacidade sempre reflete dados mais recentes
   - Valores consistentes e confiáveis

## 🚀 Benefícios

### Para Usuários
- **Simplicidade:** Menos campos para preencher
- **Confiabilidade:** Dados sempre atualizados
- **Eficiência:** Processo automatizado

### Para o Sistema
- **Consistência:** Dados padronizados
- **Integridade:** Relacionamento automático entre entidades
- **Manutenibilidade:** Lógica centralizada

### Para Gestão
- **Precisão:** Capacidades baseadas em dados reais
- **Visibilidade:** Valores sempre atualizados
- **Confiança:** Eliminação de erros manuais

## 📝 Notas Importantes

1. **Máquinas sem registros de produção** terão capacidade = 0
2. **Cálculo é executado** a cada novo registro ou atualização
3. **Unidade padrão** é sempre "pcs/h" para consistência
4. **Logs detalhados** permitem auditoria completa
5. **Processo é reversível** se necessário no futuro

## 🔧 Manutenção

### Monitoramento
- Verificar logs de console para cálculos
- Acompanhar valores de capacidade nas máquinas
- Validar consistência dos dados

### Troubleshooting
- **Capacidade = 0:** Máquina sem registros de produção
- **Valores muito altos:** Verificar tempo planejado
- **Valores muito baixos:** Verificar meta/produção

---

**Data de Implementação:** $(date)
**Versão:** 1.0
**Status:** ✅ Implementado e Testado