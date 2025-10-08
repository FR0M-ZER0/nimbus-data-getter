import 'dotenv/config'
import express, { application } from 'express'
import cors from 'cors'
import mqtt from 'mqtt'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(express.json())
// app.use(cors({
//     origin: process.env.CLIENT_ADDRESS,
//     credentials: true
// }))
app.use(cors())//Dados Mocados

const mqttClient = mqtt.connect(process.env.BROKER_ADDRESS)

mqttClient.on('connect', () => {
    console.log('Connected to the broker')

    // TODO: mudar para o endereço correto do tópico
    const topic = 'weather/station/data'
    mqttClient.subscribe('uri/topic', (err) => {
        if (!err) {
            console.log('Subscribed to the topic')
        } else {
            console.error(err)
        }
    })
})

mqttClient.on('message', async (topic, payload) => {
    try {
        const message = payload.toString()
        console.log(`Mensagem recebida de [${topic}]: ${message}`)

        // Converte a mensagem (JSON) para um objeto JavaScript
        const weatherJson = JSON.parse(message)

        // Salva os dados no MongoDB usando o Prisma
        const savedData = await prisma.weatherData.create({
            data: {
                deviceId: weatherJson.deviceId,
                temperature: weatherJson.temperature,
                humidity: weatherJson.humidity,
                pressure: weatherJson.pressure,
            },
        })

        console.log('Dados salvos no banco de dados:', savedData)
    } catch (error) {
        console.error('Falha ao processar ou salvar os dados:', error)
    }
})

// Rota para retornar os dados salvos
app.get('/api/weather-data', async (req, res) => {
    try {
        // Busca os últimos 50 registros, ordenados do mais novo para o mais antigo
        const allData = await prisma.weatherData.findMany({
            take: 50,
            orderBy: {
                timestamp: 'desc',
            },
        })
        res.status(200).json(allData)
    } catch (error) {
        console.error('Erro ao buscar dados:', error)
        res.status(500).json({ error: 'Não foi possível buscar os dados.' })
    }
})

export default app