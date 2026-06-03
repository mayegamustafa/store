import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { initSentry } from './common/sentry/sentry.init';
import { join } from 'path';

async function bootstrap() {
  // Initialize Sentry BEFORE Nest — must be early to capture bootstrap errors.
  // No-op if SENTRY_DSN is unset.
  initSentry();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);

        // Always allow payment gateway webhook origins (Pesapal, etc.)
        const webhookOrigins = [
          'https://pay.pesapal.com',
          'https://cybqa.pesapal.com',
          'https://www.pesapal.com',
        ];
        if (webhookOrigins.includes(origin)) return callback(null, true);

        const allowed = process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
          : null;
        // In production, require explicit CORS_ORIGINS
        if (!allowed) {
          const isProduction = process.env.NODE_ENV === 'production';
          if (isProduction) return callback(new Error('CORS_ORIGINS must be configured in production'), false);
          return callback(null, true); // dev mode — allow all
        }
        if (allowed.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS policy: origin ${origin} not allowed`), false);
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  });

  // Serve uploaded files as static assets
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Security headers
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global prefix
  app.setGlobalPrefix('api');

  // API versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('TotalStore API')
    .setDescription('Multivendor eCommerce Platform - Uganda / East Africa')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('products', 'Product management')
    .addTag('orders', 'Order management')
    .addTag('payments', 'Payment processing')
    .addTag('sellers', 'Seller dashboard')
    .addTag('riders', 'Delivery rider')
    .addTag('admin', 'Admin panel')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 TotalStore API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`📁 Uploads at: http://localhost:${port}/uploads/`);
}

bootstrap();
