import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // FORÇA MANUALMENTE APENAS PARA TESTE
      callbackURL: 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });

    // Este log vai aparecer no teu terminal assim que o Nest iniciar
    console.log("🛠️ Callback configurada no código:", 'http://localhost:3001/auth/google/callback');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      // O profile do Google às vezes vem com estruturas ligeiramente diferentes
      const { name, emails, photos, id } = profile;

      if (!emails || emails.length === 0) {
        return done(new Error('No email found from google profile'), false);
      }

      const user = {
        email: emails[0].value,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        name: name?.displayName || `${name?.givenName} ${name?.familyName}`,
        avatarUrl: photos && photos.length > 0 ? photos[0].value : '',
        googleId: id,
        provider: 'google',
      };

      // O que retornares aqui será enviado para o req.user no Controller
      return done(null, user);
    } catch (error) {
      console.error('❌ Erro na validação do Google:', error);
      return done(error, false);
    }
  }
}