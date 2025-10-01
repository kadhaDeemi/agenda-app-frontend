'use server'

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmationEmail({ clientEmail, professionalName, serviceName, appointmentTime, clientName }) {

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
                <p>Tu cita ha sido agendada con éxito.</p>
                <p><strong>Servicio:</strong> ${serviceName}</p>
                <p><strong>Profesional:</strong> ${professionalName}</p>
                <p><strong>Fecha y Hora:</strong> ${formattedDate}</p>
                <p>¡Te esperamos!</p>
            `,
        });
        return { success: true };
    } catch (error) {
        console.error("Error al enviar email:", error);
        return { success: false };
    }
}