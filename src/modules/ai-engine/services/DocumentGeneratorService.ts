// src/modules/ai-engine/services/DocumentGeneratorService.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
// import { CloudinaryService } from '../../shared/cloudinary.service'; // Se tiveres

@Injectable()
export class DocumentGeneratorService { // <--- Garante que tem o 'export'
  async createHistoryPdf(content: string, title: string): Promise<string> {
    // Lógica de geração aqui...
    return "https://url-do-pdf-gerado.com";
  }
}