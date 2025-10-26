import mqtt from 'mqtt';
import express, { application } from 'express'
import { PrismaClient } from '@prisma/client';

const app = express()

const prisma = new PrismaClient();
const brokerUrl = 'mqtt://test.mosquitto.org:1883';
const topic = 'fatec/api/4dsm/sintax/';

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

client.on('message', async (receivedTopic, payload) => {
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

    console.log(`-> Dados [${newSensorData.uid}] salvos. Campos dinâmicos: ${Object.keys(data).join(', ')}`);

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