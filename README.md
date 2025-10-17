# 🧠 Liderazgo – Backend API

**Liderazgo** is a Node.js + Express + Prisma backend API designed to manage users and justifications for an internal management system.

---

## 📁 Project Structure

```
backend-liderazgo/
├── src/                        # Source code
│   ├── controllers/            # Express controllers
│   ├── db/                     # Prisma client
│   ├── middlewares/           # Error handlers, etc.
│   ├── routes/                # Route definitions per model
│   ├── services/              # Business logic
│   │   ├── user/
│   │   └── justification/
│   ├── app.js                 # Express instance
│   └── server.js              # App entry point
├── prisma/                    # Prisma schema and migrations
│   └── schema.prisma
├── tests/                     # Jest test suite
│   ├── user/
│   └── justification/
├── scripts/                   # Seeders and util scripts
│   └── seed.js
├── .env                       # Environment variables
├── package.json
├── jest.config.js
└── README.md
```

---

## 🚀 Tech Stack

- **Node.js**
- **Express**
- **Prisma ORM**
- **SQLite** (development)
- **Jest** + **Supertest**
- **module-alias** (clean absolute imports)
- **@faker-js/faker** (for seeding)

---

## 🔧 Installation

```bash
git clone https://github.com/your-user/backend-liderazgo.git
cd backend-liderazgo
npm install
```

---

## ⚙️ Configuration

### `.env`

```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

---

## 🔨 Development

```bash
npm run dev
```

To apply migrations and generate the Prisma client:

```bash
npm run migrate
npm run generate
```

---

## 🧪 Running Tests

```bash
npm test
```

---

## 🌱 Seed Sample Data

```bash
node scripts/seed.js
```

This will create:
- 10 sample users
- Each user with 10 justifications

---

## ✅ Endpoints Overview

- **Users**
  - `GET /api/users`
  - `POST /api/users`
  - `GET /api/users/:id`
  - `PUT /api/users/:id`
  - `DELETE /api/users/:id`

- **Justifications**
  - `GET /api/justifications`
  - `POST /api/justifications`
  - `GET /api/justifications/:id`
  - `PUT /api/justifications/:id/status`
  - `DELETE /api/justifications/:id`

---

## 📦 Scripts

- `npm run dev` – Start dev server
- `npm run migrate` – Run Prisma migration
- `npm run generate` – Generate Prisma client
- `npm test` – Run test suite

---

## 📚 License

MIT

Errores:
npm --version
npm : No se puede cargar el archivo C:\Program Files\nodejs\npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema. Para obtener más información, consulta el 
tema about_Execution_Policies en https:/go.microsoft.com/fwlink/?LinkID=135170.
En línea: 1 Carácter: 1
+ npm --version
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
PS C:\Users\PROSIGA-DET-0347\proyectos\liderazgo> npm --version
10.9.3

Ya lo solucione, debes ejecutar el powershell como administrador y ejecutar el comando Set-ExecutionPolicy Unrestricted


2. Trae los cambios del remoto:
git fetch upstream


(Esto no cambia nada todavía, solo descarga lo más reciente del repo remoto.)

3. Sobrescribe tu rama local con la del remoto:
git reset --hard upstream/main