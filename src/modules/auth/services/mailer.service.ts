import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly brevoUrl = 'https://api.brevo.com/v3/smtp/email';

  /**
   * Envia o código OTP para verificação de conta
   */
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
            email: 'euclidesbaltazar2002@gmail.com'
          },
          to: [{ email: email }],
          subject: `Código de Ativação Nonhande: ${code}`,
          htmlContent: `
            <div style="font-family: sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 40px; text-align: center; border-radius: 15px; border: 1px solid #333;">
              <h1 style="color: #f6c83d; text-transform: uppercase; letter-spacing: 2px;">Nonhande</h1>
              <p style="font-size: 18px; margin-top: 20px;">Kamba, aqui está o teu código de ativação:</p>
              <div style="background-color: #1a1a1a; padding: 20px; border: 2px dashed #f6c83d; display: inline-block; margin: 30px 0; border-radius: 10px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f6c83d;">${code}</span>
              </div>
              <p style="font-size: 14px; color: #888; margin-top: 20px;">Este código expira em breve. Se não solicitaste, ignora este e-mail.</p>
              <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
              <p style="font-size: 12px; color: #555;">&copy; 2025 Nonhande - Línguas Nacionais de Angola</p>
            </div>
          `,
        }),
      });

      this.handleResponse(response, email);
    } catch (error) {
      console.error('❌ Falha ao conectar à Brevo:', error);
    }
  }

  /**
   * NOVO: Envia o link para recuperação de palavra-passe
   */
  async sendResetPasswordEmail(email: string, resetLink: string) {
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
            name: 'Nonhande Support',
            email: 'euclidesbaltazar2002@gmail.com'
          },
          to: [{ email: email }],
          subject: 'Recuperação de Palavra-passe - Nonhande',
          htmlContent: `
            <div style="font-family: sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 40px; text-align: center; border-radius: 15px; border: 1px solid #333;">
              <h1 style="color: #f6c83d; text-transform: uppercase; letter-spacing: 2px;">Nonhande</h1>
              <h2 style="color: #ffffff; margin-top: 20px;">Recuperar Acesso</h2>
              <p style="font-size: 16px; color: #ccc; line-height: 1.6;">Recebemos um pedido para redefinir a tua palavra-passe. Clica no botão abaixo para prosseguir:</p>
              
              <div style="margin: 40px 0;">
                <a href="${resetLink}" style="background-color: #f6c83d; color: #000; padding: 15px 35px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; transition: background 0.3s;">
                  REDEFINIR MINHA SENHA
                </a>
              </div>

              <p style="font-size: 13px; color: #888;">Este link é válido por apenas 15 minutos.</p>
              <p style="font-size: 12px; color: #555; margin-top: 10px;">Se o botão não funcionar, copia este link: <br> <span style="color: #f6c83d;">${resetLink}</span></p>
              
              <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
              <p style="font-size: 12px; color: #555;">&copy; 2025 Nonhande - Angola</p>
            </div>
          `,
        }),
      });

      this.handleResponse(response, email);
    } catch (error) {
      console.error('❌ Falha ao conectar à Brevo:', error);
    }
  }

  /**
   * Helper para tratar a resposta da API
   */
  private async handleResponse(response: Response, email: string) {
    if (response.ok) {
      console.log(`📧 E-mail enviado com sucesso para: ${email}`);
    } else {
      const errorData = await response.json();
      console.error('❌ Erro na Brevo:', JSON.stringify(errorData));
    }
  }
}