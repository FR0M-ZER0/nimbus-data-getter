import 'dotenv/config'
import express, { application } from 'express'
import cors from 'cors'
import mqtt from 'mqtt'

const app = express()

app.use(express.json())
app.use(cors({
    origin: process.env.CLIENT_ADDRESS,
    credentials: true
}))

const mqttClient = mqtt.connect(process.env.BROKER_ADDRESS)

mqttClient.on('connect', () => {
    console.log('Connected to the broker')

    // TODO: mudar para o endereço correto do tópico
    mqttClient.subscribe('uri/topic', (err) => {
        if (!err) {
            console.log('Subscribed to the topic')
        } else {
            console.error(err)
        }
    })
})

mqttClient.on('data', (_, data) => {
    // TODO: salvar os dados no mongo
    console.log(`Received data: ${data.toString()}`)
})

// Rota para retornar os dados salvos
app.get('/api/weather-data', (req, res) => {
    // TODO: retornar os dados do mongo
})

export default app