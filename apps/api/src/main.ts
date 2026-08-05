import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 4000);

  await app.listen(port);
}

bootstrap();
