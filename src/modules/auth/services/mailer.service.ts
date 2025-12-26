import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly brevoUrl = 'https://api.brevo.com/v3/smtp/email';

  async sendVerificationEmail(email: string, code: string) {
    // Pegamos a chave diretamente aqui para garantir que lê o valor atualizado
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      console.error('❌ ERRO: A BREVO_API_KEY não foi encontrada no ambiente!');
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
            email: 'yoofidigital@gmail.com'
          },
          to: [{ email: email }],
          subject: `Código: ${code}`,
          htmlContent: `<h1>Teu código Nonhande: ${code}</h1>`,
        }),
      });

      if (response.ok) {
        console.log('📧 E-mail enviado via Brevo!');
      } else {
        const errorData = await response.json();
        console.error('❌ Detalhes do erro na Brevo:', JSON.stringify(errorData));
      }
    } catch (error) {
      console.error('❌ Falha na conexão com a API da Brevo:', error);
    }
  }
}