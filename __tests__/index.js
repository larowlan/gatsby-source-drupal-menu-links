require('jest-fetch-mock').enableMocks()

const { sourceNodes } = require(`../gatsby-node`)

describe(`gatsby-source-drupal-menu-links`, () => {
  let nodes = {}
  const parents = new Map();
  const baseUrl = `http://fixture`
  const createContentDigest = jest.fn().mockReturnValue(`contentDigest`)
  const actions = {
    createNode: jest.fn(node => (nodes[node.id] = node)),
    createParentChildLink: jest.fn(({parent, child}) => (parents.set(child.id, parent.id))),
  }

  const reporter = {
    info: jest.fn(),
    activityTimer: jest.fn(() => activity),
    log: jest.fn(),
  }

  const args = {
    createContentDigest,
    actions,
    reporter,
  }

  beforeAll(async () => {
    const fixtureContents = require(`./fixtures/menu_items__jsonapi_menu_test.json`)
    fetchMock.mockOnce(JSON.stringify(fixtureContents))
    await sourceNodes(args, {baseUrl, menus: ['jsonapi_menu_items_test']})
  })

  it(`Generates nodes`, () => {
    expect(Object.keys(nodes).length).toEqual(3)
    expect(nodes[`menu-items-jsonapi_menu_test.user.login`]).toBeDefined()
    expect(nodes[`menu-items-jsonapi_menu_test.open`]).toBeDefined()
    expect(nodes[`menu-items-menu_link_content:108a993a-25dd-4d76-ac8d-49ae76ac5231`]).toBeDefined()
  })

  it(`Nodes contain attributes data`, () => {
    expect(nodes[`menu-items-menu_link_content:108a993a-25dd-4d76-ac8d-49ae76ac5231`].title).toEqual('an item')
  })

  it(`Associates with childen`, () => {
    expect(nodes[`menu-items-menu_link_content:108a993a-25dd-4d76-ac8d-49ae76ac5231`].parent).toEqual('menu-items-jsonapi_menu_test.open')
    expect(parents.get(`menu-items-menu_link_content:108a993a-25dd-4d76-ac8d-49ae76ac5231`)).toEqual(`menu-items-jsonapi_menu_test.open`)
  })
})
