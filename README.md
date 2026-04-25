# Calendar App

Aplicación web que muestra un calendario de días hábiles con festivos por país, desplegada en AWS EKS.

---

## Arquitectura

```text
┌─────────────────────────────────────────────────────────────────┐
│                          Usuario                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AWS — us-east-1                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  VPC  10.0.0.0/16                                        │   │
│  │                                                          │   │
│  │  ┌─────────────┐      ┌─────────────┐                   │   │
│  │  │ Public AZ-a │      │ Public AZ-b │                   │   │
│  │  │ 10.0.1.0/24 │      │ 10.0.2.0/24 │                   │   │
│  │  │  IGW / NLB  │      │     IGW     │                   │   │
│  │  └──────┬──────┘      └─────────────┘                   │   │
│  │         │ NAT Gateway                                    │   │
│  │  ┌──────▼──────┐      ┌─────────────┐                   │   │
│  │  │Private AZ-a │      │Private AZ-b │                   │   │
│  │  │10.0.10.0/24 │      │10.0.11.0/24 │                   │   │
│  │  │             │      │             │                   │   │
│  │  │  ┌────────┐ │      │             │                   │   │
│  │  │  │EKS Node│ │      │             │                   │   │
│  │  │  │t3.med  │ │      │             │                   │   │
│  │  │  │        │ │      │             │                   │   │
│  │  │  │[Pod]   │ │      │             │                   │   │
│  │  │  │cal-app │ │      │             │                   │   │
│  │  │  └────────┘ │      │             │                   │   │
│  │  └─────────────┘      └─────────────┘                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ECR ──► calendar-app:latest                                   │
│   EKS ──► calendar-cluster (v1.31)                             │
└─────────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
               HolidayAPI  (holidayapi.com/v1)
```

### Stack tecnológico

| Capa            | Tecnología                                         |
| --------------- | -------------------------------------------------- |
| Frontend        | Vue.js 2.7.16 + jQuery UI Datepicker + Bulma CSS   |
| Backend         | PHP 8.2 + FlightPHP v3.18 (micro-framework REST)   |
| HTTP client     | Axios 1.7.9                                        |
| Fechas          | Day.js 1.11.13                                     |
| Contenedor      | Docker (php:8.2-apache)                            |
| Registro        | Amazon ECR                                         |
| Orquestación    | Amazon EKS 1.31                                    |
| Infraestructura | AWS CloudFormation                                 |
| Despliegue      | Python 3 + boto3                                   |
| CI/CD           | GitHub Actions (claude-code-action)                |

---

## Estructura del proyecto

```text
calendar/
├── src/
│   └── HolidayAPI/
│       └── v1.php              # Cliente HTTP propio para HolidayAPI
├── infra/
│   ├── cloudformation.yml      # Stack AWS: VPC + ECR + EKS + IAM
│   └── k8s/
│       ├── namespace.yml
│       ├── secret.yml          # Template — valor inyectado por deploy.py
│       ├── deployment.yml
│       └── service.yml
├── .github/
│   └── workflows/
│       └── claude.yml          # GitHub Action: @claude en PRs e issues
├── css/                        # Estilos (Bulma, jQuery UI, app.css)
├── js/                         # Scripts (Vue, Axios, Day.js, jQuery UI)
├── index.html                  # SPA frontend
├── index.php                   # Entrypoint PHP — rutas Flight
├── Dockerfile
├── .htaccess                   # mod_rewrite para Flight
├── composer.json
├── deploy.py                   # Script de despliegue a EKS
├── requirements.txt            # Dependencias Python
├── .env.example
└── .gitignore
```

---

## Requisitos previos

### Local

- Docker Desktop
- Python 3.9+

### Despliegue en AWS

- AWS CLI configurado (`aws configure`)
- kubectl instalado
- Docker Desktop con acceso a internet
- Cuenta AWS con permisos: CloudFormation, ECR, EKS, IAM, EC2, VPC

---

## Correr localmente

```bash
# Clonar y entrar al directorio
git clone <repo-url>
cd calendar

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tu HOLIDAYAPI_KEY

# Build y run
docker build -t calendar-app .
docker run -p 8888:80 --env-file .env calendar-app
```

App disponible en `http://localhost:8888`

---

## Despliegue en AWS EKS

### 1. Instalar dependencias Python

```bash
pip install -r requirements.txt
```

### 2. Configurar credenciales AWS

```bash
aws configure
# AWS Access Key ID:     <tu key>
# AWS Secret Access Key: <tu secret>
# Default region:        us-east-1
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tu HOLIDAYAPI_KEY
```

### 4. Desplegar

```bash
python deploy.py --region us-east-1 --stack-name calendar-app-stack
```

El script ejecuta 4 pasos automáticamente:

| Paso | Acción                               | Tiempo aprox. |
| ---- | ------------------------------------ | ------------- |
| 1    | CloudFormation: crea VPC + ECR + EKS | ~15-20 min    |
| 2    | Docker build + push a ECR            | ~2-3 min      |
| 3    | Actualiza kubeconfig local           | ~10 seg       |
| 4    | kubectl apply de manifests K8s       | ~1-2 min      |

### 5. Obtener URL de la aplicación

```bash
kubectl get svc -n calendar
# NAME           TYPE           CLUSTER-IP   EXTERNAL-IP        PORT(S)
# calendar-app   LoadBalancer   10.x.x.x     <aws-elb-url>      80:xxxxx/TCP
```

Abrir `http://<EXTERNAL-IP>` en el navegador.

### Opciones del script

```bash
python deploy.py --help

# --region       Región AWS          (default: us-east-1)
# --stack-name   Nombre del stack    (default: calendar-app-stack)
# --image-tag    Tag de la imagen    (default: latest)
# --skip-build   Omitir docker build (útil para re-deploy sin cambios)
```

---

## Variables de entorno

| Variable         | Descripción                                           | Requerida |
| ---------------- | ----------------------------------------------------- | --------- |
| `HOLIDAYAPI_KEY` | API key de [holidayapi.com](https://holidayapi.com)   | Sí        |

### Obtener una API key

1. Registrarse en [holidayapi.com](https://holidayapi.com)
2. Ir a **Dashboard → API Keys**
3. Copiar la key al archivo `.env`

> **Nota:** La cuenta gratuita solo permite consultar el año anterior. Para el año actual se requiere plan Premium.

---

## API

### `POST /holiday`

Retorna los festivos de un país y año.

#### Request

```json
{
  "country_code": "US",
  "year": 2025
}
```

#### Response exitoso `200`

```json
{
  "holidays": {
    "2025-01-01": [
      { "name": "New Year's Day", "date": "2025-01-01", "public": true }
    ]
  }
}
```

#### Errores de validación `400`

```json
{ "status": "400", "error": "Invalid country code. Use a 2-letter ISO code (e.g. US, MX)." }
{ "status": "400", "error": "Year must be between 2000 and 2026." }
```

---

## CI/CD con Claude

El repositorio tiene integrado `anthropics/claude-code-action`. Menciona `@claude` en cualquier issue o PR para que Claude revise código, sugiera mejoras o responda preguntas.

Requiere configurar el secret `ANTHROPIC_API_KEY` en **Settings → Secrets → Actions**.

---

## Seguridad

- API key manejada como variable de entorno (nunca en el código)
- Secret de Kubernetes para inyectar la key en el pod
- Validación de inputs en PHP (`country_code` regex `[A-Z]{2}`, `year` rango 2000-año actual)
- Imágenes ECR con `ScanOnPush: true`
- Dependencias actualizadas (jQuery 3.7.1, Axios 1.7.9, Vue 2.7.16)
