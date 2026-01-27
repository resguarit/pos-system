# Deploy unificado de clientes

## Arquitectura del deploy

- **Backend:** se despliega **solo** con el workflow "Deploy backend - Todos los clientes" (`deploy-all-clients.yml`): un job con env `all-clients` (VPS1) y otro con env `heroedelwhisky` (VPS2). No hay deploy de backend por cliente en ese workflow.
- **Frontend:** se despliega **uno por uno** con el workflow de cada cliente (`deploy-client-heladitos`, `deploy-client-kioscoel11`, etc.). Cada uno usa su environment y así su `FEATURES_JSON`, `API_URL` y path de frontend.

Los workflows por cliente tienen el **job de backend deshabilitado temporalmente** (`if: false`) para usar solo el workflow "Deploy backend - Todos los clientes". Para volver a desplegar backend desde el workflow de un cliente, cambiá ese job a `if: ${{ github.event.inputs.deploy_backend != 'false' || github.event_name == 'push' }}` (o la condición que usaba antes) y quitá el comentario "Backend se despliega vía deploy-all-clients; deshabilitado temporalmente."

---

## Por qué los clientes quedaban en estados distintos

Cada cliente puede terminar en un estado distinto por:

1. **Código distinto**  
   Unos tenían `git pull` reciente, otros no. Si el script no hace `git pull` o falla (ej. llave SSH), ese cliente no recibe los últimos commits.

2. **Composer distinto**  
   Si el script no usa `--no-interaction` ni `--ignore-platform-req=ext-soap`, Composer puede:
   - Pedir "Continue as root?" y quedarse esperando.
   - Fallar cuando en el servidor no está instalada la extensión PHP `ext-soap` (requerida por `resguar/afip-sdk`).

3. **Migraciones distintas**  
   - **Duplicate entry (product_id, branch_id):** en `stocks` había filas duplicadas para el mismo producto/sucursal. La migración que agrega `UNIQUE(product_id, branch_id)` fallaba.  
     **Solución:** la migración ahora consolida duplicados (suma `current_stock`, deja una fila por (product_id, branch_id)) y luego crea el índice. Si el índice ya existe, no hace nada.

   - **Duplicate column service_type_id:** algún cliente tenía una migración antigua (ej. `2026_01_23_121109_add_service_type_id_to_client_services_table`) que agregaba la columna sin comprobar si ya existía.  
     **Solución:** se agregó esa migración al repo con lógica idempotente: solo agrega la columna si `!Schema::hasColumn('client_services','service_type_id')`.

4. **Servidor distinto**  
   Si un cliente está en otro VPS (ej. heroe en vps-4793092-x), puede que:
   - No tenga la misma llave SSH para `git pull`.
   - Tenga otro historial de migraciones (por eso el error de `service_type_id`).

## Cómo dejarlos todos iguales

### 1. Usar el mismo script de deploy en todos los clientes

Usá **un solo script** (por ejemplo `/root/deploy-all-clients.sh`) para todos los clientes y asegurate de que haga **exactamente** lo mismo en cada uno, en este orden:

1. `git pull origin master`
2. `composer install --no-dev --no-interaction --optimize-autoloader --ignore-platform-req=ext-soap`  
   (y `COMPOSER_ALLOW_SUPERUSER=1` si corrés como root, para que no pregunte “Continue as root?”)
3. `php artisan migrate --force`
4. `php artisan admin:grant-all-permissions --force` (si existe; `--force` evita que pida confirmación en scripts/CI)
5. `config:clear`, `cache:clear`, `route:clear`, `view:clear`

Lo importante: **mismo script** en todos los VPS y que Composer use **siempre** `--no-interaction` y `--ignore-platform-req=ext-soap` para que no falle por ext-soap ni se quede esperando input.

### 2. Requisitos en el servidor

- PHP 8.2 (o la versión que use el proyecto).
- Composer en el PATH.
- Opcional pero recomendado: extensión `ext-soap` para AFIP.  
  Si no está instalada, el script usa `--ignore-platform-req=ext-soap` para que Composer no falle; la app puede fallar luego al usar AFIP hasta instalar soap.

En Debian/Ubuntu:

```bash
sudo apt update
sudo apt install php8.2-soap
sudo systemctl restart php8.2-fpm   # si usas PHP-FPM
```

### 3. Git (llaves y remoto)

Para que `git pull` funcione en todos los clientes:

- Cada backend debe ser un clon del mismo repo (ej. `resguarit/pos-system`).
- El usuario que ejecuta el script debe poder hacer `git pull` (llave SSH o HTTPS con credenciales).
- Si en un VPS distinto da "Permission denied (publickey)", hay que configurar la llave SSH de ese servidor en GitHub (o usar otro método de autenticación).

### 4. Si algo sigue fallando

- **Migraciones "Duplicate entry" en otra tabla:** habría que hacer esa migración idempotente (consolidar duplicados o comprobar si el índice/columna ya existe) como en `add_unique_product_branch_to_stocks_table` y `add_service_type_id_to_client_services_table`.
- **Migraciones "Column already exists":** normalmente se resuelve con migraciones que usan `Schema::hasColumn()` antes de agregar la columna.
- **Composer "ext-soap missing":** usar siempre `--ignore-platform-req=ext-soap` en el script o instalar `php-soap` en el servidor.

Con el mismo script, mismo código (pull reciente) y migraciones idempotentes, todos los clientes quedan alineados tras cada deploy.

---

## Los 2 VPS

Hay **dos servidores**:

| VPS | Clientes | Environment en "deploy all" | Cómo se despliega en "deploy all" |
|-----|----------|-----------------------------|-----------------------------------|
| **VPS1** | Hela Ditos, Kiosco el 11, La Enriqueta, RG POS, Santiago y Francisco, Sistema Camping El Paraíso, etc. (todos los `api.*` en `/home`) | `all-clients` | Un job descarga y ejecuta `scripts/deploy-all-clients-server.sh` en el servidor; ese script recorre cada `api.*` y hace pull, composer, migrate. |
| **VPS2** | Solo **Heroe del Whisky** | `heroedelwhisky` | Un job aparte conecta por SSH al VPS de Heroe y hace pull, composer, migrate en la ruta de Heroe. |

En el workflow "Deploy backend - Todos los clientes" los dos jobs corren en paralelo: uno usa `environment: all-clients` (VPS1) y otro `environment: heroedelwhisky` (VPS2). Así se respetan los **environments distintos**: cada uno tiene sus propios secrets (host, usuario, clave, path) y no se mezclan.

---

## Environments: backend vs features del frontend

El "environment" en GitHub se usa para **dos cosas** distintas:

1. **Para el deploy del backend** (conexión SSH, script, migraciones):  
   En "deploy all" usamos **solo** `all-clients` (VPS1) y `heroedelwhisky` (VPS2). Con eso alcanza para actualizar el backend de todos.

2. **Para las features que se mapean en el frontend** (`VITE_FEATURES`, `VITE_API_URL`, path del frontend):  
   Eso viene del **environment de cada cliente** (heladitos, kioscoel11, enriqueta, rgposdemo, santiagoyfrancisco, sistemacampingelparaiso, dipag, heroedelwhisky). En cada uno tenés `CLIENT_X_FEATURES_JSON`, `CLIENT_X_API_URL`, `CLIENT_X_FRONTEND_DEPLOY_PATH`, etc. El frontend se construye con ese JSON y esa API, y se sube a la ruta de ese cliente.  
   Es decir: **cada cliente en el VPS donde están todos sigue teniendo su propio environment** para lo que ve en el frontend (features, URL, rutas). No se pierde eso por usar "deploy all" en backend.

Resumen:

| Uso del environment | VPS1 (todos) | VPS2 (Heroe) |
|---------------------|--------------|--------------|
| **Backend "deploy all"** | Un env: `all-clients` (VPS_HOST, SSH, etc.). Un mismo job actualiza todos los backends. | Un env: `heroedelwhisky` (CLIENT_HEROE_*, path backend). Ya sirve tal cual. |
| **Features / frontend por cliente** | Cada cliente mantiene **su** env: heladitos, kioscoel11, enriqueta, rgposdemo, santiagoyfrancisco, sistemacampingelparaiso, dipag. En cada uno: `CLIENT_X_FEATURES_JSON`, `CLIENT_X_API_URL`, `CLIENT_X_FRONTEND_DEPLOY_PATH`, y opcionalmente `CLIENT_X_VPS_*` si se usa para frontend. | Heroe usa el env `heroedelwhisky` para todo (backend + frontend); ese env ya tiene las features y paths de Heroe. |

**Resumen del flujo:**

- **Backend:** se despliega **solo** con "Deploy backend - Todos los clientes" (`deploy-all-clients.yml`): un job con env `all-clients` (VPS1) y otro con env `heroedelwhisky` (VPS2). No hay deploy de backend por cliente en ese workflow.
- **Frontend:** se despliega **uno por uno**, con el workflow de cada cliente (`deploy-client-heladitos`, `deploy-client-kioscoel11`, etc.). Cada uno usa su environment y así su `FEATURES_JSON`, `API_URL` y path de frontend.

---

## Deploy con GitHub Actions: "Deploy all" vs "Deploy por cliente"

### Workflow "Deploy backend - Todos los clientes" (`deploy-all-clients.yml`)

Una ejecución despliega el backend de **todos** los clientes en **los 2 VPS**:

1. **Job "Deploy VPS1 (todos menos Heroe)"** — environment `all-clients`: SSH al VPS1, descarga y ejecuta `scripts/deploy-all-clients-server.sh` (recorre `api.*` en `/home`).
2. **Job "Deploy Heroe (VPS2)"** — environment `heroedelwhisky`: SSH al VPS2, hace en la ruta de Heroe lo mismo (pull, composer, migrate, clears).

Se dispara en cada **push a `master`** (ignorando solo `docs/` y `*.md`) o con **workflow_dispatch**.

En **workflow_dispatch** podés elegir:
- **Omitir VPS1:** si solo querés actualizar Heroe (VPS2).
- **Omitir Heroe:** si solo querés actualizar los clientes del VPS1.

El workflow usa **concurrency** (`deploy-all-backend`) para evitar ejecuciones superpuestas, y **timeout** por job (VPS1: 25 min, Heroe: 12 min) para que no quede colgado.

### Pros y contras: "Deploy all" vs "Deploy por cliente"

Cada cliente tiene su propio workflow (`deploy-client-heladitos.yml`, `deploy-client-heroe.yml`, etc.) y su **environment** (heladitos, heroedelwhisky, rgposdemo, kioscoel11, etc.). El "deploy all" usa **dos** environments: `all-clients` (VPS1) y `heroedelwhisky` (VPS2).

| Aspecto | **Deploy por cliente** (un workflow por cliente) | **Deploy all** (un workflow, todos en una corrida) |
|--------|--------------------------------------------------|------------------------------------------------------|
| **Environments** | Un environment por cliente (heladitos, heroedelwhisky, kioscoel11, etc.). Secrets y protecciones por cliente. | Usa `all-clients` (VPS1) y `heroedelwhisky` (VPS2). No reemplaza los environments por cliente: los de VPS1 comparten un mismo servidor, por eso un solo env para ese VPS. |
| **Un solo push** | Se disparan **varios** workflows (uno por cliente con cambios en sus paths). Cada uno hace su deploy. | Se dispara **un** workflow con 2 jobs (VPS1 + Heroe). Una sola corrida para todos. |
| **Quién se actualiza** | Solo los clientes cuyo workflow se ejecutó (p. ej. si hay paths-ignore, solo los que “tocan” los archivos cambiados). | Siempre **todos** (VPS1 y Heroe). Mismo código y mismas migraciones para todos en cada push. |
| **Control fino** | Podés hacer "Run workflow" solo para un cliente (p. ej. Heroe) y elegir solo backend o solo frontend. | "Run workflow" despliega backend de todos. No hay “solo Heladitos” ni “solo frontend de Heroe” en este workflow. |
| **Protección / aprobación** | En cada environment podés poner required reviewers o reglas (p. ej. “solo para heroedelwhisky”). | En `all-clients` y `heroedelwhisky` podés poner reglas; si alguien no tiene acceso a `heroedelwhisky`, el job de Heroe no verá esos secrets. |
| **Frontend** | Cada workflow por cliente puede incluir build + deploy del frontend. | Este workflow **solo** hace backend. El frontend de cada cliente sigue siendo con su workflow propio (o script en el servidor). |
| **Errores** | Si falla uno, los demás no se afectan. | Si falla el job de VPS1, el de Heroe puede seguir (son jobs separados). Si falla Heroe, VPS1 ya terminó igual. |

En resumen: **"Deploy all"** sirve para dejar a todos alineados con el mismo backend tras cada push, usando 2 VPS y 2 environments (`all-clients` + `heroedelwhisky`). **"Deploy por cliente"** sigue siendo útil cuando querés desplegar solo un cliente o solo frontend, y cuando querés protecciones por environment.

### Cómo conseguir todo (environments y secrets)

Para que "Deploy backend - Todos los clientes" funcione necesitás **dos** environments. El de Heroe se llama **`heroedelwhisky`** (no `heroe`).

#### 1. Crear los environments en GitHub

1. Repo **resguarit/pos-system** → **Settings** → **Environments**.
2. **New environment** → nombre **`all-clients`** → **Configure environment** (o "Save protection rules" si no querés reglas).
3. **New environment** → nombre **`heroedelwhisky`** → **Configure environment**.

#### 2. Secrets del environment `all-clients` (VPS1)

Son los datos de SSH del servidor donde están Hela Ditos, Kiosco el 11, La Enriqueta, RG POS, etc. (los `api.*` en `/home`).

| Secret | Dónde conseguirlo | Ejemplo |
|--------|-------------------|--------|
| **VPS_HOST** | IP o dominio del VPS1. Si ya tenés el workflow de **heladitos**, **kioscoel11**, **enriqueta**, **rgpos** o **sistemacampingelparaiso**, entrá a **Settings → Environments → (ese cliente)** y mirá el valor de `CLIENT_*_VPS_HOST` — es el mismo servidor. | `123.45.67.89` o `vps.ejemplo.com` |
| **VPS_PORT** | Puerto SSH. Mismo que en el environment de heladitos/kioscoel11/etc.: `CLIENT_*_VPS_PORT`. | `22` |
| **VPS_USERNAME** | Usuario SSH. Mismo que en el environment de un cliente en VPS1: `CLIENT_*_VPS_USERNAME`. | `root` |
| **VPS_SSH_KEY** | Clave privada SSH del VPS1. La misma que usás en **heladitos**, **kioscoel11**, etc.: `CLIENT_*_VPS_SSH_KEY`. Copiá el contenido completo (desde `-----BEGIN ...` hasta `-----END ...`). **Para CI debe ser clave sin passphrase.** No pongas la clave en otro secret (ej. uno de "passphrase"); eso puede provocar errores como "this private key is passphrase protected". | Contenido del archivo `.pem` o clave que usás para SSH |

Cómo cargarlos: **Settings → Environments → all-clients → Add secret** (o "Environment secrets") y agregá **VPS_HOST**, **VPS_PORT**, **VPS_USERNAME**, **VPS_SSH_KEY**.

#### 3. Secrets del environment `heroedelwhisky` (VPS2)

Son los del VPS donde está **solo** Heroe del Whisky. Si ya usás el workflow de Heroe, esos secrets ya están en el environment **heroedelwhisky**; solo verificá que el environment se llame exactamente `heroedelwhisky`.

| Secret | Descripción |
|--------|-------------|
| **CLIENT_HEROE_VPS_HOST** | Host o IP del VPS2 (Heroe). |
| **CLIENT_HEROE_VPS_PORT** | Puerto SSH (ej. 22). |
| **CLIENT_HEROE_VPS_USERNAME** | Usuario SSH. |
| **CLIENT_HEROE_VPS_SSH_KEY** | Clave privada SSH del VPS2. Debe ser clave sin passphrase para CI. |
| **CLIENT_HEROE_BACKEND_DEPLOY_PATH** | Ruta en el servidor a la raíz del repo (ej. `/home/heroe/public_html` o donde esté el backend de Heroe). |

Cómo conseguirlos si todavía no existen: conectate por SSH al VPS de Heroe, anotá host, puerto, usuario y la ruta donde está el repo; la clave es la que usás para esa conexión. Luego **Settings → Environments → heroedelwhisky → Add secret** y cargá los cinco.

#### 4. Resumen

- **`all-clients`**: 4 secrets → `VPS_HOST`, `VPS_PORT`, `VPS_USERNAME`, `VPS_SSH_KEY` (clave sin passphrase). Los podés copiar del environment de **heladitos**, **kioscoel11**, **enriqueta**, **rgpos** o **sistemacampingelparaiso**, porque comparten el mismo VPS.
- **`heroedelwhisky`**: 5 secrets → `CLIENT_HEROE_VPS_HOST`, `CLIENT_HEROE_VPS_PORT`, `CLIENT_HEROE_VPS_USERNAME`, `CLIENT_HEROE_VPS_SSH_KEY` (sin passphrase), `CLIENT_HEROE_BACKEND_DEPLOY_PATH`. Si ya tenés el workflow de Heroe desplegando, ese environment ya existe y solo hay que asegurarse de que se llame `heroedelwhisky`.

### Configuración de "Deploy all" (referencia)

Necesitás **dos** environments con sus secrets:

1. **Environment `all-clients`** (VPS1, donde están los `api.*`):
   - `VPS_HOST`, `VPS_PORT`, `VPS_USERNAME`, `VPS_SSH_KEY` (clave privada sin passphrase).

2. **Environment `heroedelwhisky`** (VPS2, solo Heroe):
   - `CLIENT_HEROE_VPS_HOST`, `CLIENT_HEROE_VPS_PORT`, `CLIENT_HEROE_VPS_USERNAME`, `CLIENT_HEROE_VPS_SSH_KEY` (sin passphrase), `CLIENT_HEROE_BACKEND_DEPLOY_PATH`.

Si el repo es **privado**, la descarga del script por `curl` desde `raw.githubusercontent.com` puede fallar en el job de VPS1. En ese caso conviene cambiar el workflow para hacer checkout y subir el script con `appleboy/scp-action`.

### Errores frecuentes y qué hacer

| Mensaje o comportamiento | Causa probable | Qué hacer |
|--------------------------|----------------|-----------|
| **`ssh: this private key is passphrase protected`** | La clave en `VPS_SSH_KEY` (o `CLIENT_HEROE_VPS_SSH_KEY`) tiene passphrase, o hay un secret equivocado (ej. uno de “passphrase” donde pegaste la clave por error). Los workflows no usan passphrase. | Usar clave **sin passphrase** en el secret de la key: generar una solo para CI (`ssh-keygen -t ed25519 -f ~/.ssh/pos_deploy -N ""`), subir la pública al VPS en `~/.ssh/authorized_keys` y poner la privada en **VPS_SSH_KEY** / **CLIENT_HEROE_VPS_SSH_KEY**. Revisar que no exista un secret tipo “passphrase” con la clave pegada por error. |
| **`dial tcp <IP>:<port>: i/o timeout`** | Los runners de GitHub (Azure) no alcanzan el puerto SSH del VPS: firewall, security group o red que solo permite ciertas IPs. | En el VPS (o en el panel del proveedor): permitir SSH (puerto 22 o el que uses) desde las IPs de GitHub Actions o, si el entorno lo permite, desde `0.0.0.0/0`. Revisar también que **VPS_HOST** / **CLIENT_HEROE_VPS_HOST** y **VPS_PORT** / **CLIENT_HEROE_VPS_PORT** sean correctos en el environment. |

### Por qué unos clientes bajaban mucho código y otros no

Cada carpeta `api.*` es un **clon de git distinto**. Cuando se ejecuta el script (por GitHub Actions o por `/root/deploy-all-clients.sh` en el servidor):

- Los que ya estaban al día dan "Already up to date" y "Nothing to migrate".
- El que estaba atrás en commits hace `git pull`, descarga los cambios nuevos y corre las migraciones pendientes.

No es que el script trate a unos distinto que a otros: es que el **estado inicial** de cada cliente era distinto. Con el workflow "deploy all" disparado en cada push, todos se actualizan en la misma corrida y terminan alineados.

### Actualizar el script cuando se ejecuta a mano en el servidor

Si en el VPS querés ejecutar **la última versión** del script del repo:

```bash
curl -sfL "https://raw.githubusercontent.com/resguarit/pos-system/master/scripts/deploy-all-clients-server.sh" -o /tmp/deploy-all-clients-server.sh
chmod +x /tmp/deploy-all-clients-server.sh
/tmp/deploy-all-clients-server.sh
```

`-sfL` en `curl`: silencia progress, falla en HTTP 4xx/5xx, sigue redirects. Si el repo es **privado**, no podrás usar `raw.githubusercontent.com` sin token; en ese caso ejecutá el script desde una carpeta clonada: `./scripts/deploy-all-clients-server.sh` desde la raíz del repo. El workflow "Deploy backend - Todos los clientes" ya descarga y ejecuta ese script en cada run, así que al disparar el workflow tenés siempre la versión del repo.

### Buenas prácticas usadas en el enfoque

| Ámbito | Práctica |
|--------|----------|
| **Workflow** | Concurrency para evitar runs superpuestos; timeout por job; `workflow_dispatch` con opciones (omitir VPS1 o Heroe); un job por VPS y environment por servidor. |
| **Script** | `set -e`; rutas con `readonly`; funciones `discover_backend_path` y `deploy_one_client` para claridad y reutilo; exit 1 si falla algún cliente; no se tragan errores de composer ni migrate. |
| **Environments** | Backend: solo `all-clients` (VPS1) y `heroedelwhisky` (VPS2). Frontend: un environment por cliente con su `FEATURES_JSON` y paths. |
