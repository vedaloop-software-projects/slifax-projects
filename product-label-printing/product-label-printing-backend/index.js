const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const bodyParser = require('body-parser')
const sevaRoutes = require('./routes/seva')
const userRoutes = require('./routes/user')
const mongoose = require('mongoose')
const cloudinary = require('cloudinary').v2



dotenv.config()

const app = express()

app.use(cors())

app.use(express.json({limit: '10mb'}))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(bodyParser.urlencoded({limit: '10mb'}))

app.use(sevaRoutes)
app.use(userRoutes)

app.get('/', (req, res) => {
    try {
       res.send('Server is running') 
    } catch (error) {
        console.log('Error in server', error)
    }
})

app.get('/get-signature', (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp }, cloudinary.config().api_secret);

  res.json({ signature, timestamp, api_key: cloudinary.config().api_key });
});


app.listen(process.env.port, () => {
       mongoose.connect(process.env.mongo_url)
       .then(() => {
        console.log("Database is connected")
       }).catch((err) => {
        console.log("Error in connecting database: ", err)
       })
   
})