# Carpintero

Diseño paramétrico de muebles a medida (closets, cómodas, mesas auxiliares…)
con generación automática de lista de corte, presupuesto y exportación para
taller/CNC. Clon mejorado de [madera.app](https://madera.app), pensado para
carpinteros, makers y estudios de mueblería en Latinoamérica (español,
unidades métricas).

## Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4.
- **UI**: componentes propios estilo shadcn/ui (Radix UI + `class-variance-authority`
  + Tailwind) — el CLI de `shadcn` no pudo ejecutarse en el sandbox de
  desarrollo por restricciones de red, así que los componentes base
  (`src/components/ui/*`) están escritos a mano sobre los mismos primitivos
  de Radix; el resultado es equivalente.
- **3D**: React Three Fiber + drei (vistas sólida, abierta y explosionada,
  orbit controls, gizmo de ejes).
- **2D**: SVG generado programáticamente (sin canvas), tanto para el editor
  interactivo como para exportar/mostrar miniaturas.
- **Backend**: Supabase (Postgres + Auth + Row Level Security).
- **Estado del editor**: Zustand + un motor de cálculo puro y memoizado
  (`src/lib/design-engine/*`) que traduce el árbol de columnas/módulos →
  piezas 3D → lista de corte → presupuesto. Ese motor tiene cobertura de
  tests unitarios (Vitest).
- **Export**: CSV y XLSX (`exceljs`, no `xlsx`/SheetJS — esa librería tiene
  CVEs de prototype pollution/ReDoS sin parchear) para la lista de corte;
  SVG y DXF (escritor propio, sin dependencias) para piezas individuales y
  para el layout de corte optimizado.

## Estructura del motor de diseño

Todo vive bajo `src/lib/design-engine/`, y son funciones puras sin
dependencias de React ni de Supabase — se pueden testear en aislamiento:

- `types.ts` — modelo de datos (`Design`, `Column`, `Module`, `GlobalParams`).
- `panels.ts` — traduce el árbol de diseño a una lista plana de "piezas"
  (`PanelPiece`) ya posicionadas en 3D (paneles laterales, trasero, estantes,
  cajones, puertas, barral, patas, molduras…).
- `cutlist.ts` — agrupa esas piezas en filas de la lista de corte
  (`B1`, `B2`… `D1`… `O1`…, agrupadas por familia de pieza).
- `layout2d.ts` — el layout del alzado frontal (posiciones x/y de columnas y
  módulos) que usa el editor 2D.
- `geometry3d.ts` — agrega a cada pieza las transformaciones para los 3
  modos de vista (sólido / abierto / explosionado).
- `budget.ts`, `materials.ts` — costeo según material asignado (por
  proyecto, columna o módulo) + un campo manual de herrajes/otros costos.
- `nesting.ts` — empaquetado *first-fit-decreasing* de las piezas en
  planchas estándar (nº de planchas necesarias + % de desperdicio).
- `export/` — CSV, XLSX, SVG y DXF.
- `templates.ts` — las 4 plantillas semilla (Closet, Closet doble, Cómoda,
  Mesa auxiliar), equivalentes a las demos del producto original.

## Requisitos

- Node.js 20+
- Un proyecto de Supabase (puedes crear uno gratis en <https://supabase.com>)

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y completa las credenciales de tu
   proyecto Supabase (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-o-publishable-key
   NEXT_PUBLIC_DEFAULT_CURRENCY=CLP
   ```

3. Aplica el esquema de base de datos. El SQL completo (tablas + Row Level
   Security) está documentado en `supabase/schema.sql` — pégalo en el SQL
   Editor de tu proyecto Supabase, o aplícalo con la CLI de Supabase:

   ```bash
   supabase db push
   ```

   > Si vas a compartir un mismo proyecto Supabase entre varias apps, todas
   > las tablas de esta app están prefijadas `carpintero_` para evitar
   > choques de nombres con otras apps en el mismo proyecto.

4. En **Authentication → Providers**, habilita Email y (opcional) Google
   OAuth. En **Authentication → URL Configuration**, agrega
   `http://localhost:3000/auth/callback` (y la URL de producción) como
   redirect URL permitida.

5. Corre el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000> — te redirige a `/login`.

## Tests

### Unitarios (motor de diseño)

```bash
npm test          # una sola corrida
npm run test:watch
```

Cubren: columnas con múltiples módulos, el tipo `multiple` (repetición y
agrupación de cantidades), agrupación del cutlist por familia/dimensión,
cálculo de presupuesto (material por defecto, override por columna, costo
extra manual), nesting (empaquetado, planchas necesarias, piezas que no
caben), layout 2D y las 4 plantillas semilla.

### End-to-end (Playwright)

```bash
npm run e2e
```

Hay 2 flujos cubiertos en `e2e/`:

1. Crear proyecto → agregar columna y módulo → ver el cutlist actualizado.
2. Publicar un proyecto → verlo desde su link público de solo lectura.

Estos tests crean un usuario nuevo por corrida contra tu proyecto Supabase
real, así que **necesitan**:

- Que `.env.local` apunte a un proyecto Supabase alcanzable por red desde
  donde corras los tests.
- Que ese proyecto tenga la confirmación de email desactivada para signups
  (Authentication → Providers → Email → "Confirm email" apagado), o que uses
  un proyecto dedicado a pruebas — si no, el login después del signup
  fallará porque la cuenta queda sin confirmar.

> Nota: estos e2e no se pudieron ejecutar dentro del sandbox donde se
> desarrolló este proyecto — la política de red del entorno de desarrollo
> bloquea las llamadas salientes a `*.supabase.co` desde el navegador/Node
> (no es un bug de la app; herramientas de servidor como el MCP de Supabase
> sí tienen su propio camino de red). Se validaron con `npx playwright test
> --list` (los 2 tests se listan correctamente) y quedan listos para correr
> en cualquier entorno sin esa restricción (tu máquina, CI, etc.).

## Build de producción

```bash
npm run build
npm start
```

## Deploy

- **Frontend → Vercel**: importa el repo, configura `NEXT_PUBLIC_SUPABASE_URL`
  y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como variables de entorno del proyecto,
  y agrega la URL de producción a las redirect URLs de Supabase Auth
  (`https://tu-dominio.vercel.app/auth/callback`).
- **Backend → Supabase Cloud**: el proyecto ya corre en la nube por
  definición; solo asegúrate de aplicar `supabase/schema.sql` ahí también
  si usas un proyecto distinto al de desarrollo.

## Decisiones y simplificaciones (léelo antes de reportar un "bug")

- **Autosave vs. versiones**: cada cambio en el editor se autoguarda
  (debounce ~800ms) sobre la versión actual — no genera una fila nueva en
  `carpintero_project_versions` en cada tecla. Una versión nueva (para el
  historial) solo se crea con "Guardar versión" o al restaurar una versión
  anterior, tal como pide el enunciado ("restaurar crea una versión nueva a
  partir de la antigua, no destruye historial").
- **Modelo de piezas**: cada columna siempre genera 2 laterales, 1 fondo,
  y una tapa superior/inferior fijos, independientemente de los módulos que
  contenga (así se cierra el "cajón" físico del mueble); cada módulo aporta
  además sus propias piezas según su tipo (estante, cajón, puertas, barral,
  patas, molduras). Es una simplificación razonable frente al mueble real
  pero mantiene el cutlist consistente y testeable.
- **Precios de materiales**: el catálogo semilla (`SEED_MATERIALS` en
  `src/lib/design-engine/materials.ts`) trae precios de referencia en CLP —
  son valores de ejemplo, edítalos libremente desde `/materiales`.
- **Nesting**: algoritmo *first-fit-decreasing* por "estantes" (shelves), no
  un empaquetador guillotina óptimo — suficiente para estimar planchas
  necesarias y % de desperdicio, no para producción CNC final sin revisión.
- **`exceljs` vs `xlsx`**: se usó `exceljs` para exportar XLSX en vez del
  paquete `xlsx` (SheetJS) que pide el ecosistema por defecto, porque la
  versión de npm de `xlsx` tiene vulnerabilidades de prototype pollution y
  ReDoS sin parche disponible.
- **`thumbnail_svg` y RLS**: la miniatura de cada proyecto se guarda como
  string SVG y se renderiza con `dangerouslySetInnerHTML` en el dashboard.
  La app siempre la genera desde `design_json` (nunca desde texto libre),
  pero como la política RLS le permite al dueño actualizar cualquier columna
  de su propia fila, en teoría podría escribir HTML arbitrario ahí llamando
  a la API de Supabase directamente (no desde la UI). El radio de impacto
  está acotado a la propia cuenta del atacante — nadie más ve el
  `thumbnail_svg` de un proyecto ajeno — así que se dejó así por ahora; si
  en el futuro se muestran miniaturas de otros usuarios (p. ej. en una
  vitrina pública de proyectos), hay que sanitizar ese campo o dejar de
  confiar en él y regenerar el SVG en cada lectura.
