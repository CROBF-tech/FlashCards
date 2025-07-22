/**
 * Utilitario para gestión de archivos en entornos serverless
 * Nota: En Vercel no hay sistema de archivos persistente
 */

/**
 * En entornos serverless como Vercel, no necesitamos limpieza de archivos
 * ya que todo se procesa en memoria
 */
export async function cleanupOldPdfFiles(maxAgeMs = 60 * 60 * 1000) {
    console.log('ℹ️ Cleanup no necesario en entorno serverless');
    return 0;
}

/**
 * En entornos serverless no hay estadísticas de uploads persistentes
 */
export async function getUploadsStats() {
    return {
        fileCount: 0,
        totalSizeMB: '0.00',
        totalSizeBytes: 0,
        message: 'Sistema de archivos en memoria - estadísticas no aplicables',
    };
}

/**
 * En entornos serverless no hay verificación de espacio en disco
 */
export async function checkDiskSpace() {
    return {
        needsCleanup: false,
        message: 'Sistema serverless - espacio gestionado automáticamente',
    };
}
