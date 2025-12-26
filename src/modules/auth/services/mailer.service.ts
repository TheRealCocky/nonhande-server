import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587, // Mudamos para 587
      secure: process.env.MAIL_SECURE === 'true', // No Render será false para a 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Ajuda a evitar bloqueios de certificado em cloud
      },
      connectionTimeout: 20000, // Aumentamos para 20s
      greetingTimeout: 20000,
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
      html: `<h1>Código: ${code}</h1>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('📧 E-mail enviado');
    } catch (error) {
      console.error('❌ Falha no envio:', error);
    }
  }
}