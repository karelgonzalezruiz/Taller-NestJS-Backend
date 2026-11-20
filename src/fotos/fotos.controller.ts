import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { FotosService } from './fotos.service.js';
import { Foto } from './entities/foto.entity.js';

@Controller('fotos')
export class FotosController {
  constructor(private readonly fotosService: FotosService) {}

  @Get()
  findAll(): Promise<Foto[]> {
    return this.fotosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Foto> {
    return this.fotosService.findOne(id);
  }

  @Post()
  create(@Body() datos: Partial<Foto>): Promise<Foto> {
    return this.fotosService.create(datos);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: Partial<Foto>,
  ): Promise<Foto> {
    return this.fotosService.update(id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.fotosService.remove(id);
  }
}