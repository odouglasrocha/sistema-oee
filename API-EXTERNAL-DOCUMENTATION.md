# 📡 Documentação da API Externa - Sistema OEE

## Visão Geral

A API Externa do Sistema OEE permite que aplicações externas acessem dados de máquinas, produção e analytics, além de receber notificações automáticas através de webhooks.

**Base URL**: `https://planing-ita.com/api/external`

---

## 🔐 Autenticação

### API Keys

Todas as requisições para a API externa devem incluir uma API key válida.

**Métodos de autenticação:**

1. **Header X-API-Key** (Recomendado)
```http
X-API-Key: oee_1234567890abcdef.abcdef1234567890abcdef1234567890abcdef12
```

2. **Authorization Bearer**
```http
Authorization: Bearer oee_1234567890abcdef.abcdef1234567890abcdef1234567890abcdef12
```

### Criando uma API Key

1. Acesse o painel administrativo do sistema OEE
2. Vá para **Configurações > API Management > API Keys**
3. Clique em **"Nova API Key"**
4. Configure as permissões necessárias
5. **Importante**: Guarde a chave completa em local seguro - ela só será exibida uma vez

### Permissões Disponíveis

- `read:machines` - Ler dados de máquinas
- `write:machines` - Criar/atualizar máquinas
- `read:production` - Ler registros de produção
- `write:production` - Criar registros de produção
- `read:analytics` - Acessar dados de analytics e OEE
- `read:dashboard` - Acessar dados do dashboard
- `webhook:receive` - Receber webhooks
- `webhook:send` - Enviar webhooks

---

## 📊 Endpoints da API

### Status da API

#### GET /status
Verifica o status da API e informações da API key.

**Resposta:**
```json
{
  "success": true,
  "status": "online",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "apiKey": {
    "name": "Minha API Key",
    "permissions": ["read:machines", "read:production"],
    "rateLimit": {
      "requests": 1000,
      "window": 3600000
    }
  },
  "version": "1.0.0"
}
```

---

### 🏭 Máquinas

#### GET /machines
Lista todas as máquinas.

**Permissão necessária:** `read:machines`

**Parâmetros de consulta:**
- `page` (int): Página (padrão: 1)
- `limit` (int): Itens por página (máximo: 100, padrão: 50)
- `status` (string): Filtrar por status (running, stopped, maintenance, error)
- `department` (string): Filtrar por departamento
- `location` (string): Filtrar por localização
- `search` (string): Buscar por nome, modelo ou número de série

**Exemplo:**
```http
GET /api/external/machines?page=1&limit=10&status=running
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Torno CNC 01",
      "model": "HAAS ST-20",
      "serialNumber": "SN123456",
      "status": "running",
      "department": "usinagem",
      "location": "Linha A",
      "specifications": {
        "maxRPM": 4000,
        "power": "15kW"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### GET /machines/:id
Obter dados de uma máquina específica.

**Permissão necessária:** `read:machines`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Torno CNC 01",
    "model": "HAAS ST-20",
    "status": "running",
    "currentProduction": {
      "productName": "Peça A123",
      "quantityProduced": 45,
      "targetQuantity": 100
    }
  }
}
```

#### POST /machines
Criar nova máquina.

**Permissão necessária:** `write:machines`

**Body:**
```json
{
  "name": "Nova Máquina",
  "model": "Modelo XYZ",
  "serialNumber": "SN789012",
  "department": "producao",
  "location": "Linha B",
  "specifications": {
    "maxRPM": 3000,
    "power": "10kW"
  }
}
```

#### PUT /machines/:id
Atualizar máquina existente.

**Permissão necessária:** `write:machines`

---

### 🏭 Produção

#### GET /production
Listar registros de produção.

**Permissão necessária:** `read:production`

**Parâmetros de consulta:**
- `page`, `limit`: Paginação
- `machineId` (string): Filtrar por máquina
- `status` (string): Filtrar por status
- `startDate` (ISO date): Data inicial
- `endDate` (ISO date): Data final
- `shift` (string): Filtrar por turno

**Exemplo:**
```http
GET /api/external/production?machineId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31
```

#### POST /production
Criar novo registro de produção.

**Permissão necessária:** `write:production`

**Body:**
```json
{
  "machineId": "507f1f77bcf86cd799439011",
  "productName": "Peça A123",
  "quantityProduced": 100,
  "targetQuantity": 120,
  "defectCount": 2,
  "startTime": "2024-01-15T08:00:00.000Z",
  "endTime": "2024-01-15T16:00:00.000Z",
  "shift": "morning",
  "operator": "João Silva"
}
```

---

### 📈 Analytics

#### GET /analytics/oee
Obter dados de OEE (Overall Equipment Effectiveness).

**Permissão necessária:** `read:analytics`

**Parâmetros obrigatórios:**
- `startDate` (ISO date): Data inicial
- `endDate` (ISO date): Data final

**Parâmetros opcionais:**
- `machineId` (string): Filtrar por máquina específica
- `groupBy` (string): Agrupar por 'day' ou 'hour' (padrão: 'day')

**Exemplo:**
```http
GET /api/external/analytics/oee?startDate=2024-01-01&endDate=2024-01-31&machineId=507f1f77bcf86cd799439011
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "machine": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Torno CNC 01"
      },
      "totalProduced": 450,
      "totalDefects": 5,
      "totalTime": 480,
      "plannedTime": 480,
      "availability": 95.5,
      "quality": 98.9,
      "oee": 94.4
    }
  ],
  "summary": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "groupBy": "day",
    "totalRecords": 31
  }
}
```

---

## 🔔 Sistema de Webhooks

### O que são Webhooks?

Webhooks são notificações HTTP automáticas enviadas pelo sistema OEE quando eventos específicos ocorrem. Isso permite que sua aplicação seja notificada em tempo real sobre mudanças no sistema.

### Configurando Webhooks

1. Acesse **Configurações > API Management > Webhooks**
2. Clique em **"Novo Webhook"**
3. Configure:
   - **Nome**: Identificação do webhook
   - **URL**: Endpoint HTTPS que receberá as notificações
   - **Eventos**: Selecione os eventos que deseja receber
   - **Filtros**: Configure filtros opcionais (máquinas, departamentos, etc.)

### Eventos Disponíveis

#### Máquinas
- `machine.status_changed` - Status da máquina alterado
- `machine.created` - Nova máquina criada
- `machine.updated` - Máquina atualizada
- `machine.deleted` - Máquina removida

#### Produção
- `production.started` - Produção iniciada
- `production.completed` - Produção concluída
- `production.stopped` - Produção parada
- `production.paused` - Produção pausada
- `production.resumed` - Produção retomada

#### Alertas e OEE
- `alert.created` - Novo alerta criado
- `alert.resolved` - Alerta resolvido
- `oee.threshold_exceeded` - Limite de OEE excedido
- `oee.threshold_recovered` - OEE voltou ao normal

#### Manutenção
- `maintenance.scheduled` - Manutenção agendada
- `maintenance.completed` - Manutenção concluída

#### Sistema
- `user.created` - Novo usuário criado
- `user.updated` - Usuário atualizado
- `system.backup_completed` - Backup do sistema concluído
- `system.error` - Erro crítico do sistema

### Formato do Payload

Todos os webhooks seguem o mesmo formato:

```json
{
  "event": "machine.status_changed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "machineId": "507f1f77bcf86cd799439011",
    "machine": {
      "name": "Torno CNC 01",
      "model": "HAAS ST-20",
      "department": "usinagem"
    },
    "previousStatus": "running",
    "currentStatus": "maintenance",
    "reason": "Manutenção preventiva programada"
  },
  "source": "oee-monitor",
  "version": "1.0.0"
}
```

### Verificação de Assinatura

Todos os webhooks incluem uma assinatura HMAC-SHA256 no header `X-Webhook-Signature` para verificar a autenticidade:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

### Exemplo de Implementação

#### Node.js/Express
```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

app.post('/webhook/oee', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  const secret = 'seu_webhook_secret';
  
  // Verificar assinatura
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Assinatura inválida');
  }
  
  // Processar evento
  console.log('Evento recebido:', payload.event);
  console.log('Dados:', payload.data);
  
  // Responder rapidamente
  res.status(200).send('OK');
  
  // Processar evento de forma assíncrona
  processWebhookEvent(payload);
});

function processWebhookEvent(payload) {
  switch (payload.event) {
    case 'machine.status_changed':
      handleMachineStatusChange(payload.data);
      break;
    case 'production.completed':
      handleProductionCompleted(payload.data);
      break;
    // ... outros eventos
  }
}
```

#### Python/Flask
```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhook/oee', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_json()
    secret = 'seu_webhook_secret'
    
    # Verificar assinatura
    expected_signature = hmac.new(
        secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    
    if signature != f'sha256={expected_signature}':
        return 'Assinatura inválida', 401
    
    # Processar evento
    print(f'Evento recebido: {payload["event"]}')
    
    return 'OK', 200
```

### Retry Policy

O sistema implementa uma política de retry automática:

- **Tentativas**: 3 por padrão (configurável)
- **Delay inicial**: 1 segundo
- **Backoff**: Exponencial (2x a cada tentativa)
- **Timeout**: 30 segundos por requisição

### Testando Webhooks

Você pode testar seus webhooks através do painel administrativo:

1. Vá para **API Management > Webhooks**
2. Clique no webhook desejado
3. Clique em **"Testar Webhook"**
4. Um payload de teste será enviado para sua URL

---

## 🚦 Rate Limiting

Todas as API keys têm limites de taxa configuráveis:

- **Padrão**: 1000 requisições por hora
- **Headers de resposta**:
  - `X-RateLimit-Limit`: Limite total
  - `X-RateLimit-Remaining`: Requisições restantes
  - `X-RateLimit-Reset`: Timestamp do reset

**Exemplo de resposta quando limite é excedido:**
```json
{
  "success": false,
  "error": "Rate limit excedido",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 1000,
  "window": "60 minutos"
}
```

---

## ❌ Códigos de Erro

### Códigos HTTP
- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `401` - Não autorizado (API key inválida)
- `403` - Proibido (permissões insuficientes)
- `404` - Recurso não encontrado
- `429` - Rate limit excedido
- `500` - Erro interno do servidor

### Códigos de Erro Específicos
- `API_KEY_REQUIRED` - API key não fornecida
- `INVALID_API_KEY` - API key inválida ou expirada
- `IP_NOT_ALLOWED` - IP não autorizado
- `INSUFFICIENT_PERMISSIONS` - Permissões insuficientes
- `VALIDATION_ERROR` - Dados de entrada inválidos
- `MACHINE_NOT_FOUND` - Máquina não encontrada
- `INTERNAL_ERROR` - Erro interno do servidor

---

## 🛠️ SDKs e Bibliotecas

### JavaScript/Node.js
```javascript
class OEEApiClient {
  constructor(apiKey, baseUrl = 'https://planing-ita.com/api/external') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    return response.json();
  }
  
  async getMachines(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/machines?${query}`);
  }
  
  async getOEEData(startDate, endDate, machineId = null) {
    const params = { startDate, endDate };
    if (machineId) params.machineId = machineId;
    
    const query = new URLSearchParams(params).toString();
    return this.request(`/analytics/oee?${query}`);
  }
}

// Uso
const client = new OEEApiClient('sua_api_key_aqui');
const machines = await client.getMachines({ status: 'running' });
```

### Python
```python
import requests
from urllib.parse import urlencode

class OEEApiClient:
    def __init__(self, api_key, base_url='https://planing-ita.com/api/external'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })
    
    def request(self, endpoint, method='GET', **kwargs):
        url = f'{self.base_url}{endpoint}'
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def get_machines(self, **params):
        query = urlencode(params)
        return self.request(f'/machines?{query}')
    
    def get_oee_data(self, start_date, end_date, machine_id=None):
        params = {'startDate': start_date, 'endDate': end_date}
        if machine_id:
            params['machineId'] = machine_id
        
        query = urlencode(params)
        return self.request(f'/analytics/oee?{query}')

# Uso
client = OEEApiClient('sua_api_key_aqui')
machines = client.get_machines(status='running')
```

---

## 📞 Suporte

Para suporte técnico ou dúvidas sobre a API:

- **Email**: api-support@planing-ita.com
- **Documentação**: https://planing-ita.com/docs/api
- **Status da API**: https://planing-ita.com/api/external/status

---

## 📋 Changelog

### v1.0.0 (2024-01-15)
- Lançamento inicial da API externa
- Endpoints de máquinas, produção e analytics
- Sistema de webhooks
- Autenticação via API key
- Rate limiting configurável

---

**Última atualização**: 15 de Janeiro de 2024  
**Versão da API**: 1.0.0