import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 465,
      secure: true, // Use true para a porta 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Código de Verificação - Nonhande',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Bem-vindo ao Nonhande!</h2>
          <p>Obrigado por te registares na nossa plataforma de ensino de línguas nacionais.</p>
          <p>Usa o código abaixo para ativar a tua conta:</p>
          <h1 style="color: #f6c83d; letter-spacing: 5px;">${code}</h1>
          <p>Se não solicitaste este código, ignora este e-mail.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      // Aqui podes decidir se lanças um erro ou apenas fazes log
    }
  }
}