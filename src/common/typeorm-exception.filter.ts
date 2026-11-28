import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(error: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = error.driverError as { code?: string };
    const errores: Record<string, [number, string]> = {
      '23505': [HttpStatus.CONFLICT, 'El registro ya existe'],
      '23503': [HttpStatus.BAD_REQUEST, 'Referencia a un registro inexistente'],
    };
    const [statusCode, message] = errores[driverError.code ?? ''] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Error en la base de datos',
    ];
    response.status(statusCode).json({ statusCode, message });
  }
}
