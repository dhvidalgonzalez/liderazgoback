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

## 🔧 Installation
# Pasos para actulizar el bakedn de aplicacion liderazgo

1. Traer lo ultimos cambios
git fetch upstream

2. Aplicar cambios localmente (Notar que esto sobrescribe)
git reset --hard upstream/main

3. Aplicar migraciones
npx prisma migrate deploy


4. Reiniciar pm2

pm2 restart <numero de proceso o nombre del proceso>