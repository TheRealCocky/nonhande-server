import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly brevoUrl = 'https://api.brevo.com/v3/smtp/email';

  async sendVerificationEmail(email: string, code: string) {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      console.error('❌ ERRO: BREVO_API_KEY não configurada!');
      return;
    }

    try {
      const response = await fetch(this.brevoUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Nonhande',
            email: 'euclidesbaltazar2002@gmail.com' // O teu e-mail dono da conta Brevo
          },
          to: [{ email: email }],
          subject: `Código de Ativação Nonhande: ${code}`,
          htmlContent: `
            <div style="font-family: sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 30px; text-align: center; border-radius: 10px;">
              <h1 style="color: #f6c83d;">Nonhande</h1>
              <p style="font-size: 18px;">Kamba, aqui está o teu código de acesso:</p>
              <div style="background-color: #1a1a1a; padding: 15px; border: 2px dashed #f6c83d; display: inline-block; margin: 20px 0;">
                <span style="font-size: 30px; font-weight: bold; letter-spacing: 5px; color: #f6c83d;">${code}</span>
              </div>
              <p style="font-size: 14px; color: #888;">Se não solicitaste este código, podes ignorar este e-mail.</p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        console.log(`📧 E-mail enviado com sucesso para: ${email}`);
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na Brevo:', JSON.stringify(errorData));
      }
    } catch (error) {
      console.error('❌ Falha ao conectar à Brevo:', error);
    }
  }
}