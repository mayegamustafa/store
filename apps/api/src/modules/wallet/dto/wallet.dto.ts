import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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
  @IsIn(['mobile_money', 'bank'])
  method: 'mobile_money' | 'bank';

  @ApiProperty({ example: '256770000000', description: 'Mobile money number or bank account number' })
  @IsString()
  destination: string;

  @ApiProperty({ example: 'John Doe', required: false, description: 'Account holder name' })
  @IsString()
  @IsOptional()
  destinationName?: string;

  @ApiProperty({ example: 'Stanbic Bank', required: false, description: 'Required when method = bank' })
  @IsString()
  @IsOptional()
  bankName?: string;

  /** @deprecated older clients send phone instead of destination */
  @ApiProperty({ example: '256770000000', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class RejectPayoutDto {
  @ApiProperty({ example: 'Account number could not be verified' })
  @IsString()
  reason: string;
}

export class ApprovePayoutDto {
  @ApiProperty({ example: 'MM240703.1234.C56789', required: false, description: 'Disbursement transaction reference' })
  @IsString()
  @IsOptional()
  reference?: string;
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
