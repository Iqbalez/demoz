console.log("Testing imports...");

try {
  console.log("1. Importing pg...");
  const pg = require('pg');
  console.log("   pg imported.");
} catch(e) { console.error("pg import failed:", e); }

try {
  console.log("2. Importing prisma client...");
  const { PrismaClient } = require('@prisma/client');
  console.log("   PrismaClient imported.");
} catch(e) { console.error("PrismaClient import failed:", e); }

try {
  console.log("3. Importing prisma-field-encryption...");
  const { fieldEncryptionExtension } = require('prisma-field-encryption');
  console.log("   fieldEncryptionExtension imported.");
} catch(e) { console.error("prisma-field-encryption import failed:", e); }

try {
  console.log("4. Importing bcrypt...");
  const bcrypt = require('bcrypt');
  console.log("   bcrypt imported.");
} catch(e) { console.error("bcrypt import failed:", e); }

try {
  console.log("5. Importing @sentry/node...");
  const Sentry = require('@sentry/node');
  console.log("   Sentry imported.");
} catch(e) { console.error("Sentry import failed:", e); }

try {
  console.log("6. Importing bullmq...");
  const bullmq = require('bullmq');
  console.log("   bullmq imported.");
} catch(e) { console.error("bullmq import failed:", e); }

console.log("All imports tested successfully.");
