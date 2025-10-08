// station-emulator.js

import mqtt from 'mqtt';

// --- CONFIGURAÇÕES ---
const BROKER_ADDRESS = "mqtt://test.mosquitto.org"
//: Use o mesmo tópico que seu servidor está ouvindo!
const TOPIC = 'weather/station/data';
// ID desta estação simulada
const DEVICE_ID = 'station-sim-01';
// Intervalo de envio em milissegundos (ex: 5000ms = 5 segundos)
const SEND_INTERVAL = 5000;

// Conecta ao broker MQTT
const client = mqtt.connect(BROKER_ADDRESS);

// Função para gerar dados meteorológicos aleatórios
function generateWeatherData() {
    return {
        deviceId: DEVICE_ID,
        // Temperatura entre 15.00 e 35.00
        temperature: parseFloat((15 + Math.random() * 20).toFixed(2)), 
        // Umidade entre 40.00 e 90.00
        humidity: parseFloat((40 + Math.random() * 50).toFixed(2)),
        // Pressão entre 980.00 e 1030.00
        pressure: parseFloat((980 + Math.random() * 50).toFixed(2)),
    };
}

// Executa quando a conexão com o broker é bem-sucedida
client.on('connect', () => {
    console.log(`Emulador conectado ao broker MQTT em ${BROKER_ADDRESS}`);

    // Inicia o envio de dados em intervalos regulares
    setInterval(() => {
        const data = generateWeatherData();
        const dataString = JSON.stringify(data);

        client.publish(TOPIC, dataString, (err) => {
            if (err) {
                console.error('Falha ao publicar mensagem:', err);
            } else {
                console.log(`Dados enviados para o tópico [${TOPIC}]:`, dataString);
            }
        });
    }, SEND_INTERVAL);
});

client.on('error', (err) => {
    console.error('Erro de conexão com o broker:', err);
});