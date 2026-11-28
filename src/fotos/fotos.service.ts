import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Repository } from 'typeorm';
import { Foto } from './entities/foto.entity.js';
import { Etiqueta } from './entities/etiqueta.entity.js';
import type { CreateFotoDto } from './dto/create-foto.dto.js';
import type { UpdateFotoDto } from './dto/update-foto.dto.js';
import type { QueryFotosDto } from './dto/query-fotos.dto.js';

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotosRepo: Repository<Foto>,
    @InjectRepository(Etiqueta)
    private readonly etiquetasRepo: Repository<Etiqueta>,
  ) {}

  async findAll({ min, max, q, page, limit, etiqueta, orden }: QueryFotosDto) {
    if (min > max) {
      throw new BadRequestException('min no puede ser mayor que max');
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

  async findOne(id: number, fotosRepo = this.fotosRepo): Promise<Foto> {
    const foto = await fotosRepo.findOne({
      where: { id },
      relations: { album: true, etiquetas: true },
    });
    if (!foto) throw new NotFoundException(`Foto ${id} no encontrada`);
    return foto;
  }

  create({ albumId, etiquetas, ...datos }: CreateFotoDto): Promise<Foto> {
    return this.fotosRepo.manager.transaction(async (manager) => {
      const fotosRepo = manager.getRepository(Foto);
      const foto = fotosRepo.create({
        ...datos,
        album: albumId == null ? null : { id: albumId },
        etiquetas: await this.buscarOCrearEtiquetas(
          etiquetas,
          manager.getRepository(Etiqueta),
        ),
      });
      const guardada = await fotosRepo.save(foto);
      return this.findOne(guardada.id, fotosRepo);
    });
  }

  update(
    id: number,
    { albumId, etiquetas, ...datos }: UpdateFotoDto,
  ): Promise<Foto> {
    return this.fotosRepo.manager.transaction(async (manager) => {
      const fotosRepo = manager.getRepository(Foto);
      const foto = await this.findOne(id, fotosRepo);
      Object.assign(foto, datos);
      if (albumId !== undefined) {
        foto.album =
          albumId === null ? null : ({ id: albumId } as Foto['album']);
      }
      if (etiquetas !== undefined) {
        foto.etiquetas = await this.buscarOCrearEtiquetas(
          etiquetas,
          manager.getRepository(Etiqueta),
        );
      }
      await fotosRepo.save(foto);
      return this.findOne(id, fotosRepo);
    });
  }

  private async buscarOCrearEtiquetas(
    textos: string[] = [],
    etiquetasRepo = this.etiquetasRepo,
  ): Promise<Etiqueta[]> {
    const limpios = [
      ...new Set(textos.map((texto) => texto.trim().toLowerCase())),
    ].sort();
    if (limpios.length === 0) return [];

    // La restricción única también evita duplicados entre peticiones simultáneas.
    await etiquetasRepo
      .createQueryBuilder()
      .insert()
      .values(limpios.map((texto) => ({ texto })))
      .orIgnore()
      .execute();
    return etiquetasRepo.find({
      where: { texto: In(limpios) },
      order: { id: 'ASC' },
    });
  }

  async remove(id: number): Promise<void> {
    const foto = await this.findOne(id); // lanza 404 si no existe
    await this.fotosRepo.remove(foto);
  }
}
