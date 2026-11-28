import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateFotoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El título debe ser texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(100, { message: 'El título no puede superar los 100 caracteres' })
  titulo: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string | null;

  @IsNumber({}, { message: 'La calificación debe ser un número' })
  @Min(0, { message: 'La calificación no puede ser menor que 0' })
  @Max(5, { message: 'La calificación no puede ser mayor que 5' })
  calificacion: number;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'La ruta debe ser una URL válida con http o https' },
  )
  ruta: string;

  @IsOptional()
  @IsString({ message: 'El fotógrafo debe ser texto' })
  fotografo?: string | null;

  @IsOptional()
  @IsInt({ message: 'El identificador del álbum debe ser un número entero' })
  @Min(1, { message: 'El identificador del álbum debe ser mayor que 0' })
  albumId?: number | null;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((texto: unknown) =>
          typeof texto === 'string' ? texto.trim().toLowerCase() : texto,
        )
      : value,
  )
  @IsArray({ message: 'Las etiquetas deben ser un arreglo de textos' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser texto' })
  @IsNotEmpty({ each: true, message: 'Las etiquetas no pueden estar vacías' })
  @MaxLength(30, {
    each: true,
    message: 'Cada etiqueta puede tener como máximo 30 caracteres',
  })
  etiquetas?: string[];
}
