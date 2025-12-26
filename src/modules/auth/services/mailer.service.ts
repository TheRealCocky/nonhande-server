import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false, // Forçamos false para a 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      // CONFIGURAÇÕES DE EMERGÊNCIA
      name: 'smtp.gmail.com', // Força o nome do servidor no HELO
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 30000, // 30 segundos
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    this.transporter.verify((error) => {
      if (error) {
        console.error('❌ Erro SMTP:', error);
      } else {
        console.log('✅ SMTP Pronto');
      }
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    const mailOptions = {
      from: process.env.MAIL_FROM || `"Nonhande" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Código: ${code}`,
      html: `<h1>Código de Ativação: ${code}</h1>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('📧 E-mail enviado');
    } catch (error) {
      console.error('❌ Falha no envio:', error);
    }
  }
}