import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Foto } from './entities/foto.entity.js';
import { FotosService } from './fotos.service.js';
import { FotosController } from './fotos.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Foto])],
  providers: [FotosService],
  controllers: [FotosController],
  exports: [FotosService],
})
export class FotosModule {}
