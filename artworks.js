/**
 * COLLECTIONS DATA - Editions Model
 *
 * Each collection shows ONE representative image with:
 * - supply: total number of editions
 * - marketplaceUrl: link to buy/view
 * - representativeId: inscription ID used for the image
 */

const collections = [
  // ============================================
  // ORDINALS COLLECTIONS
  // ============================================
  {
    id: 'block-party-editions',
    title: 'Block Party Editions',
    year: 2024,
    chain: 'ordinals',
    supply: 50,
    representativeId: 'c3a522c317525230daaa6ce3e5d9d572fa5ba5f06851207e3bf29cbecacea706i0',
    image: 'https://ordinals.com/content/c3a522c317525230daaa6ce3e5d9d572fa5ba5f06851207e3bf29cbecacea706i0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    },
    characters: [
      {
        name: 'Sky Slasher',
        supply: 29,
        image: 'https://ordinals.com/content/c3a522c317525230daaa6ce3e5d9d572fa5ba5f06851207e3bf29cbecacea706i0'
      },
      {
        name: "Pepe Mc'Parrot",
        supply: 21,
        image: 'https://ordinals.com/content/3133ec253494d81c57e04e49e8daaa540f203f0668d3eac59830949adbf74039i0'
      }
    ]
  },
  {
    id: 'the-acid-family',
    title: 'The Acid Family',
    year: 2024,
    chain: 'ordinals',
    supply: 34,
    // Show first character as representative
    representativeId: '37deceaf45623e1d5c02c5dbb65fd28b0f92ddae9979254aa465fef1b608f637i0',
    image: 'https://ordinals.com/content/37deceaf45623e1d5c02c5dbb65fd28b0f92ddae9979254aa465fef1b608f637i0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    },
    // 3 characters in this collection
    characters: [
      {
        name: 'Mr 303',
        supply: 17,
        image: 'https://ordinals.com/content/37deceaf45623e1d5c02c5dbb65fd28b0f92ddae9979254aa465fef1b608f637i0'
      },
      {
        name: 'Mrs 303',
        supply: 8,
        image: 'https://ordinals.com/content/e1fbbe09e46c599f0ffb61f64002532e3cc3ddb457f5324ea244dd6044710819i0'
      },
      {
        name: 'Baby 303',
        supply: 9,
        image: 'https://ordinals.com/content/1a9dbd6c2a4578624645b2905b1b9f18314886426d65f0558fc942cc6bd22a5ei0'
      }
    ]
  },
  {
    id: 'patience',
    title: 'Patience',
    year: 2024,
    chain: 'ordinals',
    supply: 49,
    representativeId: '317822cad186d8ae043a7667f02dfb9079312edcd4e4338f0e769de62ea3471bi0',
    image: 'https://ordinals.com/content/317822cad186d8ae043a7667f02dfb9079312edcd4e4338f0e769de62ea3471bi0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    },
    characters: [
      {
        name: 'Patience',
        supply: 25,
        image: 'https://ordinals.com/content/317822cad186d8ae043a7667f02dfb9079312edcd4e4338f0e769de62ea3471bi0'
      },
      {
        name: 'Black Mirror',
        supply: 24,
        image: 'https://ordinals.com/content/cfb4e9a2fa03e0be25183e6565d455703aaa69cb0c671b8003c4086e610d043di0'
      }
    ]
  },
  {
    id: 'block-clock-editions',
    title: 'Block Clock Editions',
    year: 2024,
    chain: 'ordinals',
    supply: 34,
    representativeId: '7c29978bdc4524f00cfdd7b77e978bd8fb8bee9f58ecd724f9ba80673029b58bi0',
    image: 'https://ordinals.com/content/7c29978bdc4524f00cfdd7b77e978bd8fb8bee9f58ecd724f9ba80673029b58bi0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    },
    characters: [
      {
        name: 'Nucleus',
        supply: 13,
        image: 'https://ordinals.com/content/7c29978bdc4524f00cfdd7b77e978bd8fb8bee9f58ecd724f9ba80673029b58bi0'
      },
      {
        name: 'Blockrunner',
        supply: 21,
        image: 'https://ordinals.com/content/259bd0e168925a975980edd919a54d11ca4bc914e63c070ddd7a2c1d89e75646i0'
      }
    ]
  }
];
