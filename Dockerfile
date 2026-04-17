FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./

# Recompila sqlite correctamente dentro del contenedor
RUN npm install --build-from-source

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
