'use strict';

// Acciones de solo lectura que se abren al rol Public para que
// el servicio GraphQL y el sitio puedan leer contenido publicado.
const PUBLIC_READ = [
  'api::landing.landing.find',
  'api::article.article.find',
  'api::article.article.findOne',
];

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
    if (!role) return;

    for (const action of PUBLIC_READ) {
      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: role.id } });
      if (!existing) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .create({ data: { action, role: role.id } });
      }
    }
  },
};
