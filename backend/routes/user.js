import express from 'express';
import auth from '../middleware/auth.js';
import db from '../database.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
import User from '../models/User.js';
import bcrypt from 'bcrypt';

// Ruta para obtener las estadísticas del usuario
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await db.getStudyStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            message: 'Error al obtener estadísticas. Por favor, intente nuevamente.',
        });
    }
});

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

// Forgot password route
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Generate reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save reset code to user
        const resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await db.updateUserResetToken(email, resetCode, resetPasswordExpires);

        // Send email
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Código para restablecer tu contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
                    <h2 style="color: #333;">Restablecer contraseña</h2>
                    <p>Hola,</p>
                    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Utiliza el siguiente código para continuar con el proceso:</p>
                    <div style="background-color: #007bff; color: white; font-size: 24px; font-weight: bold; padding: 15px 0; text-align: center; border-radius: 5px; margin: 20px 0;">
                        ${resetCode}
                    </div>
                    <p>Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.</p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888;">Este código es válido por 1 hora.</p>
                    <p style="font-size: 12px; color: #888;">Equipo de Soporte - FlashCards CROBF</p>
                </div>
            `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Error al enviar el correo electrónico' });
            }
            console.log('Email sent: ' + info.response);
            res.status(200).json({ message: 'Código de restablecimiento enviado al correo electrónico' });
        });
    } catch (error) {
        console.error('Error in forgot password route:', error);
        res.status(500).json({ message: 'Error interno del servidor, por favor intente nuevamente' });
    }
});

// Verify reset code route
router.post('/verify-reset-code', async (req, res) => {
    try {
        const { email, resetCode } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verify reset code
        if (
            user.resetPasswordToken?.toLowerCase().trim() !== resetCode?.toLowerCase().trim() ||
            new Date(user.resetPasswordExpires) < Date.now()
        ) {
            return res.status(400).json({ message: 'Código Invalido o expirado' });
        }

        res.status(200).json({ message: 'Código verificado correctamente' });
    } catch (error) {
        console.error('Error in verify reset code route:', error);
        res.status(500).json({ message: 'Error interno del servidor, por favor intente nuevamente' });
    }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
    try {
        const { email, resetCode, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verify reset code
        if (
            user.resetPasswordToken?.toLowerCase().trim() !== resetCode?.toLowerCase().trim() ||
            new Date(user.resetPasswordExpires) < Date.now()
        ) {
            return res.status(400).json({ message: 'Código invalido o expirado' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user password
        await db.updateUserPassword(email, hashedPassword);

        // Clear reset token
        await db.updateUserResetToken(email, null, null);

        res.status(200).json({ message: 'Contraseña restablecida exitosamente' });
    } catch (error) {
        console.error('Error in reset password route:', error);
        res.status(500).json({ message: 'Error interno del servidor, por favor intente nuevamente' });
    }
});
export default router;
