import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAlbumDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre del álbum debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del álbum es obligatorio' })
  @MaxLength(80, {
    message: 'El nombre del álbum no puede superar los 80 caracteres',
  })
  nombre: string;
}
