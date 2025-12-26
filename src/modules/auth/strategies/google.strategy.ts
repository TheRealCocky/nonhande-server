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
    const googleOptions: StrategyOptions = {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://nonhande-server.onrender.com/auth/google/callback'
        : 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    };

    super(googleOptions);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      const { name, emails, photos, id } = profile;

      const user = {
        email: emails[0].value,
        name: `${name.givenName} ${name.familyName}`,
        avatarUrl: photos[0]?.value || '',
        googleId: id,
        provider: 'google',
      };

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
}