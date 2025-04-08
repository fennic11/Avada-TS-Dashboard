// index.js
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const api = require('./routes/api');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Kết nối MongoDB
connectDB();

// Example route

app.use('/api', api);


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
