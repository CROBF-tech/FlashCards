#!/usr/bin/env node

// Test script para verificar la configuración antes del deploy
import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config();

console.log('🔍 Verificando configuración...\n');

// Verificar variables de entorno
const requiredEnvVars = [
    'JWT_SECRET',
    'TURSO_DATABASE_URL', 
    'TURSO_AUTH_TOKEN'
];

let missingVars = [];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
        console.log(`❌ ${varName}: NO CONFIGURADA`);
    } else {
        console.log(`✅ ${varName}: Configurada`);
    }
});

if (missingVars.length > 0) {
    console.log(`\n🚨 Variables faltantes: ${missingVars.join(', ')}`);
    console.log('Configura estas variables en Vercel antes del deploy.\n');
}

// Probar conexión a la base de datos
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    try {
        console.log('\n🔌 Probando conexión a la base de datos...');
        const client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        
        const result = await client.execute('SELECT 1 as test');
        console.log('✅ Conexión a base de datos exitosa');
        console.log(`📊 Resultado de prueba: ${result.rows[0]?.test}`);
    } catch (error) {
        console.log('❌ Error de conexión a base de datos:');
        console.log(error.message);
    }
} else {
    console.log('⚠️  No se puede probar la conexión a DB sin las variables configuradas');
}

console.log('\n📋 Resumen:');
console.log('- Asegúrate de que todas las variables estén configuradas en Vercel');
console.log('- Usa la ruta /health para verificar el estado en producción');
console.log('- Los logs de Vercel te mostrarán errores específicos');
