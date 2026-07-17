import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const hashed = dto.password ? await bcrypt.hash(dto.password, 12) : null;
    const referralCode = uuid().slice(0, 8).toUpperCase();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || Role.BUYER,
        referralCode,
      },
    });

    // Send OTP for phone verification (fire-and-forget — don't block registration)
    if (dto.phone) {
      this.sendPhoneOtp(dto.phone, user.id, 'phone_verify').catch(() => {});
    }

    if (dto.email) {
      this.sendEmailOtp(dto.email, user.id, 'email_verify').catch(() => {});
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ],
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Login with OTP ──────────────────────────────────────────────────────────
  async loginWithOtp(phone: string) {
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // Auto-register with phone
      user = await this.prisma.user.create({
        data: {
          phone,
          firstName: 'User',
          lastName: phone.slice(-4),
          role: Role.BUYER,
          referralCode: uuid().slice(0, 8).toUpperCase(),
        },
      });
    }

    await this.sendPhoneOtp(phone, user.id, 'login');
    return { message: 'OTP sent to ' + phone };
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        type: 'login',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('User not found');

    // Mark phone as verified
    if (!user.isPhoneVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true, status: 'ACTIVE' },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Refresh Token ────────────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(stored.userId, stored.user.role);
    return tokens;
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Logged out' };
  }

  // ── Helper: Generate Tokens ──────────────────────────────────────────────────
  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      // Without this guard a missing env var surfaces as an opaque 500 on
      // every successful credential check ("login is broken for everyone").
      throw new ServiceUnavailableException(
        'Server auth misconfigured: JWT_SECRET is not set',
      );
    }

    const accessToken = this.jwt.sign(payload, {
      secret,
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = uuid();
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { accessToken, refreshToken };
  }

  // ── Helper: Send Phone OTP ───────────────────────────────────────────────────
  async sendPhoneOtp(phone: string, userId: string | null, type: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpCode.create({
      data: {
        userId,
        phone,
        code,
        type,
        expiresAt,
      },
    });

    this.notifications.sendSms(
      phone,
      `Your TotalStore OTP is: ${code}. Valid for 10 minutes.`,
    ).catch(() => {});
  }

  // ── Helper: Send Email OTP ───────────────────────────────────────────────────
  async sendEmailOtp(email: string, userId: string, type: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { userId, email, code, type, expiresAt },
    });

    this.notifications.sendEmail(email, 'Verify your email', `Your OTP is: ${code}`).catch(() => {});
  }

  private sanitizeUser(user: any) {
    const { password, ...rest } = user;
    return rest;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    return { success: true };
  }

  // ── Google / Social Sign-In ──────────────────────────────────────────────────
  async googleSignIn(credential: string) {
    // Verify the Google ID token against Google's tokeninfo endpoint
    const { data: payload } = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
    ).catch(() => {
      throw new UnauthorizedException('Invalid Google credential');
    });

    const { email, given_name, family_name, picture } = payload as any;
    if (!email) throw new UnauthorizedException('Google account has no email');

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const referralCode = require('uuid').v4().slice(0, 8).toUpperCase();
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: given_name || email.split('@')[0],
          lastName: family_name || '',
          isEmailVerified: true,
          role: Role.BUYER,
          referralCode,
          avatar: picture || null,
        },
      });
    } else if (!user.isEmailVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
      user = { ...user, isEmailVerified: true };
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Forgot Password ─────────────────────────────────────────────────────────
  // Accepts an email OR a phone number. Phone → SMS OTP (needs SMS provider
  // configured); email → email OTP (needs SMTP configured).
  async forgotPassword(identifier: string) {
    const id = (identifier || '').trim();
    const isPhone = !id.includes('@');
    const user = isPhone
      ? await this.prisma.user.findUnique({ where: { phone: id } })
      : await this.prisma.user.findUnique({ where: { email: id } });

    // Always return success to prevent account enumeration
    const generic = isPhone
      ? { message: 'If that phone is registered, a reset code has been sent by SMS.' }
      : { message: 'If that email is registered, a reset code has been sent.' };
    if (!user) return generic;

    if (isPhone && user.phone) {
      await this.sendPhoneOtp(user.phone, user.id, 'password_reset');
    } else if (user.email) {
      await this.sendEmailOtp(user.email, user.id, 'password_reset');
    }
    return generic;
  }

  // ── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(identifier: string, code: string, newPassword: string) {
    const id = (identifier || '').trim();
    const isPhone = !id.includes('@');
    const user = isPhone
      ? await this.prisma.user.findUnique({ where: { phone: id } })
      : await this.prisma.user.findUnique({ where: { email: id } });
    if (!user) throw new BadRequestException('Invalid account or code');

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        ...(isPhone ? { phone: id } : { email: id }),
        code,
        type: 'password_reset',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) throw new BadRequestException('Invalid or expired code');

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Update password
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Invalidate all existing refresh tokens (force re-login)
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Password reset successfully. Please log in.' };
  }
}
