# Registrar la mesa de ayuda en Microsoft Entra ID

La mesa no guarda contraseñas: delega el inicio de sesión en la cuenta
corporativa. Este registro lo hace una persona con permiso de administrador de
aplicaciones en el tenant de Cofinet. Toma unos diez minutos.

## 1. Crear el registro de aplicación

1. Entrar al [portal de Entra ID](https://entra.microsoft.com) →
   **Aplicaciones** → **Registros de aplicaciones** → **Nuevo registro**.
2. Nombre: `Mesa de ayuda · Datos y TI`.
3. Tipos de cuenta admitidos: **Solo cuentas de este directorio organizativo**.
4. URI de redirección: tipo **Web**, valor
   `https://mesadeayuda.cofinet.local/api/auth/callback`
   (la misma URL con la que la gente abrirá la mesa, con `/api/auth/callback`
   al final; en pruebas locales, `http://localhost:3000/api/auth/callback`).
5. **Registrar**.

De la pantalla de resumen se copian dos valores al archivo `.env`:

| Portal | Variable |
| --- | --- |
| Id. de aplicación (cliente) | `ENTRA_CLIENT_ID` |
| Id. de directorio (inquilino) | `ENTRA_TENANT_ID` |

## 2. Generar el secreto de cliente

1. **Certificados y secretos** → **Nuevo secreto de cliente**.
2. Descripción: `Mesa de ayuda`. Vigencia: la que permita la política interna
   (conviene 24 meses y dejar recordatorio de renovación).
3. Copiar el **Valor** apenas se genere — después ya no se puede ver — y
   guardarlo en `ENTRA_CLIENT_SECRET`.

> Cuando el secreto expira, nadie puede iniciar sesión. Conviene agendar la
> renovación un mes antes de la fecha de vencimiento.

## 3. Permisos y datos que se piden

En **Permisos de API** basta con los que trae por defecto:
`openid`, `profile`, `email` (Microsoft Graph, permisos delegados). La mesa no
pide acceso a correo, archivos ni calendario.

Si el `id_token` no trae el correo, en **Configuración de token** →
**Agregar notificación opcional** → tipo **ID** → marcar `email` y `upn`.

## 4. Quién entra y con qué rol

El rol se define por correo en el archivo `.env` del servidor:

```bash
ADMIN_EMAILS=juan.garcia@cofinet.com.au
AGENT_EMAILS=analista1@cofinet.com.au,analista2@cofinet.com.au
ALLOWED_EMAIL_DOMAINS=cofinet.com.au
```

- Quien esté en `ADMIN_EMAILS` administra áreas, categorías, usuarios y
  acuerdos de tiempo.
- Quien esté en `AGENT_EMAILS` es el equipo de Datos y TI: gestiona tickets y
  ve el tablero.
- Cualquier otra persona del dominio entra como **solicitante** y se crea sola
  en su primer inicio de sesión.

Los roles se aplican en cada inicio de sesión: sacar un correo de la lista le
baja el rol la próxima vez que entre. El área de cada persona se asigna desde
**Administración → Usuarios** dentro de la mesa.

Si se prefiere que nadie entre sin alta previa, poner
`AUTH_AUTO_PROVISION=false` y crear los usuarios desde la administración.

## 5. Comprobación

Antes de abrirla a la gente, con los tres valores ya en el archivo `.env`:

```bash
npm run verificar
```

Comprueba contra los servicios reales que el inquilino responde, que la
aplicación existe y que el secreto sirve (además de la base de datos y el
correo saliente). Lo que **no** puede comprobar es la URI de redirección:
Entra ID solo la valida cuando alguien inicia sesión de verdad. Por eso el
último paso es entrar:

1. Abrir la URL de la mesa en una ventana privada.
2. **Entrar con la cuenta de Cofinet** → autenticarse.
3. Debe caer en el panel con el nombre y el rol correctos.

Si algo falla, el mensaje de error aparece arriba del botón de inicio de
sesión. Los más comunes:

| Mensaje | Causa |
| --- | --- |
| `AADSTS50011: redirect URI mismatch` | La URI de redirección del portal no coincide con `APP_URL` |
| `AADSTS7000215: invalid client secret` | El secreto expiró o se copió el Id. en vez del Valor |
| `Tu cuenta no pertenece a un dominio autorizado` | Falta el dominio en `ALLOWED_EMAIL_DOMAINS` |
| `La cuenta no expone un correo electrónico` | Falta la notificación opcional `email` (paso 3) |
