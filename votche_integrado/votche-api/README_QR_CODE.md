# Sistema de QR Code para VoTche

## Visão Geral

Este documento descreve a implementação do sistema de geração automática de QR Code único para cada reunião no projeto VoTche. O sistema permite que os usuários se autentiquem e acessem as votações através da leitura do QR Code.

## Funcionalidades Implementadas

### 1. Geração Automática de QR Code

- **Quando**: O QR Code é gerado automaticamente sempre que uma nova reunião é criada
- **Onde**: No método `createMeeting` do `MeetingController`
- **Como**: Utiliza a biblioteca `qrcode` para gerar um QR Code em formato base64 (Data URL)

### 2. Estrutura do QR Code

O QR Code contém uma URL no formato:
```
{FRONTEND_URL}/join/{accessPin}
```

Exemplo:
```
http://localhost:3000/join/123456
```

### 3. Armazenamento

- O QR Code é armazenado no banco de dados como uma string base64
- Campo `qrCode` adicionado ao modelo `Meeting`
- O QR Code é retornado na resposta da API ao criar uma reunião

### 4. Acesso via QR Code

- Nova rota: `POST /meetings/qrcode/:accessPin`
- Endpoint específico: `joinMeetingByQRCode`
- Funcionalidade similar ao acesso por PIN, mas com logs específicos para auditoria

## Arquivos Modificados

### 1. `src/models/Meeting.js`
- Adicionado campo `qrCode` ao schema

### 2. `src/controllers/MeetingController.js`
- Importação da biblioteca `qrcode`
- Função `generateMeetingQRCode()` para gerar QR Code
- Modificação do método `createMeeting()` para gerar QR Code automaticamente
- Novo método `joinMeetingByQRCode()` para acesso via QR Code

### 3. `src/routes/routes.js`
- Nova rota `POST /meetings/qrcode/:accessPin`

## Configuração

### Dependências Adicionadas

```bash
npm install qrcode
```

### Variáveis de Ambiente

- `FRONTEND_URL`: URL base do frontend (padrão: `http://localhost:3000`)

## Uso da API

### Criar Reunião (com QR Code automático)

```http
POST /meetings
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Minha Reunião",
  "description": "Descrição da reunião",
  "voteType": "anonymous"
}
```

**Resposta:**
```json
{
  "meeting": {
    "_id": 1,
    "name": "Minha Reunião",
    "organizerCode": "ABC12345",
    "accessPin": "123456",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "organizerCode": "ABC12345",
  "accessPin": "123456",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Acessar Reunião via QR Code

```http
POST /meetings/qrcode/123456
Content-Type: application/json

{
  "participantName": "João Silva"
}
```

**Resposta (Votação Anônima):**
```json
{
  "meeting": {
    "_id": 1,
    "name": "Minha Reunião",
    "voteType": "anonymous"
  },
  "participant": {
    "_id": "...",
    "name": "João Silva"
  },
  "isAuthenticated": false,
  "accessMethod": "qrcode"
}
```

## Fluxo de Autenticação

### Votação Anônima
1. Usuário escaneia QR Code
2. Aplicativo redireciona para `/join/{accessPin}`
3. Frontend faz POST para `/meetings/qrcode/{accessPin}`
4. Usuário é adicionado como participante anônimo
5. Acesso liberado para votação

### Votação Identificada
1. Usuário escaneia QR Code
2. Sistema verifica se usuário está autenticado
3. Se não autenticado, retorna erro com `requiresAuth: true`
4. Frontend redireciona para autenticação Google
5. Após autenticação, usuário é adicionado como participante identificado
6. Acesso liberado para votação

## Configurações do QR Code

```javascript
{
  errorCorrectionLevel: 'M',  // Nível médio de correção de erro
  type: 'image/png',          // Formato PNG
  quality: 0.92,              // Alta qualidade
  margin: 1,                  // Margem mínima
  color: {
    dark: '#000000',          // Cor escura (preto)
    light: '#FFFFFF'          // Cor clara (branco)
  }
}
```

## Logs e Auditoria

- Acesso via QR Code é logado no console
- Formato: `Acesso via QR Code - Reunião: {nome} (ID: {id})`
- Campo `accessMethod: 'qrcode'` na resposta da API

## Testes

### Teste de Geração
- Arquivo: `test_qrcode.js`
- Valida geração de QR Code com diferentes formatos

### Teste de API
- Arquivo: `test_api.js`
- Testa criação de reunião e acesso via QR Code

## Considerações de Segurança

1. **PIN Único**: Cada reunião tem um PIN único de 6 dígitos
2. **QR Code Único**: Cada QR Code é único por reunião
3. **Validação**: Sistema valida se a reunião existe antes de permitir acesso
4. **Autenticação**: Para votações identificadas, mantém-se a necessidade de autenticação Google

## Próximos Passos

1. **Frontend**: Implementar leitor de QR Code no aplicativo
2. **Expiração**: Considerar implementar expiração de QR Codes
3. **Customização**: Permitir customização visual do QR Code
4. **Analytics**: Implementar métricas de uso via QR Code

