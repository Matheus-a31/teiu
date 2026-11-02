import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create({} as any);
  await app.listen(3000);
}
void bootstrap();
