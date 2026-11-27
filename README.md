# Álbum de Fotos API con NestJS y PostgreSQL

API REST para gestionar fotos y consultar álbumes, con persistencia en PostgreSQL mediante TypeORM. El proyecto está organizado en módulos, controladores, servicios y entidades, y todas las rutas comienzan con `/api`.

## Novedades

- Módulo de álbumes para listar los álbumes y consultar sus fotos.
- Relación de un álbum con muchas fotos. Una foto puede no tener álbum; al eliminar un álbum, sus fotos se conservan con la relación en `null`.
- Relación de muchas fotos con muchas etiquetas mediante la tabla `foto_etiquetas`.
- Filtros por rango de calificación, búsqueda por título sin distinguir mayúsculas y minúsculas, y filtro por texto exacto de etiqueta.
- Paginación con `page` y `limit`, y orden opcional por calificación.
- Respuesta del listado de fotos con los campos `data`, `total`, `page` y `limit`.
- Carga de ejemplo con 3 álbumes, 6 etiquetas y 20 fotos.
- Configuración de Vitest, Oxlint, Prettier y finales de línea LF.
- Documento de pruebas de relaciones, filtros, paginación, orden y validación, con capturas de las respuestas de la API.

## Tecnologías

- Node.js, NestJS 12 y TypeScript 6.
- PostgreSQL, TypeORM y el controlador `pg`.
- ES Modules: las importaciones relativas utilizan la extensión `.js`.
- Vitest y Supertest para pruebas; Oxlint y Prettier para revisión y formato.

## Estructura

```text
backend/
├── src/
│   ├── albumes/
│   │   ├── entities/album.entity.ts
│   │   ├── albumes.controller.ts
│   │   ├── albumes.service.ts
│   │   └── albumes.module.ts
│   ├── fotos/
│   │   ├── entities/
│   │   │   ├── foto.entity.ts
│   │   │   └── etiqueta.entity.ts
│   │   ├── fotos.controller.ts
│   │   ├── fotos.service.ts
│   │   └── fotos.module.ts
│   ├── app.controller.ts          # Controlador de ejemplo para la prueba unitaria
│   ├── app.controller.spec.ts
│   ├── app.service.ts
│   ├── app.module.ts              # Conexión a PostgreSQL y módulos de la API
│   ├── main.ts                    # Prefijo /api e inicio del servidor
│   └── seed.ts                    # Reinicio y carga de datos de ejemplo
├── test/app.e2e-spec.ts
├── vitest.config.ts
├── vitest.config.e2e.ts
├── .gitattributes
├── .oxlintrc.json
├── .prettierrc
└── package.json
```

## Modelo de datos

La entidad `Foto` contiene `id`, `titulo`, `descripcion`, `calificacion`, `ruta`, `fotografo`, `creadoEn` y `actualizadoEn`, además de las relaciones `album` y `etiquetas`. La descripción y el fotógrafo son opcionales; la calificación tiene un valor predeterminado de `0`.

Un `Album` tiene `id`, `nombre` y la colección `fotos`. Una `Etiqueta` tiene `id`, `texto` único y su relación con las fotos. La tabla intermedia `foto_etiquetas` vincula ambas entidades usando las columnas `fotoId` y `etiqueta_id`.

El listado y la consulta individual de fotos cargan el álbum y las etiquetas. La consulta de fotos de un álbum devuelve el objeto del álbum con su colección `fotos`.

## Rutas de la API

| Método | Ruta | Descripción | Respuestas |
| --- | --- | --- | --- |
| `GET` | `/api/fotos` | Lista fotos con filtros y paginación | `200`, `400` |
| `GET` | `/api/fotos/:id` | Consulta una foto con su álbum y etiquetas | `200`, `400`, `404` |
| `POST` | `/api/fotos` | Crea una foto | `201` |
| `PATCH` | `/api/fotos/:id` | Actualiza los campos enviados | `200`, `400`, `404` |
| `DELETE` | `/api/fotos/:id` | Elimina una foto, sin cuerpo de respuesta | `204`, `400`, `404` |
| `GET` | `/api/albumes` | Lista los álbumes ordenados por `id` | `200` |
| `GET` | `/api/albumes/:id/fotos` | Consulta un álbum con sus fotos | `200`, `400`, `404` |

Los identificadores de ruta pasan por `ParseIntPipe`: un valor como `abc` devuelve `400`. Si la foto o el álbum solicitado no existe, la API devuelve `404`. Los cuerpos de creación y actualización se reciben como `Partial<Foto>`; no hay DTO con validación del cuerpo.

### Filtros del listado de fotos

| Parámetro | Valor predeterminado | Comportamiento |
| --- | --- | --- |
| `min` | `0` | Calificación mínima incluida |
| `max` | `5` | Calificación máxima incluida |
| `q` | Sin filtro | Busca una coincidencia parcial en el título, sin distinguir mayúsculas y minúsculas |
| `page` | `1` | Página solicitada, entero mayor que cero |
| `limit` | `10` | Cantidad de fotos por página, entero mayor que cero |
| `etiqueta` | Sin filtro | Filtra por el texto exacto de una etiqueta |
| `orden` | Por `id` ascendente | Acepta `asc` o `desc` para ordenar por calificación, con desempate por `id` ascendente |

Los filtros se pueden combinar. Se eliminan los espacios al inicio y al final de `q` y `etiqueta`; si quedan vacíos, no se aplican. Un rango con `min > max`, una página o límite menor que uno, un valor numérico inválido o un `orden` distinto de `asc` y `desc` devuelve `400`.

Ejemplo:

```text
GET /api/fotos?min=3&max=5&q=Foto&page=1&limit=5&etiqueta=playa&orden=desc
```

El listado ya no devuelve un arreglo directamente. Su estructura es:

```json
{
  "data": [
    {
      "id": 1,
      "titulo": "Foto 1",
      "descripcion": null,
      "calificacion": 4.3,
      "ruta": "https://picsum.photos/id/10/600/400",
      "fotografo": null,
      "creadoEn": "2026-11-25T05:00:00.000Z",
      "actualizadoEn": "2026-11-25T05:00:00.000Z",
      "album": { "id": 1, "nombre": "Viajes" },
      "etiquetas": [{ "id": 1, "texto": "playa" }]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5
}
```

`total` es la cantidad de fotos que cumplen los filtros antes de aplicar la paginación.

## Ejecución

1. Instalar Node.js, npm y PostgreSQL, y crear la base de datos:

   ```sql
   CREATE DATABASE album;
   ```

2. Revisar la conexión en `src/app.module.ts`. Actualmente usa `localhost`, puerto `5432`, usuario `postgres` y base de datos `album`. Ajustar el usuario y la contraseña según la instalación local. La conexión está definida directamente en ese archivo; no se carga desde `.env`.

3. Instalar las dependencias:

   ```bash
   npm ci
   ```

4. Iniciar el servidor:

   ```bash
   npm run start:dev
   ```

La API queda disponible en `http://localhost:3000/api/fotos` y `http://localhost:3000/api/albumes`. El puerto se puede cambiar mediante `PORT`. La raíz `/` responde `404`.

`autoLoadEntities: true` registra las entidades declaradas por los módulos. `synchronize: true` crea o ajusta las tablas al iniciar: esta configuración es para desarrollo, ya que puede modificar o eliminar datos. Las fotos, álbumes y relaciones se conservan al reiniciar el servidor.

### Datos de ejemplo

```bash
npm run seed
```

El script reinicia las tablas `foto_etiquetas`, `fotos`, `etiquetas` y `albumes`, incluidos sus identificadores. Después crea:

- 3 álbumes: Viajes, Guayaquil y Naturaleza.
- 6 etiquetas: playa, ciudad, noche, cielo, montaña y río.
- 20 fotos con calificación aleatoria entre `0` y `5`, imagen de Picsum, un álbum y una o dos etiquetas distintas.

**Este comando elimina los datos existentes y debe usarse únicamente para reiniciar los datos de prueba.**

## Comprobación desde PowerShell

Con el servidor y PostgreSQL en ejecución:

```powershell
# Listado paginado y filtros
curl.exe "http://localhost:3000/api/fotos?min=3&max=5&page=1&limit=5&orden=desc"
curl.exe "http://localhost:3000/api/fotos?q=Foto&etiqueta=playa"

# Álbumes y sus fotos
curl.exe http://localhost:3000/api/albumes
curl.exe http://localhost:3000/api/albumes/1/fotos

# Crear una foto
$foto = @{ titulo = 'Cerro'; calificacion = 4.5; ruta = 'https://picsum.photos/id/200/600/400' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/fotos -ContentType 'application/json' -Body $foto

# Actualizar y eliminar una foto: sustituir 1 por el id correspondiente
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/api/fotos/1 -ContentType 'application/json' -Body '{"calificacion":2}'
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/api/fotos/1

# Ejemplos de errores 400 y 404
curl.exe -i "http://localhost:3000/api/fotos?min=5&max=2"
curl.exe -i http://localhost:3000/api/fotos/abc
curl.exe -i http://localhost:3000/api/fotos/999999
```

## Pruebas de relaciones

Las capturas están en [Pruebas - Taller_NestJS-Backend-Relaciones.pdf](Pruebas%20-%20Taller_NestJS-Backend-Relaciones.pdf). El documento muestra las siguientes consultas sobre las relaciones de fotos con álbumes y etiquetas:

| Página | Consulta `GET` | Resultado mostrado |
| --- | --- | --- |
| 1 | `/api/fotos?min=3&max=5&page=1&limit=3` | Fotos con calificación entre 3 y 5, con tres resultados por página, su álbum y sus etiquetas |
| 2 | `/api/fotos?q=Foto%201` | Búsqueda parcial por título: coincide con `Foto 1` y con títulos como `Foto 10` |
| 2 | `/api/albumes/1/fotos` | Álbum con `id=1` y su colección de fotos, usando la relación de uno a muchos |
| 3 | `/api/fotos?min=abc` | Error `400` con el mensaje `Validation failed (numeric string is expected)` |
| 3 | `/api/fotos?etiqueta=playa` | Fotos asociadas a la etiqueta `playa`, usando la relación de muchos a muchos |
| 4 | `/api/fotos?orden=asc` | Fotos ordenadas de menor a mayor calificación |
| 4 | `/api/fotos?orden=desc` | Fotos ordenadas de mayor a menor calificación |
| 5 | `/api/fotos` | Primera página del listado, con el álbum y las etiquetas de cada foto |

Los listados de fotos devuelven `data`, `total`, `page` y `limit`; sin parámetros de paginación, se utiliza la página `1` con un límite de `10`. La consulta de fotos de un álbum devuelve el objeto del álbum con su colección `fotos`.

Para repetir estas consultas se necesita PostgreSQL con datos y la API en ejecución. Las calificaciones, la asignación de álbumes y las etiquetas del seed son aleatorias, y las fechas se generan al insertar los registros. Por eso, las consultas conservan el comportamiento y la estructura de respuesta de las capturas, pero los registros y los totales pueden variar según los datos de la base.

## Compilación, pruebas y formato

| Comando | Uso |
| --- | --- |
| `npm run build` | Compila el proyecto |
| `npm test` | Ejecuta las pruebas unitarias con Vitest |
| `npm run test:watch` | Ejecuta las pruebas en modo observación |
| `npm run test:cov` | Ejecuta las pruebas con cobertura |
| `npm run test:e2e` | Ejecuta el archivo de pruebas de extremo a extremo |
| `npm run lint` | Revisa el código con Oxlint y análisis de tipos |
| `npm run format` | Aplica Prettier a `src` y `test` |

La prueba unitaria actual comprueba el saludo del controlador de ejemplo, que no está registrado en `AppModule`. El archivo E2E conserva el caso inicial de `GET /` con ese saludo y requiere adaptación a las rutas actuales de la API y una conexión de pruebas antes de utilizarlo para validar fotos y álbumes.

## Autor

Proyecto desarrollado como práctica de Node.js, NestJS y PostgreSQL.
