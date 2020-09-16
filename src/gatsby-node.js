require('es6-promise').polyfill();
require('isomorphic-fetch');

exports.sourceNodes = async (
  {
    actions,
    store,
    cache,
    createNodeId,
    createContentDigest,
    getCache,
    getNode,
    getNodes,
    parentSpan,
    reporter,
    webhookBody,
  },
  pluginOptions
) => {
  const {
    baseUrl,
    apiBase = 'jsonapi',
    basicAuth,
    headers,
    menus,
  } = pluginOptions
  const {createNode, createParentChildLink} = actions

  reporter.info(`Starting to fetch menu link items from Drupal`)
  reporter.info('Menus to fetch are ' + menus.join(', '))

  // Data can come from anywhere, but for now create it manually
  const menuResponses = await Promise.all(menus.map(async menu => {
    return await fetch(`${baseUrl}/${apiBase}/menu_items/${menu}`, {
      auth: basicAuth,
      headers
    }).then(function (response) {
      if (response.status >= 400) {
        reporter.error(`Bad response from ${baseUrl}/${apiBase}/menu_items/${menu}`);
      }
      return response.json();
    })
  }));
  menuResponses.forEach(({data: menuItems}) => {
    const map = new Map();
    menuItems.forEach((item) => {
      const nodeContent = JSON.stringify(item);
      const id = `menu-items-${item.id}`;
      let parentId = null;
      if (item.attributes.parent) {
        parentId = `menu-items-${item.attributes.parent}`;
      }
      const nodeMeta = {
        id,
        parent: parentId,
        children: [],
        internal: {
          type: `MenuItems`,
          mediaType: `text/html`,
          content: nodeContent,
          contentDigest: createContentDigest(item)
        }
      };
      const node = Object.assign({}, item.attributes, nodeMeta);
      createNode(node);
      if (parentId && map.has(parentId)) {
        createParentChildLink({parent: map.get(parentId), child: node})
      }
      map.set(id, node)
    })
  });

}

