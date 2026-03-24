const app = require("./app");

const PORT = process.env.PORT || 3000;

const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://127.0.0.1:${PORT}`);
});
