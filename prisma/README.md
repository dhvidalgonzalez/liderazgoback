EN DESARROLLO

# valida y formatea
npx prisma validate
npx prisma format

# crea y aplica migración (dev)
npx prisma migrate dev --name add_document_fields_to_justification

# (opcional) regenerar cliente
npx prisma generate

EN PRODUCCIÓN

# en el servidor (con DATABASE_URL apuntando a prod)
npx prisma migrate deploy

# (opcional) generar cliente
npx prisma generate