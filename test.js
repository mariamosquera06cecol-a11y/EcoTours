require('dotenv').config();
const { MongoClient } = require('mongodb');

async function test() {
  try {
    console.log(process.env.MONGODB_URI);

    const client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    console.log("✅ Conectado correctamente");

    await client.close();
  } catch (err) {
    console.error(err);
  }
}

test();