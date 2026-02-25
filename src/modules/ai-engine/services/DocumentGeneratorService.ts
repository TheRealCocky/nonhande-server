import { Injectable, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DocumentGeneratorService implements OnModuleInit {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  onModuleInit() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir);
    }

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
      // @ts-ignore - PDFDocument pode causar erro de tipagem em alguns ambientes
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      doc.fillColor('#D4AF37').fontSize(22).text(title.toUpperCase(), { align: 'center' });
      doc.moveDown();
      doc.strokeColor('#D4AF37').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(2);

      doc.fillColor('#333333').fontSize(12).text(content, {
        align: 'justify',
        lineGap: 5,
      });

      doc.end();

      // Solução para o erro 'no-misused-promises':
      // Envolvemos a lógica async numa função IIFE ou tratamos sem async no callback
      stream.on('finish', () => {
        (async () => {
          try {
            const uploadResult = await cloudinary.uploader.upload(filePath, {
              resource_type: 'raw',
              folder: 'nonhande_documents',
            });

            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }

            resolve(uploadResult.secure_url);
          } catch (error) {
            console.error('Erro no upload Cloudinary:', error);
            // Solução para o erro 'prefer-promise-reject-errors'
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        })().catch(err => reject(err instanceof Error ? err : new Error(String(err))));
      });

      stream.on('error', (err) => {
        console.error('Erro ao gerar ficheiro PDF:', err);
        reject(err);
      });
    });
  }
}