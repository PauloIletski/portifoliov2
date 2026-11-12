# Portfoliov2

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.26.

## Development server

### Windows (PowerShell)

Install dependencies using `npm.cmd ci`. Run `npm.cmd start` for the development server, `npm.cmd run build` for the production build, and `npm.cmd test -- --watch=false` for unit tests.

For both language versions, run `npm.cmd run dev` and open `http://127.0.0.1:8080/` or `http://127.0.0.1:8080/en/`. To preview an existing build, run `npm.cmd run preview`. The preview server uses Node.js and supports direct access to application routes.

To start a local development server, run:

```powershell
npm.cmd start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Dados e administração

Consulte [docs/mongodb.md](docs/mongodb.md) para configurar MongoDB Atlas, Better Auth, Vercel Blob e Resend, migrar os dados e provisionar o administrador. O painel está em `/admin/login`. As credenciais ficam no backend. O schema Supabase anterior permanece documentado em `supabase/`.
