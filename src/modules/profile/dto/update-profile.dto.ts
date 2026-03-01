import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  bio?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}