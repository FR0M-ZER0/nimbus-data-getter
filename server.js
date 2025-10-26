import app from './src/app.js'
const PORT = 3003

app.listen(PORT, () => {
    console.log(`Server started on address ${process.env.SERVER_ADDRESS}`)
})
