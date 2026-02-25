// src/modules/ai-engine/services/llamaindex.service.ts
import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import * as process from 'node:process';

@Injectable()
export class LlamaIndexService implements OnModuleInit {
  private client: MongoClient;

  async onModuleInit() {
    const uri = process.env.DATABASE_URL;

    if (!uri) {
      throw new InternalServerErrorException('MONGODB_URI não definida no .env');
    }

    // O TypeScript agora sabe que 'uri' é obrigatoriamente uma string
    this.client = new MongoClient(uri);
    await this.client.connect();
  }

  async searchCulturalContext(queryVector: number[]): Promise<string> {
    const dbName = process.env.DB_NAME;
    const collName = process.env.DB_COLLECTIONAI;

    if (!dbName || !collName) {
      throw new InternalServerErrorException('Configurações de DB ausentes no .env');
    }

    const db = this.client.db(dbName);
    const collection = db.collection(collName);

    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 100,
          limit: 3,
        },
      },
      {
        $project: {
          _id: 0,
          text: "$full_content",
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results.map(res => res.text).join('\n\n');
  }
}