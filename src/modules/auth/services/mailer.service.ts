import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter;

  constructor() {
    /**
     * Configuramos o transporter com suporte a variáveis de ambiente
     * e mecanismos de proteção contra timeouts no Render.
     */
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 465,
      secure: process.env.MAIL_SECURE === 'true', // true para porta 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS, // Tua "Senha de App" de 16 dígitos
      },
      // Configurações de conexão robusta
      connectionTimeout: 10000, // 10 segundos para conectar
      greetingTimeout: 10000,   // 10 segundos para o servidor responder "Olá"
      socketTimeout: 10000,     // 10 segundos de atividade no socket
      pool: true,               // Usa pool de conexões (mais eficiente)
      maxConnections: 3,        // Limita conexões simultâneas
      maxMessages: 10,          // Limita mensagens por conexão
    });

    // Verificação de conexão ao iniciar (Log para debug no Render)
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Erro na configuração do SMTP:', error);
      } else {
        console.log('✅ Servidor de e-mail pronto para enviar mensagens');
      }
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    const mailOptions = {
      from: process.env.MAIL_FROM || `"Nonhande" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Código de Ativação: ${code} - Nonhande`,
      html: `
        <div style="background-color: #0d0d0d; padding: 40px; text-align: center; border-radius: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; padding: 30px; border: 1px solid #f6c83d; border-radius: 24px;">
            <h1 style="color: #ffffff; font-family: Arial, sans-serif; text-transform: uppercase;">Bem-vindo ao Nonhande</h1>
            <p style="color: #cccccc; font-size: 16px; font-family: Arial, sans-serif;">
              Obrigado por te juntares à nossa missão de preservar as línguas nacionais.
            </p>
            <div style="margin: 30px 0; padding: 20px; background-color: #262626; border-radius: 16px;">
              <span style="color: #f6c83d; font-size: 32px; font-weight: bold; letter-spacing: 10px; font-family: monospace;">
                ${code}
              </span>
            </div>
            <p style="color: #888888; font-size: 12px; font-family: Arial, sans-serif;">
              Este código expira em breve. Se não solicitaste este registo, podes ignorar este e-mail.
            </p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 E-mail enviado com sucesso:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Erro crítico ao enviar e-mail:', error);
      // Não lançamos erro aqui para não travar o processo de signup,
      // mas o log no Render dirá exatamente o porquê da falha.
    }
  }
}