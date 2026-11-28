import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { TypeOrmExceptionFilter } from './common/typeorm-exception.filter.js';

function mensajesDeValidacion(errores: ValidationError[]): string[] {
  return errores.flatMap((error) => [
    ...Object.entries(error.constraints ?? {}).map(([regla, mensaje]) =>
      regla === 'whitelistValidation'
        ? `El campo ${error.property} no está permitido`
        : mensaje,
    ),
    ...mensajesDeValidacion(error.children ?? []),
  ]);
}

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errores) =>
        new BadRequestException(mensajesDeValidacion(errores)),
    }),
  );
  app.useGlobalFilters(new TypeOrmExceptionFilter());
}
