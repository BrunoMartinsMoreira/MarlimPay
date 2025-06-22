/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const fse = require('fs-extra');
const path = require('path');

const swaggerUiPath = path.join(__dirname, '../node_modules/swagger-ui-dist');
const openApiPath = path.join(__dirname, '../src/docs/openapi.json');
const publicDocsPath = path.join(__dirname, '../public/docs/swagger');

async function copySwaggerFiles() {
  try {
    await fse.emptyDir(publicDocsPath);

    await fse.copy(swaggerUiPath, publicDocsPath, {
      filter: (src, dest) => {
        return !src.endsWith('.map');
      },
    });

    await fse.copy(openApiPath, path.join(publicDocsPath, 'openapi.json'));

    console.log(
      'Cópia dos arquivos do Swagger UI e openapi.json concluída com sucesso!',
    );
  } catch (err) {
    console.error('Erro ao copiar arquivos do Swagger UI:', err);
    process.exit(1);
  }
}

copySwaggerFiles();
