import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Album } from './entities/album.entity.js';

@Injectable()
export class AlbumesService {
  constructor(
    @InjectRepository(Album)
    private readonly albumesRepo: Repository<Album>,
  ) {}

  findAll(): Promise<Album[]> {
    return this.albumesRepo.find({ order: { id: 'ASC' } });
  }

  async findFotos(id: number): Promise<Album> {
    const album = await this.albumesRepo.findOne({
      where: { id },
      relations: { fotos: true },
    });
    if (!album) throw new NotFoundException(`Álbum ${id} no encontrado`);
    return album;
  }
}
