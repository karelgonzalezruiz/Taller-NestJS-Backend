import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AlbumesModule } from '../src/albumes/albumes.module.js';
import { Album } from '../src/albumes/entities/album.entity.js';
import { FotosModule } from '../src/fotos/fotos.module.js';
import { Foto } from '../src/fotos/entities/foto.entity.js';
import { Etiqueta } from '../src/fotos/entities/etiqueta.entity.js';
import { configureApp } from '../src/configure-app.js';

describe('API de fotos y álbumes (PostgreSQL)', () => {
  const schema = `sesion5_test_${randomUUID().replaceAll('-', '')}`;
  const connection = {
    type: 'postgres' as const,
    host: process.env.TEST_DB_HOST ?? 'localhost',
    port: Number(process.env.TEST_DB_PORT ?? 5432),
    username: process.env.TEST_DB_USER ?? 'postgres',
    password: process.env.TEST_DB_PASSWORD ?? '1234',
    database: process.env.TEST_DB_NAME ?? 'album',
  };
  const admin = new DataSource(connection);
  let app: INestApplication | undefined;
  let ds: DataSource;
  let schemaCreado = false;

  beforeAll(async () => {
    await admin.initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    schemaCreado = true;
    const moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...connection,
          schema,
          entities: [Foto, Album, Etiqueta],
          synchronize: true,
          retryAttempts: 0,
        }),
        FotosModule,
        AlbumesModule,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
  });

  beforeEach(async () => {
    // Todas las tablas están calificadas con el esquema temporal de esta ejecución.
    await ds.query(
      `TRUNCATE "${schema}".foto_etiquetas, "${schema}".fotos, "${schema}".etiquetas, "${schema}".albumes RESTART IDENTITY CASCADE`,
    );
    const albumes = await ds
      .getRepository(Album)
      .save(
        ['Viajes', 'Guayaquil', 'Naturaleza'].map((nombre) => ({ nombre })),
      );
    const etiquetas = await ds
      .getRepository(Etiqueta)
      .save(['playa', 'ciudad', 'noche'].map((texto) => ({ texto })));
    await ds.getRepository(Foto).save([
      {
        titulo: 'Foto 1 Playa',
        calificacion: 4.8,
        ruta: 'https://picsum.photos/id/10/600/400',
        fotografo: 'Karel',
        album: albumes[0],
        etiquetas: [etiquetas[0], etiquetas[1]],
      },
      {
        titulo: 'Foto 2 Ciudad',
        calificacion: 1,
        ruta: 'https://picsum.photos/id/20/600/400',
        album: albumes[1],
        etiquetas: [etiquetas[1]],
      },
      {
        titulo: 'Foto 3 Noche',
        calificacion: 3.5,
        ruta: 'https://picsum.photos/id/30/600/400',
        album: albumes[2],
        etiquetas: [etiquetas[2]],
      },
      {
        titulo: 'Foto 4 Playa',
        calificacion: 4.8,
        ruta: 'https://picsum.photos/id/40/600/400',
        album: albumes[0],
        etiquetas: [etiquetas[0]],
      },
    ]);
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      if (admin.isInitialized) {
        try {
          if (schemaCreado && /^sesion5_test_[a-f0-9]{32}$/.test(schema)) {
            await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
          }
        } finally {
          await admin.destroy();
        }
      }
    }
  });

  const api = () => request(app!.getHttpServer());
  const datosFoto = {
    titulo: 'Cerro Santa Ana',
    calificacion: 4.8,
    ruta: 'https://picsum.photos/id/1/600/400',
  };

  it('mantiene el listado paginado con álbum y etiquetas', async () => {
    const { body } = await api().get('/api/fotos').expect(200);
    expect(body).toMatchObject({ total: 4, page: 1, limit: 10 });
    expect(body.data.map((foto: Foto) => foto.id)).toEqual([1, 2, 3, 4]);
    expect(body.data[0]).toMatchObject({
      album: { id: 1, nombre: 'Viajes' },
      fotografo: 'Karel',
    });
    expect(body.data[0].etiquetas).toHaveLength(2);
  });

  it('consulta una foto con sus relaciones', async () => {
    const { body } = await api().get('/api/fotos/1').expect(200);
    expect(body.album.id).toBe(1);
    expect(body.etiquetas).toHaveLength(2);
  });

  it('filtra por rango y convierte la paginación a números', async () => {
    const { body } = await api()
      .get('/api/fotos?min=3&max=5&page=2&limit=1')
      .expect(200);
    expect(body).toMatchObject({ total: 3, page: 2, limit: 1 });
    expect(body.data[0].id).toBe(3);
  });

  it('conserva la búsqueda parcial sin distinguir mayúsculas', async () => {
    const { body } = await api()
      .get('/api/fotos')
      .query({ q: ' PLAYA ' })
      .expect(200);
    expect(body.data.map((foto: Foto) => foto.id)).toEqual([1, 4]);
  });

  it('conserva el filtro por etiqueta', async () => {
    const { body } = await api().get('/api/fotos?etiqueta=playa').expect(200);
    expect(body.total).toBe(2);
    expect(body.data.map((foto: Foto) => foto.id)).toEqual([1, 4]);
  });

  it.each([
    ['asc', [2, 3, 1, 4]],
    ['desc', [1, 4, 3, 2]],
  ])('conserva orden=%s y el desempate por id', async (orden, ids) => {
    const { body } = await api().get('/api/fotos').query({ orden }).expect(200);
    expect(body.data.map((foto: Foto) => foto.id)).toEqual(ids);
  });

  it('combina todos los filtros existentes', async () => {
    const { body } = await api()
      .get(
        '/api/fotos?min=3&max=5&q=playa&page=1&limit=1&etiqueta=playa&orden=desc',
      )
      .expect(200);
    expect(body).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(body.data[0].id).toBe(1);
  });

  it('devuelve una página vacía sin perder el total', async () => {
    const { body } = await api().get('/api/fotos?page=10&limit=1').expect(200);
    expect(body).toMatchObject({ data: [], total: 4, page: 10, limit: 1 });
  });

  it.each([
    'min=abc',
    'min=-1',
    'max=6',
    'min=5&max=2',
    'limit=999',
    'limit=0',
    'page=0',
    'page=1.5',
    'orden=otro',
    'hack=1',
    'page=1&page=2',
  ])('rechaza la consulta inválida %s', async (query) => {
    await api().get(`/api/fotos?${query}`).expect(400);
  });

  it('devuelve los mensajes de validación en español como lista', async () => {
    const { body } = await api().get('/api/fotos?limit=999').expect(400);
    expect(body.message).toEqual(['limit no puede ser mayor que 50']);
  });

  it('crea con álbum, reutiliza etiquetas y normaliza las nuevas', async () => {
    const { body } = await api()
      .post('/api/fotos')
      .send({
        ...datosFoto,
        albumId: 2,
        etiquetas: [' Ciudad ', 'faro', 'FARO'],
        fotografo: 'Karel',
      })
      .expect(201);
    expect(body).toMatchObject({
      titulo: datosFoto.titulo,
      fotografo: 'Karel',
      album: { id: 2, nombre: 'Guayaquil' },
    });
    expect(
      body.etiquetas.map((etiqueta: Etiqueta) => etiqueta.texto).sort(),
    ).toEqual(['ciudad', 'faro']);
    expect(await ds.getRepository(Etiqueta).count()).toBe(4);
    await api().get(`/api/fotos/${body.id}`).expect(200);
  });

  it('permite crear sin álbum ni etiquetas', async () => {
    const { body } = await api().post('/api/fotos').send(datosFoto).expect(201);
    expect(body.album).toBeNull();
    expect(body.etiquetas).toEqual([]);
  });

  it('rechaza campos extra, título vacío, calificación fuera de rango y URL inválida', async () => {
    const { body } = await api()
      .post('/api/fotos')
      .send({ titulo: '', calificacion: 9, ruta: 'no-url', hack: 1 })
      .expect(400);
    expect(body.message).toEqual(
      expect.arrayContaining([
        'El campo hack no está permitido',
        'El título es obligatorio',
        'La calificación no puede ser mayor que 5',
        'La ruta debe ser una URL válida con http o https',
      ]),
    );
    expect(await ds.getRepository(Foto).count()).toBe(4);
  });

  it.each([
    { titulo: '   ' },
    { titulo: 'a'.repeat(101) },
    { calificacion: '4' },
    { calificacion: -1 },
    { albumId: 0 },
    { albumId: '2' },
    { etiquetas: [7] },
    { etiquetas: ['   '] },
    { etiquetas: ['a'.repeat(31)] },
    { etiquetas: null },
    { id: 1 },
    { album: { id: 1 } },
  ])('rechaza datos inválidos de creación: %j', async (cambios) => {
    await api()
      .post('/api/fotos')
      .send({ ...datosFoto, ...cambios })
      .expect(400);
  });

  it('traduce la FK inexistente a 400 y revierte las etiquetas nuevas', async () => {
    const { body } = await api()
      .post('/api/fotos')
      .send({ ...datosFoto, albumId: 999999, etiquetas: ['sin_huerfanas'] })
      .expect(400);
    expect(body.message).toBe('Referencia a un registro inexistente');
    expect(await ds.getRepository(Foto).count()).toBe(4);
    expect(await ds.getRepository(Etiqueta).count()).toBe(3);
  });

  it('reutiliza una etiqueta creada por dos peticiones simultáneas', async () => {
    const responses = await Promise.all([
      api()
        .post('/api/fotos')
        .send({ ...datosFoto, etiquetas: ['compartida'] }),
      api()
        .post('/api/fotos')
        .send({ ...datosFoto, etiquetas: ['COMPARTIDA'] }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0].body.etiquetas[0].id).toBe(
      responses[1].body.etiquetas[0].id,
    );
    expect(
      await ds.getRepository(Etiqueta).countBy({ texto: 'compartida' }),
    ).toBe(1);
  });

  it('actualiza solo la calificación y conserva los demás datos', async () => {
    const { body } = await api()
      .patch('/api/fotos/1')
      .send({ calificacion: 2.5 })
      .expect(200);
    expect(body).toMatchObject({
      titulo: 'Foto 1 Playa',
      calificacion: 2.5,
      fotografo: 'Karel',
      album: { id: 1 },
    });
    expect(body.etiquetas).toHaveLength(2);
  });

  it('cambia el álbum y reemplaza las etiquetas', async () => {
    const { body } = await api()
      .patch('/api/fotos/1')
      .send({ albumId: 2, etiquetas: [' Nueva '] })
      .expect(200);
    expect(body.album.id).toBe(2);
    expect(body.etiquetas).toHaveLength(1);
    expect(body.etiquetas[0].texto).toBe('nueva');
  });

  it('permite vaciar las etiquetas y quitar el álbum explícitamente', async () => {
    const { body } = await api()
      .patch('/api/fotos/1')
      .send({
        etiquetas: [],
        albumId: null,
        descripcion: null,
        fotografo: null,
      })
      .expect(200);
    expect(body).toMatchObject({
      etiquetas: [],
      album: null,
      descripcion: null,
      fotografo: null,
    });
  });

  it.each(['titulo', 'calificacion', 'ruta', 'etiquetas'])(
    'rechaza null para %s en PATCH',
    async (campo) => {
      await api()
        .patch('/api/fotos/1')
        .send({ [campo]: null })
        .expect(400);
    },
  );

  it('revierte toda la edición cuando el álbum no existe', async () => {
    await api()
      .patch('/api/fotos/1')
      .send({
        titulo: 'No guardar',
        albumId: 999999,
        etiquetas: ['sin_huerfanas'],
      })
      .expect(400);
    const { body } = await api().get('/api/fotos/1').expect(200);
    expect(body.titulo).toBe('Foto 1 Playa');
    expect(body.album.id).toBe(1);
    expect(body.etiquetas).toHaveLength(2);
    expect(await ds.getRepository(Etiqueta).count()).toBe(3);
  });

  it('elimina una foto y sus asociaciones, con 204 sin cuerpo', async () => {
    const response = await api().delete('/api/fotos/1').expect(204);
    expect(response.text).toBe('');
    await api().get('/api/fotos/1').expect(404);
    expect(await ds.getRepository(Etiqueta).count()).toBe(3);
    expect(await ds.getRepository(Album).count()).toBe(3);
    const [row] = await ds.query(
      `SELECT count(*)::int AS total FROM "${schema}".foto_etiquetas WHERE "fotoId" = 1`,
    );
    expect(row.total).toBe(0);
  });

  it('lista álbumes y permite consultar uno y sus fotos', async () => {
    const listado = await api().get('/api/albumes').expect(200);
    expect(listado.body.map((album: Album) => album.id)).toEqual([1, 2, 3]);
    await api().get('/api/albumes/1').expect(200, { id: 1, nombre: 'Viajes' });
    const { body } = await api().get('/api/albumes/1/fotos').expect(200);
    expect(body.fotos.map((foto: Foto) => foto.id).sort()).toEqual([1, 4]);
  });

  it('crea un álbum y recorta los espacios del nombre', async () => {
    const { body } = await api()
      .post('/api/albumes')
      .send({ nombre: '  Costa  ' })
      .expect(201);
    expect(body.nombre).toBe('Costa');
    await api().get(`/api/albumes/${body.id}`).expect(200);
  });

  it('traduce el nombre de álbum duplicado a 409', async () => {
    const { body } = await api()
      .post('/api/albumes')
      .send({ nombre: ' Viajes ' })
      .expect(409);
    expect(body.message).toBe('El registro ya existe');
    expect(await ds.getRepository(Album).count()).toBe(3);
  });

  it('actualiza un álbum', async () => {
    const { body } = await api()
      .patch('/api/albumes/1')
      .send({ nombre: 'Costa' })
      .expect(200);
    expect(body).toMatchObject({ id: 1, nombre: 'Costa' });
  });

  it('rechaza un nombre duplicado al actualizar y conserva el anterior', async () => {
    await api()
      .patch('/api/albumes/1')
      .send({ nombre: 'Guayaquil' })
      .expect(409);
    const { body } = await api().get('/api/albumes/1').expect(200);
    expect(body.nombre).toBe('Viajes');
  });

  it.each([
    { nombre: '' },
    { nombre: '   ' },
    { nombre: 'a'.repeat(81) },
    { nombre: 1 },
    { nombre: null },
    { nombre: 'Costa', hack: 1 },
  ])('valida el cuerpo del álbum: %j', async (datos) => {
    await api().post('/api/albumes').send(datos).expect(400);
    await api().patch('/api/albumes/1').send(datos).expect(400);
  });

  it('borra el álbum sin eliminar sus fotos ni sus etiquetas', async () => {
    const response = await api().delete('/api/albumes/1').expect(204);
    expect(response.text).toBe('');
    await api().get('/api/albumes/1').expect(404);
    await api().get('/api/albumes/1/fotos').expect(404);
    expect(await ds.getRepository(Foto).count()).toBe(4);
    for (const id of [1, 4]) {
      const { body } = await api().get(`/api/fotos/${id}`).expect(200);
      expect(body.album).toBeNull();
      expect(body.etiquetas.length).toBeGreaterThan(0);
    }
  });

  it.each(['fotos', 'albumes'])(
    'responde 404 para recursos inexistentes de %s',
    async (recurso) => {
      await api().get(`/api/${recurso}/999999`).expect(404);
      await api().patch(`/api/${recurso}/999999`).send({}).expect(404);
      await api().delete(`/api/${recurso}/999999`).expect(404);
    },
  );

  it.each(['fotos', 'albumes'])(
    'responde 400 para identificadores inválidos de %s',
    async (recurso) => {
      await api().get(`/api/${recurso}/abc`).expect(400);
    },
  );
});
