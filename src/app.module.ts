import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FotosModule } from './fotos/fotos.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'album',
      autoLoadEntities: true,
      synchronize: true,
    }),
    FotosModule,
  ],
})
export class AppModule {}