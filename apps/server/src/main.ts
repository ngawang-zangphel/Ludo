import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { BroadcastService } from './broadcast/broadcast.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origin = config.get<string>('CLIENT_ORIGIN', 'http://localhost:4200');

  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    })
  );
  app.enableCors({
    origin,
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.get(BroadcastService).restore();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`Ludo Arena API running on http://localhost:${port}/api`);
}

bootstrap();
