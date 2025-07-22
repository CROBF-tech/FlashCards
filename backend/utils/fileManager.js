import fs from 'fs/promises';
import path from 'path';

/**
 * Utilitario para gestión de archivos temporales en /uploads
 */

/**
 * Limpia archivos PDF temporales más antiguos que el tiempo especificado
 * @param {number} maxAgeMs - Tiempo máximo en milisegundos (por defecto 1 hora)
 */
export async function cleanupOldPdfFiles(maxAgeMs = 60 * 60 * 1000) {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const files = await fs.readdir(uploadsDir);
        const now = Date.now();
        let cleanedCount = 0;

        for (const file of files) {
            if (file.startsWith('pdf-') && file.endsWith('.pdf')) {
                const filePath = path.join(uploadsDir, file);
                try {
                    const stats = await fs.stat(filePath);
                    if (now - stats.mtime.getTime() > maxAgeMs) {
                        await fs.unlink(filePath);
                        cleanedCount++;
                        console.log(`🗑️ Archivo temporal eliminado: ${file}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error al verificar archivo ${file}:`, error.message);
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`✅ Limpieza completada: ${cleanedCount} archivos eliminados`);
        }

        return cleanedCount;
    } catch (error) {
        console.warn('⚠️ Error en limpieza automática:', error.message);
        return 0;
    }
}

/**
 * Obtiene estadísticas de uso de la carpeta uploads
 */
export async function getUploadsStats() {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const files = await fs.readdir(uploadsDir);

        let totalSize = 0;
        let pdfCount = 0;

        for (const file of files) {
            if (file.startsWith('pdf-') && file.endsWith('.pdf')) {
                const filePath = path.join(uploadsDir, file);
                try {
                    const stats = await fs.stat(filePath);
                    totalSize += stats.size;
                    pdfCount++;
                } catch (error) {
                    console.warn(`⚠️ Error al obtener stats de ${file}:`, error.message);
                }
            }
        }

        return {
            fileCount: pdfCount,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            totalSizeBytes: totalSize,
        };
    } catch (error) {
        console.warn('⚠️ Error al obtener estadísticas:', error.message);
        return {
            fileCount: 0,
            totalSizeMB: '0.00',
            totalSizeBytes: 0,
        };
    }
}

/**
 * Verifica si hay suficiente espacio en disco (estimación básica)
 */
export async function checkDiskSpace() {
    try {
        const stats = await getUploadsStats();
        // Advertir si hay más de 100 archivos o más de 500MB
        const warningFileCount = 100;
        const warningSize = 500; // MB

        if (stats.fileCount > warningFileCount) {
            console.warn(
                `⚠️ Advertencia: ${stats.fileCount} archivos temporales encontrados (límite recomendado: ${warningFileCount})`
            );
        }

        if (parseFloat(stats.totalSizeMB) > warningSize) {
            console.warn(
                `⚠️ Advertencia: ${stats.totalSizeMB}MB en archivos temporales (límite recomendado: ${warningSize}MB)`
            );
        }

        return {
            ...stats,
            needsCleanup: stats.fileCount > warningFileCount || parseFloat(stats.totalSizeMB) > warningSize,
        };
    } catch (error) {
        console.warn('⚠️ Error al verificar espacio en disco:', error.message);
        return { needsCleanup: false };
    }
}
