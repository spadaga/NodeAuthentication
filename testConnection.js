const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'your_connection_string_here';

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('Successfully connected to MongoDB');
  mongoose.connection.close(); // Close the connection after successful connection
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});