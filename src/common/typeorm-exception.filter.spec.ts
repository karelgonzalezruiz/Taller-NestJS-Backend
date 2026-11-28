import type { ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { TypeOrmExceptionFilter } from './typeorm-exception.filter.js';

describe('TypeOrmExceptionFilter', () => {
  it.each([
    ['23505', 409, 'El registro ya existe'],
    ['23503', 400, 'Referencia a un registro inexistente'],
    ['XX000', 500, 'Error en la base de datos'],
  ])(
    'traduce el código %s sin exponer detalles internos',
    (code, statusCode, message) => {
      const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const host = {
        switchToHttp: () => ({ getResponse: () => response }),
      } as unknown as ArgumentsHost;
      const error = new QueryFailedError(
        'SELECT informacion_interna',
        [],
        Object.assign(new Error('Detalle interno de PostgreSQL'), { code }),
      );
      new TypeOrmExceptionFilter().catch(error, host);
      expect(response.status).toHaveBeenCalledWith(statusCode);
      expect(response.json).toHaveBeenCalledWith({ statusCode, message });
    },
  );
});
