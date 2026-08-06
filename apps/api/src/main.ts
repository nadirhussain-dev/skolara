import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());

  const corsOrigins = config.get<string>("CORS_ORIGINS");
  app.enableCors({
    // No CORS_ORIGINS set → same-origin/non-browser clients only (mobile app,
    // server-to-server) in production; wide open in development for convenience.
    origin: corsOrigins
      ? corsOrigins.split(",").map((origin) => origin.trim())
      : config.get<string>("NODE_ENV") === "production"
        ? false
        : true,
    credentials: true,
  });

  // Let SIGTERM/SIGINT (container stop, deploy rollover) run onModuleDestroy
  // hooks — e.g. PrismaService closing its connection pool — before exiting.
  app.enableShutdownHooks();

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  Logger.log(`Skolara API listening on port ${port}`, "Bootstrap");
}

bootstrap();
