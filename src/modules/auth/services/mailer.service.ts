import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly brevoUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly apiKey = process.env.BREVO_API_KEY;

  async sendVerificationEmail(email: string, code: string) {
    try {
      const response = await fetch(this.brevoUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Nonhande',
            email: 'yoofidigital@gmail.com' // Usa o teu e-mail da conta Brevo aqui
          },
          to: [{ email: email }],
          subject: `Código de Ativação: ${code}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; text-align: center; background-color: #0d0d0d; color: #ffffff; padding: 40px;">
              <h1 style="color: #f6c83d;">Nonhande</h1>
              <p style="font-size: 16px;">Usa o código abaixo para validar a tua conta:</p>
              <div style="background-color: #1a1a1a; padding: 20px; border-radius: 10px; display: inline-block; margin-top: 20px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f6c83d;">${code}</span>
              </div>
            </div>
          `,
        }),
      });

      if (response.ok) {
        console.log('📧 E-mail enviado via Brevo!');
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na Brevo:', errorData);
      }
    } catch (error) {
      console.error('❌ Erro ao conectar com a API da Brevo:', error);
    }
  }
}