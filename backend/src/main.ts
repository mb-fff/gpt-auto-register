import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // 本地开发可放开
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('GPT Auto Register')
    .setDescription('⚠️ 仅供本地学习研究使用 - OpenAI 自动注册项目')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
  console.log('🚀 Backend 服务启动成功 → http://localhost:3001');
  console.log('📖 Swagger 文档 → http://localhost:3001/api');
}

bootstrap().catch(err => {
  console.error('❌ 启动失败:', err);
});
