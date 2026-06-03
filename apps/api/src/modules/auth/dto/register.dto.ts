import { IsEmail, IsOptional, IsString, MinLength, IsMobilePhone, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsString() @MinLength(8) @IsOptional() password?: string;
  @ApiPropertyOptional({ enum: [Role.BUYER, Role.SELLER, Role.RIDER] })
  @IsEnum(Role) @IsOptional() role?: Role;
  @ApiPropertyOptional() @IsString() @IsOptional() referralCode?: string;
}
