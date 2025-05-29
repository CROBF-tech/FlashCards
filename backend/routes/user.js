import express from 'express';
import auth from '../middleware/auth.js';
import db from '../database.js';

const router = express.Router();

router.delete('/delete', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Usar la nueva función de deleteUser que maneja la transacción
        const deleted = await db.deleteUser(userId);

        if (!deleted) {
            return res.status(404).json({
                message: 'No se encontró la cuenta o ya fue eliminada',
            });
        }

        res.status(200).json({
            message: 'Cuenta eliminada exitosamente',
        });
    } catch (error) {
        console.error('Error al eliminar la cuenta:', error);
        res.status(500).json({
            message: 'Error al eliminar la cuenta. Por favor, intente nuevamente.',
        });
    }
});

export default router;
