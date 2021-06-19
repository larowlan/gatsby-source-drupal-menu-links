require("es6-promise").polyfill()
require("isomorphic-fetch")

const getHref = (link) => {
  if (typeof link === `object`) {
    return link.href
  }

  return link
}

const fetchEnabledLanguages = async ({
  baseUrl,
  apiBase,
  headers,
  reporter,
}) => {
  let next = `${baseUrl}/${apiBase}/configurable_language/configurable_language?sort=weight`
  let availableLanguagesResponses = []

  while (next) {
    const result = await fetch(next, {
      headers,
    })
    if (!result.ok) {
      reporter.error(`Bad res from ${next}`)
    }
    const responseBody = await result.json()
    availableLanguagesResponses = availableLanguagesResponses.concat(
      responseBody.data
    )
    next = getHref(responseBody.links.next)
  }

  const enabledLanguages = availableLanguagesResponses
    .filter(
      (language) =>
        [`und`, `zxx`].indexOf(language.attributes.drupal_internal__id) === -1
    )
    .map((language) => language.attributes.drupal_internal__id)
  const defaultLanguage = enabledLanguages[0]
  return {
    defaultLanguage,
    enabledLanguages,
  }
}

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
    apiBase = "jsonapi",
    basicAuth = {},
    headers = {},
    menus,
  } = pluginOptions
  const { createNode, createParentChildLink } = actions

  reporter.info(`Starting to fetch menu link items from Drupal`)
  reporter.info("Menus to fetch are " + menus.join(", "))

  if (basicAuth.username) {
    headers.Authorization = `Basic ${Buffer.from(
      `${basicAuth.username}:${basicAuth.password}`,
      "utf-8"
    ).toString("base64")}`
  }

  reporter.info(`Checking the language configuration.`)

  const languageConfig = await fetchEnabledLanguages({
    baseUrl,
    apiBase,
    headers,
    reporter,
  })

  let languages = languageConfig.enabledLanguages
  if (!languages || languages.length == 0) {
    languages = ["und"]
  }

  // Data can come from anywhere, but for now create it manually
  const menuResponses = await Promise.all(
    menus.map(async (menu) => {
      return Promise.all(
        languageConfig.enabledLanguages.map(async (langcode) => {
          let prefix = ""
          if (langcode !== "und") {
            prefix = `/${langcode}`
          }
          const url = `${baseUrl}${prefix}/${apiBase}/menu_items/${menu}`
          const result = await fetch(url, {
            headers,
          }).then(function (res) {
            if (res.status >= 400) {
              reporter.error(`Bad res from ${url}`)
            }
            return res.json()
          })
          result.langcode = langcode
          return result
        })
      )
    })
  )
  menuResponses.forEach((menuResponse) => {
    menuResponse.forEach(({ data: menuItems, langcode }) => {
      const map = new Map()
      menuItems.forEach((item) => {
        const nodeContent = JSON.stringify(item)
        const id = `menu-items-${item.id}-${langcode}`
        let parentId = null
        if (item.attributes.parent) {
          parentId = `menu-items-${item.attributes.parent}`
        }
        const nodeMeta = {
          id,
          parent: parentId,
          children: [],
          langcode,
          internal: {
            type: `MenuItems`,
            mediaType: `text/html`,
            content: nodeContent,
            contentDigest: createContentDigest(item),
          },
        }
        const node = Object.assign({}, item.attributes, nodeMeta)
        createNode(node)
        if (parentId && map.has(parentId)) {
          createParentChildLink({ parent: map.get(parentId), child: node })
        }
        map.set(id, node)
      })
    })
  })
}
