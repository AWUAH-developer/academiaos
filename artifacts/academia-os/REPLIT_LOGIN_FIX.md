# Replit login fix

AcademiaOS does not use Replit Auth, OAuth, Clerk, or a Replit-account sign-in. It uses its own database-backed username and password form.

## Why the Replit sign-in page appeared

Replit adds its own login screen outside the application when the published app access is set to **Workspace only** or **Only you**. Source code cannot disable that platform access screen.

Open the Replit Publishing pane, choose **Edit commands and secrets**, set **Access** to **Public**, and publish again. This removes the Replit-account authentication screen. AcademiaOS will then open directly on its own username and password page.

Do not confuse making the deployment public with making school records public. The deployment URL becomes reachable, but every portal page still requires an AcademiaOS session and role permission.

## Working demo login

For an isolated test database only, add this Published App Secret before publishing:

```text
ACADEMIAOS_DEMO_MODE=true
```

The deployment build will create or refresh the demo users automatically. Then sign in directly at the app address with:

```text
Username: admin
Password: ChangeMe123!
```

or:

```text
Username: proprietor
Password: ChangeMe123!
```

Remove `ACADEMIAOS_DEMO_MODE` and replace the demonstration database before storing real school information.

## Real production login

Leave `ACADEMIAOS_DEMO_MODE=false` and add the five `INITIAL_SUPER_ADMIN_*` secrets. The deployment build creates the first local administrator automatically when the database has no users. After the first successful publish, delete `INITIAL_SUPER_ADMIN_PASSWORD` from Replit secrets.

The root address `/` now displays the AcademiaOS username/password form directly. `/login` remains only as a compatible alias. There is no initial redirect from `/` to `/login`.
