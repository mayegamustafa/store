import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WalletOwnerType {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  RIDER = 'RIDER',
}

export class TopUpDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(500, { message: 'Minimum top-up is 500 UGX' })
  amount: number;

  @ApiProperty({ example: 'MTN_MOMO', enum: ['MTN_MOMO', 'AIRTEL_MONEY'] })
  @IsString()
  method: string;

  @ApiProperty({ example: '256770000000', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal is 1,000 UGX' })
  amount: number;

  @ApiProperty({ example: 'mobile_money', enum: ['mobile_money', 'bank'] })
  @IsString()
  method: string;

  @ApiProperty({ example: '256770000000', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class AdminCreditDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  targetId: string;

  @ApiProperty({ enum: WalletOwnerType })
  @IsEnum(WalletOwnerType)
  ownerType: WalletOwnerType;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'Refund for order #1234' })
  @IsString()
  description: string;
}

export class AdminDebitDto extends AdminCreditDto {}
