import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhoneOtpDto {
  @ApiProperty({ example: '+256701234567' })
  @IsString() phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+256701234567' })
  @IsString() phone: string;
  @ApiProperty({ example: '123456' })
  @IsString() @Length(6, 6) code: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString() refreshToken: string;
}
