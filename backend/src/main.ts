import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.setup.js';
import { AppModule } from './app.module.js';
import { config } from './config.js';

const app = await NestFactory.create(AppModule);
configureApp(app);
app.enableShutdownHooks();
await app.listen(config.port);
