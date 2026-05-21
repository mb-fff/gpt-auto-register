import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('GPT Auto Register API')
    .setDescription('⚠️ 仅供本地个人学习和技术研究使用！自动化注册 OpenAI 账号存在封号风险。')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
  console.log('🚀 Backend 服务已启动: http://localhost:3001');
  console.log('📖 Swagger: http://localhost:3001/api');
}

bootstrap();
