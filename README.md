# Gatsby source Drupal menu-links

## Overview

Provides gatsby integration for the [Drupal JSON:API menu items module](https://drupal.org/project/jsonapi_menu_items)

## Install

```
npm install --save gatsby-source-drupal-menu-links
```

## Setup

### In Drupal land 💧

- Enable jsonapi module from core.
- Add and enable jsonapi_menu_items module
```
composer require "drupal/jsonapi_menu_items"
drush en -y jsonapi_menu_items
```

### In Gatsby land 🟣

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-drupal-menu-links`,
      options: {
        baseUrl: `https://live-contentacms.pantheonsite.io/`,
        apiBase: `api`, // optional, defaults to `jsonapi`
        menus: ["main", "account"], // Which menus to fetch, there are the menu IDs.
      },
    },
  ],
}
```
