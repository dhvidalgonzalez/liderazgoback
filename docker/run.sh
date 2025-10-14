docker rm -f sql_container
docker rmi mcr.microsoft.com/mssql/server:2019-latest

# Vuelve a descargar la imagen limpia
docker pull mcr.microsoft.com/mssql/server:2019-latest

# Luego vuelve a correr tu contenedor sin reconstruir ninguna imagen personalizada
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=SqlServer_24"  -p 1433:1433 --name sql_container --hostname sql_container  -d mcr.microsoft.com/mssql/server:2019-latest


# DATABASE_URL="sqlserver://10.18.18.147:1433;database=GSSO_Liderazgo_DB;user={LiderazgoUser};password={CTd34jW54ZvXNmu5};encrypt=true;trustServerCertificate=true" 