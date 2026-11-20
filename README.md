# Álbum de Fotos API con NestJS y PostgreSQL

Desarrollo de una API REST utilizando Node.js y NestJS para la gestión de un álbum de fotos, con los datos guardados en una base de datos PostgreSQL.

El proyecto implementa un servidor HTTP organizado en módulos, controladores y servicios, que expone un CRUD completo con rutas para listar, consultar, crear, actualizar y eliminar fotos, respondiendo siempre en formato JSON con los códigos de estado HTTP correspondientes. A diferencia de la versión anterior, donde las fotos vivían en un arreglo en memoria, ahora se guardan en la tabla `fotos` de PostgreSQL usando TypeORM, por lo que los datos se conservan aunque el servidor se reinicie.

## Tecnologías utilizadas

- **Node.js** como entorno de ejecución de JavaScript del lado del servidor.
- **NestJS 12** para la creación del servidor, la definición de módulos, controladores y servicios, y la inyección de dependencias.
- **TypeScript 6** para tipar las entidades, los parámetros y las respuestas.
- **PostgreSQL** como base de datos donde se guardan las fotos.
- **TypeORM** junto con `@nestjs/typeorm` para mapear la clase `Foto` a una tabla y trabajar con ella mediante un repositorio.
- **pg** como controlador que conecta Node.js con PostgreSQL.
- **ES Modules** (`"type": "module"`), por lo que las importaciones relativas terminan en `.js`.
- **Nest CLI** (`nest start --watch`) para reiniciar el servidor automáticamente al guardar cambios.
- **curl** para probar las rutas de la API desde la terminal.

## Estructura del proyecto

```text
backend/
├─ src/
│  ├─ fotos/
│  │  ├─ entities/
│  │  │  └─ foto.entity.ts      # Entidad Foto: define la tabla "fotos" y sus columnas
│  │  ├─ fotos.controller.ts    # Define las rutas /fotos y recibe las peticiones
│  │  ├─ fotos.service.ts       # Lógica del negocio usando el repositorio de TypeORM
│  │  └─ fotos.module.ts        # Registra la entidad, el controlador y el servicio
│  │
│  ├─ app.module.ts             # Módulo raíz: conexión a PostgreSQL e importa FotosModule
│  ├─ main.ts                   # Crea la app, define el prefijo /api e inicia el servidor
│  └─ seed.ts                   # Script que llena la tabla con 10 fotos de ejemplo
│
├─ nest-cli.json                # Configuración del Nest CLI
├─ tsconfig.json                # Configuración de TypeScript
├─ tsconfig.build.json          # Configuración de TypeScript para compilar
├─ package.json                 # Dependencias y scripts del proyecto
└─ .gitignore                   # Excluye node_modules, dist y .env del repositorio
```

## Rutas de la API

| Método   | Ruta             | Descripción                        | Respuestas posibles |
| -------- | ---------------- | ---------------------------------- | ------------------- |
| `GET`    | `/api/fotos`     | Lista todas las fotos ordenadas por `id` | `200`         |
| `GET`    | `/api/fotos/:id` | Obtiene una foto por su `id`       | `200`, `400`, `404` |
| `POST`   | `/api/fotos`     | Crea una nueva foto                | `201`               |
| `PATCH`  | `/api/fotos/:id` | Actualiza solo los campos enviados | `200`, `400`, `404` |
| `DELETE` | `/api/fotos/:id` | Elimina una foto                   | `204`, `400`, `404` |

Cada foto tiene la siguiente forma:

```json
{
  "id": 1,
  "titulo": "Foto 1",
  "descripcion": "Descripción de la foto 1",
  "calificacion": 4.3,
  "ruta": "https://picsum.photos/id/10/600/400",
  "fotografo": null,
  "creadoEn": "2026-11-19T19:30:00.000Z",
  "actualizadoEn": "2026-11-19T19:30:00.000Z"
}
```

## Qué hice en el proyecto

### Parte 1: proyecto base

- **Creación del proyecto:**

  Se generó el proyecto con el Nest CLI. El proyecto trabaja con ES Modules, por lo que todas las importaciones relativas usan la extensión `.js` aunque los archivos sean `.ts`.

- **Prefijo global:**

  En `src/main.ts` se creó la aplicación con `NestFactory.create(AppModule)` y se agregó `app.setGlobalPrefix('api')`, de modo que todas las rutas comienzan con `/api`. El servidor escucha en el puerto definido por la variable de entorno `PORT`, o en el `3000` si no existe.

- **Limpieza del módulo raíz:**

  `AppModule` ya no usa el controlador ni el servicio de ejemplo que trae el proyecto. Solo configura la conexión a la base de datos e importa `FotosModule`.

### Parte 2: conexión a PostgreSQL

- **Dependencias:**

  Se instalaron `@nestjs/typeorm`, `typeorm` y `pg`.

- **Configuración:**

  En `app.module.ts` se agregó `TypeOrmModule.forRoot()` con el tipo `postgres`, el host `localhost`, el puerto `5432`, el usuario, la contraseña y la base de datos `album`.

  - `autoLoadEntities: true` registra automáticamente las entidades que cada módulo declara con `forFeature`, sin tener que listarlas a mano.
  - `synchronize: true` hace que TypeORM cree o modifique la tabla según la entidad al iniciar el servidor. Es cómodo en desarrollo, pero no se debe usar en producción porque puede borrar datos.

### Parte 3: entidad Foto

- **De interfaz a clase:**

  En `entities/foto.entity.ts`, `Foto` dejó de ser una interfaz y pasó a ser una clase marcada con `@Entity('fotos')`, ya que TypeORM necesita una clase que exista en tiempo de ejecución para leer sus decoradores.

- **Columnas:**

  - `id` con `@PrimaryGeneratedColumn()`: la base de datos genera el número automáticamente.
  - `titulo` con `@Column({ length: 100 })`.
  - `descripcion` de tipo `text` y opcional (`nullable: true`).
  - `calificacion` de tipo `real`, con valor por defecto `0`, para aceptar decimales como `4.5`.
  - `ruta` con la URL de la imagen.
  - `fotografo` de tipo `text` y opcional.
  - `creadoEn` con `@CreateDateColumn()` y `actualizadoEn` con `@UpdateDateColumn()`: TypeORM llena estas fechas solo al crear y al modificar.

- **Módulo:**

  `FotosModule` importa `TypeOrmModule.forFeature([Foto])`, que deja disponible el repositorio de `Foto` para inyectarlo en el servicio. También registra a `FotosController` y a `FotosService`, y exporta el servicio.

### Parte 4: servicio con repositorio

- **Inyección del repositorio:**

  `FotosService` recibe el repositorio por el constructor con `@InjectRepository(Foto)`. Ya no existe el arreglo en memoria: todas las operaciones van a la base de datos.

- **Métodos:**

  Como consultar la base de datos toma tiempo, todos los métodos devuelven una `Promise`.

  - `findAll()` usa `find({ order: { id: 'ASC' } })` para devolver las fotos ordenadas por `id`.
  - `findOne(id)` usa `findOneBy({ id })`. Si no existe, lanza `NotFoundException` con el mensaje `Foto X no encontrada`, y Nest la convierte en una respuesta `404`.
  - `create(datos)` arma la entidad con `create()` y la guarda con `save()`. El `id` y las fechas los pone la base de datos, así que ya no hace falta calcular el `id` a mano.
  - `update(id, datos)` primero llama a `findOne(id)` (si no existe sale el `404`), copia los campos enviados con `Object.assign` y guarda con `save()`.
  - `remove(id)` también reutiliza `findOne(id)` para el `404` y luego borra la foto con `remove()`.

### Parte 5: controlador

- **Rutas:**

  `FotosController` usa `@Controller('fotos')` y recibe el servicio por el constructor. Define `@Get()` para listar, `@Get(':id')` para consultar una foto, `@Post()` para crear, `@Patch(':id')` para actualizar y `@Delete(':id')` para eliminar, tomando el cuerpo con `@Body()` como `Partial<Foto>`.

- **Validación del parámetro:**

  El `id` se lee con `@Param('id', ParseIntPipe)`. El *pipe* convierte el texto de la URL a número y, si no es un entero, responde `400` con el mensaje `Validation failed (numeric string is expected)` sin llegar a ejecutar el método.

- **Códigos de estado:**

  Nest responde `200` en los `GET` y `PATCH` y `201` en el `POST` sin necesidad de indicarlo. El `DELETE` responde `204 No Content` gracias a `@HttpCode(HttpStatus.NO_CONTENT)`.

### Parte 6: datos de ejemplo (seed)

Se creó `src/seed.ts`, un script que levanta la aplicación con `NestFactory.createApplicationContext(AppModule)` (sin abrir el servidor HTTP), obtiene el repositorio de `Foto` desde el `DataSource`, vacía la tabla con `clear()` e inserta 10 fotos de ejemplo. Cada una tiene una calificación aleatoria entre `0.0` y `5.0` y una imagen de `picsum.photos`.

Se ejecuta con el script agregado en `package.json`:

```bash
npm run seed
```

> Al vaciar la tabla se borran todas las fotos existentes, así que solo se debe usar para reiniciar los datos de prueba.

### Parte 7: persistencia de los datos

En la versión anterior, al reiniciar el servidor la lista volvía a las fotos iniciales. Ahora las fotos creadas, modificadas o eliminadas quedan guardadas en PostgreSQL y siguen ahí después de reiniciar.

### Verificación del funcionamiento

Con PostgreSQL y el servidor en ejecución, se probaron las rutas desde PowerShell usando `curl.exe`:

```powershell
# Listar todas las fotos -> 200
curl.exe -s -w " -> %{http_code}\n" http://localhost:3000/api/fotos

# Foto que no existe -> 404
curl.exe -s -w " -> %{http_code}\n" http://localhost:3000/api/fotos/99

# Id que no es número -> 400
curl.exe -s -w " -> %{http_code}\n" http://localhost:3000/api/fotos/abc

# Crear una foto -> 201
curl.exe --% -s -w " -> %{http_code}\n" -X POST -H "Content-Type: application/json" -d "{\"titulo\":\"Cerro\",\"calificacion\":4.5,\"ruta\":\"https://picsum.photos/id/200/600/400\"}" http://localhost:3000/api/fotos

# Actualizar solo la calificación de la foto 1 -> 200
curl.exe --% -s -w " -> %{http_code}\n" -X PATCH -H "Content-Type: application/json" -d "{\"calificacion\":2}" http://localhost:3000/api/fotos/1

# Actualizar una foto que no existe -> 404
curl.exe --% -s -w " -> %{http_code}\n" -X PATCH -H "Content-Type: application/json" -d "{\"titulo\":\"Nuevo\"}" http://localhost:3000/api/fotos/99

# Eliminar la foto 2 -> 204
curl.exe -s -w " -> %{http_code}\n" -X DELETE http://localhost:3000/api/fotos/2

# Eliminar otra vez la foto 2 -> 404
curl.exe -s -w " -> %{http_code}\n" -X DELETE http://localhost:3000/api/fotos/2
```

> En PowerShell se usa `curl.exe` en lugar de `curl`, y `--%` en las peticiones con cuerpo JSON para que las comillas lleguen intactas.

Las rutas `GET` también se pueden abrir directamente en el navegador.

## Ejecución del proyecto

Con Node.js, npm y PostgreSQL instalados:

1. Crear la base de datos `album` en PostgreSQL:

   ```sql
   CREATE DATABASE album;
   ```

2. Revisar en `src/app.module.ts` que el usuario y la contraseña coincidan con los de tu PostgreSQL.

3. Instalar las dependencias:

   ```bash
   npm install
   ```

4. (Opcional) Cargar las 10 fotos de ejemplo:

   ```bash
   npm run seed
   ```

5. Iniciar el servidor de desarrollo:

   ```bash
   npm run start:dev
   ```

La API queda disponible en:

```text
http://localhost:3000/api/fotos
```

La terminal debe permanecer abierta mientras se utiliza la API.

> La raíz `http://localhost:3000/` responde `404`, ya que no tiene una ruta definida. Las rutas de la API comienzan con `/api`.

> La tabla `fotos` se crea sola al iniciar el servidor gracias a `synchronize: true`.

## Autor

Proyecto desarrollado como práctica de Node.js, NestJS y PostgreSQL.
