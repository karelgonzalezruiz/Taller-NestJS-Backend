import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Album } from '../../albumes/entities/album.entity.js';
import { Etiqueta } from './etiqueta.entity.js';

@Entity('fotos')
export class Foto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'real', default: 0 })
  calificacion: number;

  @Column()
  ruta: string; // URL de la imagen

  @Column({ type: 'text', nullable: true })
  fotografo: string | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;

  @ManyToOne(() => Album, (album) => album.fotos, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  album: Relation<Album> | null;

  @ManyToMany(() => Etiqueta, (etiqueta) => etiqueta.fotos)
  @JoinTable({
    name: 'foto_etiquetas',
    joinColumn: {
      name: 'fotoId',
    },
    inverseJoinColumn: { name: 'etiqueta_id' },
  })
  etiquetas: Etiqueta[];
}
