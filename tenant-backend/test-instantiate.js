const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { fieldEncryptionExtension } = require('prisma-field-encryption');
require('dotenv').config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("PRISMA_FIELD_ENCRYPTION_KEY:", process.env.PRISMA_FIELD_ENCRYPTION_KEY);

async function test() {
  try {
    console.log("1. Creating pg Pool...");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log("2. Creating PrismaPg adapter...");
    const adapter = new PrismaPg(pool);
    
    console.log("3. Creating raw PrismaClient...");
    const client = new PrismaClient({ adapter });
    
    console.log("4. Extending client with field encryption...");
    const extended = client.$extends(fieldEncryptionExtension());
    
    console.log("5. Testing raw client connection...");
    await client.$connect();
    console.log("   Connected successfully!");
    
    await client.$disconnect();
    console.log("   Disconnected successfully!");
    
  } catch (e) {
    console.error("Instantiation/Connection test failed message:", e.message);
    console.error("Instantiation/Connection test failed stack:", e.stack);
  }
}

test();
