import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly resendUrl = 'https://api.resend.com/emails';
  private readonly apiKey = process.env.RESEND_API_KEY;

  async sendVerificationEmail(email: string, code: string) {
    try {
      const response = await fetch(this.resendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Nonhande <onboarding@resend.dev>', // Por agora usa este remetente padrão
          to: email,
          subject: `Código de Ativação: ${code}`,
          html: `
            <div style="font-family: sans-serif; text-align: center; background: #0d0d0d; color: #fff; padding: 20px;">
              <h1 style="color: #f6c83d;">Nonhande</h1>
              <p>O teu código de verificação é:</p>
              <h2 style="letter-spacing: 5px; background: #222; padding: 10px;">${code}</h2>
            </div>
          `,
        }),
      });

      if (response.ok) {
        console.log('📧 E-mail enviado via Resend!');
      } else {
        const errorData = await response.json();
        console.error('❌ Erro no Resend:', errorData);
      }
    } catch (error) {
      console.error('❌ Falha ao conectar com Resend:', error);
    }
  }
}