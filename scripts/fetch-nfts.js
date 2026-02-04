/**
 * NFT Collection Fetcher
 *
 * Fetches NFT metadata from various chains and outputs data for the site.
 *
 * SETUP:
 * 1. npm install node-fetch
 * 2. Get API keys (free tiers available):
 *    - Alchemy: https://alchemy.com (Ethereum)
 *    - Reservoir: https://reservoir.tools (Ethereum, no key needed for basic)
 *    - TzKT: https://tzkt.io (Tezos, no key needed)
 * 3. Set your keys in the config below or use environment variables
 *
 * USAGE:
 *   node fetch-nfts.js
 */

const fs = require('fs');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Alchemy API key
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || 'TEA_S5N5ZDv2-ARmljr-c',

  // Output file
  OUTPUT_FILE: '../artworks-generated.js',
};

// ============================================
// YOUR COLLECTIONS - ADD YOUR DATA HERE
// ============================================

const COLLECTIONS = [
  // ============================================
  // ETHEREUM COLLECTIONS
  // ============================================
  {
    chain: 'ethereum',
    contract: '0x3a2c989bfdd3b315b78717e4a6f43932a8b5023d',
    title: 'Renascent',
    description: 'Fully On-Chain Originals made with code',
    artistNote: 'Renascent is an ongoing journey to unlock the possibilities of onchain art on ETH',
    heroTokenId: null,
  },
  {
    chain: 'ethereum',
    contract: '0x51b804f7bb2ce7d742225003cac001721de76a2c',
    title: 'Addicted',
    description: '420 seconds of freestyle energy, Fully OnChain',
    artistNote: 'Addicted is a way to channel my art making addiction',
    heroTokenId: null,
  },
  {
    chain: 'ethereum',
    contract: '0xd0cf83744db1fdee8a0fafe913391befb85190aa',
    title: 'Glitch Bomb',
    description: 'Exclusive burn / redeem collection',
    artistNote: 'For Diamond Hands only',
    heroTokenId: null,
  },
  {
    chain: 'ethereum',
    contract: '0xe4cda4a0955f427ff7f0a05990ca154984966060',
    title: 'Reflections',
    description: 'Art Editions',
    artistNote: 'This collection began in Jan 23, fresh off the back of my 2022 everydays, the style is what I call my reflections style',
    heroTokenId: null,
  },
  {
    chain: 'ethereum',
    contract: '0x20727eb4191bfe6e15b9a2a34934d48f24e3b420',
    title: 'StrangersNFT',
    description: 'A 300 Piece PFP collection',
    artistNote: 'Strangers is my OG collection, released in 2021 across 8 months, before the days of apple pencils, the artwork is finger painted',
    heroTokenId: null,
  },

  // ============================================
  // TEZOS COLLECTIONS
  // ============================================
  // {
  //   chain: 'tezos',
  //   contract: 'KT1...',
  //   title: 'Collection Name',
  //   description: 'Description...',
  //   artistNote: 'Artist note...',
  // },

  // ============================================
  // ORDINALS COLLECTIONS
  // ============================================
  // {
  //   chain: 'ordinals',
  //   collectionSlug: 'your-collection-slug',
  //   title: 'Collection Name',
  //   description: 'Description...',
  //   artistNote: 'Artist note...',
  // },
];

// ============================================
// FETCHERS
// ============================================

async function fetchEthereumCollection(collection) {
  console.log(`Fetching Ethereum collection: ${collection.title}...`);

  const baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${CONFIG.ALCHEMY_API_KEY}`;

  try {
    // Get collection metadata
    const contractUrl = `${baseUrl}/getContractMetadata?contractAddress=${collection.contract}`;
    const contractRes = await fetch(contractUrl);
    const contractData = await contractRes.json();

    // Get NFTs in collection
    const nftsUrl = `${baseUrl}/getNFTsForContract?contractAddress=${collection.contract}&withMetadata=true&limit=100`;
    const nftsRes = await fetch(nftsUrl);
    const nftsData = await nftsRes.json();

    const pieces = (nftsData.nfts || []).map(nft => ({
      tokenId: nft.tokenId,
      title: nft.name || nft.title || `#${nft.tokenId}`,
      image: resolveImageUrl(nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image),
      thumbnail: nft.image?.thumbnailUrl || nft.image?.cachedUrl,
      description: nft.description,
      attributes: nft.raw?.metadata?.attributes || [],
    }));

    // Find hero image
    let heroImage = null;
    if (collection.heroTokenId) {
      const heroPiece = pieces.find(p => p.tokenId === String(collection.heroTokenId));
      heroImage = heroPiece?.image;
    }
    if (!heroImage && pieces.length > 0) {
      heroImage = pieces[0].image;
    }

    return {
      id: slugify(collection.title),
      title: collection.title,
      chain: 'ethereum',
      contract: collection.contract,
      supply: contractData.totalSupply || pieces.length,
      heroImage: heroImage,
      description: collection.description,
      artistNote: collection.artistNote,
      pieces: pieces,
      marketplaces: {
        opensea: `https://opensea.io/assets/ethereum/${collection.contract}`,
      },
    };
  } catch (error) {
    console.error(`Error fetching ${collection.title}:`, error.message);
    return null;
  }
}

async function fetchTezosCollection(collection) {
  console.log(`Fetching Tezos collection: ${collection.title}...`);

  try {
    // Use TzKT API (free, no key needed)
    const tokensUrl = `https://api.tzkt.io/v1/tokens?contract=${collection.contract}&limit=100`;
    const tokensRes = await fetch(tokensUrl);
    const tokensData = await tokensRes.json();

    const pieces = tokensData.map(token => {
      const metadata = token.metadata || {};
      return {
        tokenId: token.tokenId,
        title: metadata.name || `#${token.tokenId}`,
        image: resolveImageUrl(metadata.displayUri || metadata.artifactUri || metadata.thumbnailUri),
        thumbnail: resolveImageUrl(metadata.thumbnailUri || metadata.displayUri),
        description: metadata.description,
        attributes: metadata.attributes || [],
      };
    });

    // Find hero image
    let heroImage = null;
    if (collection.heroTokenId) {
      const heroPiece = pieces.find(p => p.tokenId === String(collection.heroTokenId));
      heroImage = heroPiece?.image;
    }
    if (!heroImage && pieces.length > 0) {
      heroImage = pieces[0].image;
    }

    return {
      id: slugify(collection.title),
      title: collection.title,
      chain: 'tezos',
      contract: collection.contract,
      supply: tokensData.length,
      heroImage: heroImage,
      description: collection.description,
      artistNote: collection.artistNote,
      pieces: pieces,
      marketplaces: {
        objkt: `https://objkt.com/collection/${collection.contract}`,
      },
    };
  } catch (error) {
    console.error(`Error fetching ${collection.title}:`, error.message);
    return null;
  }
}

async function fetchOrdinalsCollection(collection) {
  console.log(`Fetching Ordinals collection: ${collection.title}...`);

  try {
    // Use Magic Eden API (free for basic requests)
    const url = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=${collection.collectionSlug}&limit=100`;
    const res = await fetch(url);
    const data = await res.json();

    const pieces = (data.tokens || []).map(token => ({
      tokenId: token.id,
      title: token.meta?.name || `#${token.inscriptionNumber}`,
      image: `https://ordinals.com/content/${token.id}`,
      inscriptionNumber: token.inscriptionNumber,
      attributes: token.meta?.attributes || [],
    }));

    // Find hero image
    let heroImage = null;
    if (pieces.length > 0) {
      heroImage = pieces[0].image;
    }

    return {
      id: slugify(collection.title),
      title: collection.title,
      chain: 'ordinals',
      collectionSlug: collection.collectionSlug,
      supply: pieces.length,
      heroImage: heroImage,
      description: collection.description,
      artistNote: collection.artistNote,
      pieces: pieces,
      marketplaces: {
        magicEden: `https://magiceden.io/ordinals/marketplace/${collection.collectionSlug}`,
      },
    };
  } catch (error) {
    console.error(`Error fetching ${collection.title}:`, error.message);
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

function resolveImageUrl(url) {
  if (!url) return null;

  // IPFS
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  // Arweave
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/');
  }

  return url;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('NFT Collection Fetcher');
  console.log('======================\n');

  if (CONFIG.ALCHEMY_API_KEY === 'YOUR_ALCHEMY_KEY_HERE') {
    console.log('WARNING: No Alchemy API key set. Ethereum fetching may fail.');
    console.log('Get a free key at: https://alchemy.com\n');
  }

  const results = [];

  for (const collection of COLLECTIONS) {
    let data = null;

    switch (collection.chain) {
      case 'ethereum':
        data = await fetchEthereumCollection(collection);
        break;
      case 'tezos':
        data = await fetchTezosCollection(collection);
        break;
      case 'ordinals':
        data = await fetchOrdinalsCollection(collection);
        break;
      default:
        console.log(`Unknown chain: ${collection.chain}`);
    }

    if (data) {
      results.push(data);
      console.log(`  ✓ Found ${data.pieces.length} pieces\n`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Output to file
  const output = `/**
 * AUTO-GENERATED - Do not edit manually
 * Generated: ${new Date().toISOString()}
 * Run 'node scripts/fetch-nfts.js' to regenerate
 */

const collections = ${JSON.stringify(results, null, 2)};
`;

  fs.writeFileSync(CONFIG.OUTPUT_FILE, output);
  console.log(`\nDone! Written ${results.length} collections to ${CONFIG.OUTPUT_FILE}`);

  // Also output summary
  console.log('\nSummary:');
  results.forEach(c => {
    console.log(`  - ${c.title}: ${c.pieces.length} pieces (${c.chain})`);
  });
}

main().catch(console.error);
