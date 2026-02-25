import { Injectable, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DocumentGeneratorService implements OnModuleInit {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  onModuleInit() {
    // 📁 Cria a pasta uploads automaticamente se não existir
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir);
    }

    // Configuração
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async createHistoryPdf(content: string, title: string): Promise<string> {
    const fileName = `legado_nonhande_${Date.now()}.pdf`;
    const filePath = join(this.uploadDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      // Estética Nonhande (Dourado e Cinza Escuro)
      doc.fillColor('#D4AF37').fontSize(22).text(title.toUpperCase(), { align: 'center' });
      doc.moveDown();
      doc.strokeColor('#D4AF37').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(2);

      doc.fillColor('#333333').fontSize(12).text(content, {
        align: 'justify',
        lineGap: 5,
      });

      doc.end();

      stream.on('finish', async () => {
        try {
          const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',
            folder: 'nonhande_documents', // Organiza em pastas no Cloudinary
          });

          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }

          resolve(uploadResult.secure_url);
        } catch (error) {
          console.error('Erro no upload Cloudinary:', error);
          reject(error);
        }
      });

      stream.on('error', (err) => {
        console.error('Erro ao gerar ficheiro PDF:', err);
        reject(err);
      });
    });
  }
}