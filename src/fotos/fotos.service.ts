import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Repository } from 'typeorm';
import { Foto } from './entities/foto.entity.js';

export interface FiltroFotos {
  min: number;
  max: number;
  q?: string;
  page: number;
  limit: number;
  etiqueta?: string;
  orden?: string;
}

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotosRepo: Repository<Foto>,
  ) {}

  async findAll({ min, max, q, page, limit, etiqueta, orden }: FiltroFotos) {
    if (min > max) {
      throw new BadRequestException('min no puede ser mayor que max');
    }
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('page y limit deben ser enteros mayores que 0');
    }
    if (orden !== undefined && orden !== 'asc' && orden !== 'desc') {
      throw new BadRequestException('orden debe ser asc o desc');
    }

    const busqueda = q?.trim();
    const textoEtiqueta = etiqueta?.trim();
    const [data, total] = await this.fotosRepo.findAndCount({
      where: {
        calificacion: Between(min, max),
        ...(busqueda ? { titulo: ILike(`%${busqueda}%`) } : {}),
        ...(textoEtiqueta ? { etiquetas: { texto: textoEtiqueta } } : {}),
      },
      order: orden
        ? { calificacion: orden === 'asc' ? 'ASC' : 'DESC', id: 'ASC' }
        : { id: 'ASC' },
      relations: { album: true, etiquetas: true },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Foto> {
    const foto = await this.fotosRepo.findOne({
      where: { id },
      relations: { album: true, etiquetas: true },
    });
    if (!foto) throw new NotFoundException(`Foto ${id} no encontrada`);
    return foto;
  }

  create(datos: Partial<Foto>): Promise<Foto> {
    const foto = this.fotosRepo.create(datos);
    return this.fotosRepo.save(foto);
  }

  async update(id: number, datos: Partial<Foto>): Promise<Foto> {
    const foto = await this.findOne(id); // lanza 404 si no existe
    Object.assign(foto, datos);
    return this.fotosRepo.save(foto);
  }

  async remove(id: number): Promise<void> {
    const foto = await this.findOne(id); // lanza 404 si no existe
    await this.fotosRepo.remove(foto);
  }
}
