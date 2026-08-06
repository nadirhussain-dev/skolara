import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  // On by default in development; off in production unless explicitly opted
  // into (this is a multi-tenant B2B API, not a public one — no reason to
  // publish the full route surface by default).
  const docsEnabled =
    config.get<string>("NODE_ENV") !== "production" ||
    config.get<string>("ENABLE_API_DOCS") === "true";
  if (docsEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Skolara API")
        .setDescription(
          "Multi-tenant school management API. Requests are validated with Zod at the " +
            "controller layer, so most request/response shapes aren't reflected in this schema " +
            "yet — see packages/types/src for the source of truth on payload shapes. Authenticate " +
            "with the bearer token from POST /auth/login.",
        )
        .setVersion("1.0")
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup("docs", app, document);
  }

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  Logger.log(`Skolara API listening on port ${port}`, "Bootstrap");
}

bootstrap();
