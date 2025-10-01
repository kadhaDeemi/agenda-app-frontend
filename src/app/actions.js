'use server'

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmationEmail({ clientEmail, professionalName, serviceName, appointmentTime, clientName, locationAddress, locationPhone }) {

    const formattedDate = new Date(appointmentTime).toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

    try {
        await resend.emails.send({
            from: 'AgendaPro <onboarding@resend.dev>',
            to: [clientEmail],
            subject: '✅ ¡Tu cita ha sido agendada!',
            html: `
                <h1>¡Hola ${clientName}!</h1>
                <p>Tu cita ha sido agendada con éxito. Aquí están los detalles:</p>
                <hr>
                <p><strong>Servicio:</strong> ${serviceName}</p>
                <p><strong>Profesional:</strong> ${professionalName}</p>
                <p><strong>Fecha y Hora:</strong> ${formattedDate}</p>
                
                <h3>Dónde:</h3>
                <p><strong>Dirección:</strong> ${locationAddress || 'No especificada'}</p>
                <hr>
                <p><strong>Importante:</strong> Si necesitas cancelar o modificar tu cita, por favor contacta directamente al local al siguiente número: <strong>${locationPhone || 'No especificado'}</strong>.</p>
                <p>¡Te esperamos!</p>
            `,
        });
        return { success: true };
    } catch (error) {
        console.error("Error al enviar email:", error);
        return { success: false };
    }
}