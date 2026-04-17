Ejecutar con Docker:

Sigue estos pasos para levantar la aplicación fácilmente:

1. Descargar la imagen
docker pull hongito/denunciaya

3. Ejecutar el contenedor
docker run -d -p 3000:3000 -v denunciaya_data:/app hongito/denunciaya

🌐 Acceso a la aplicación

Una vez levantado el contenedor, abre tu navegador en:
http://localhost:3000

Usuario admin
Contrasena: Admin@123
