import mqtt from 'mqtt';
import express, { application } from 'express'
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';

const app = express()

const prisma = new PrismaClient();
const brokerUrl = 'mqtt://broker.hivemq.com:1883';
const topic = 'fatec/api/4dsm/sintax/';

const WS_URL = process.env.WS_URL
const ws = new WebSocket(WS_URL)
const  API_URL = process.env.API_URL

function sendWsMessage(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.warn('WebSocket não está pronto, ignorando envio...');
  }
}

const lastSeen = new Map()
const CHECK_INTERVAL = 15000
const TIMEOUT_OFFLINE = 30000

console.log('Iniciando subscriber...');

console.log(`Conectando ao broker MQTT em ${brokerUrl}...`);
const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
  console.log('Conectado ao MQTT com sucesso!');
  
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Inscrito no tópico: ${topic}`);
    } else {
      console.error('Erro ao se inscrever:', err);
    }
  });
});

async function checkStatus() {
  const now = Date.now();
  for (const [uid, lastTime] of lastSeen.entries()) {
    const status = now - lastTime > TIMEOUT_OFFLINE ? 'OFFLINE' : 'ONLINE';
    const statusMessage = {
      type: 'STATUS_UPDATE',
      estacaoStatus: {
        id_estacao: uid,
        status,
        created_at: new Date().toISOString(),
      },
    };
    sendWsMessage(statusMessage);

    const body = {
      id_estacao: uid,
      status: status,
    };

    try {
      const response = await fetch(`${API_URL}/station-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        console.log(`Enviado status para API com sucesso.`);
      } else {
        const errorText = await response.text();
        console.error(`Falha ao enviar status: ${response.status} - ${errorText}`);
      }
    } catch (httpErr) {
      console.error('Erro ao enviar status para API:', httpErr.message);
    }
  }
}

setInterval(checkStatus, CHECK_INTERVAL)

client.on('message', async (receivedTopic, payload) => {
  const bytesReceived = payload.length;
  const kilobytes = bytesReceived / 1024;

  const messageString = payload.toString();
  console.log(`Mensagem recebida: ${receivedTopic} - ${messageString}`);
  
  try {
    const data = JSON.parse(messageString);

    const uid = data.uid;
    const uxt = data.uxt;

    if (!uid || uxt == null) {
      console.warn('-> Mensagem com formato inválido (sem UID ou UXT). Descartando:', messageString);
      return;
    }

    delete data.uid;
    delete data.uxt;
    
    const newSensorData = await prisma.sensorData.create({
      data: {
        uid: uid,
        uxt: uxt,
        readings: data,
      },
    });

    const timestamp = new Date().toISOString();

    const logMessage = {
      type: 'LOG_UPDATE',
      estacaoLog: {
        id_estacao: uid,
        data_sent: parseFloat(kilobytes.toFixed(2)),
        created_at: timestamp
      }
    };

    sendWsMessage(logMessage);

    console.log(`-> Dados [${newSensorData.uid}] salvos. Campos dinâmicos: ${Object.keys(data).join(', ')}`);

    const body = {
      id_estacao: uid,
      data_sent: Math.max(1, Math.ceil(kilobytes)),
    };

    try {
      const response = await fetch(`${API_URL}/station-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        console.log(`📤 Enviado log para API (${body.data_sent} bytes) com sucesso.`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Falha ao enviar log: ${response.status} - ${errorText}`);
      }
    } catch (httpErr) {
      console.error('🌐 Erro ao enviar log para API:', httpErr.message);
    }

  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error('Erro: Payload recebido não é um JSON válido:', messageString);
    } else {
      console.error('Erro ao processar ou salvar mensagem no banco:', e);
    }
  }
});

client.on('error', (err) => {
  console.error('Erro de conexão MQTT:', err);
  client.end();
});

client.on('close', () => {
  console.log('Conexão MQTT fechada.');
});

client.on('offline', () => {
  console.log('Cliente MQTT está offline.');
});

console.log('Subscriber em execução (aguardando conexão e mensagens)...');

async function gracefulShutdown() {
  console.log('\nRecebido sinal de interrupção. Desconectando...');
  
  await prisma.$disconnect();
  console.log('Desconectado do MongoDB.');
  
  client.end(true, () => {
    console.log('Desconectado do MQTT.');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default app