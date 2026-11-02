import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create({} as any);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
