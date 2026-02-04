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
    }
  },
  {
    id: 'the-acid-family',
    title: 'The Acid Family',
    year: 2024,
    chain: 'ordinals',
    supply: 34,
    representativeId: '37deceaf45623e1d5c02c5dbb65fd28b0f92ddae9979254aa465fef1b608f637i0',
    image: 'https://ordinals.com/content/37deceaf45623e1d5c02c5dbb65fd28b0f92ddae9979254aa465fef1b608f637i0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    }
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
    }
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
    }
  },

  // ============================================
  // ETHEREUM COLLECTIONS
  // ============================================
  {
    id: 'renascent',
    title: 'Renascent',
    year: 2026,
    chain: 'ethereum',
    supply: 18,
    image: 'https://media.raster.art/42f96035617b663c9622996910a25a1f98f8bc9db3c71e2256bfd3ceaaf649f8',
    marketplaces: {}
  },
  {
    id: 'static-distortions',
    title: 'Static Distortions',
    year: 2025,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/fd6022c9a34fefceda30b635a0004f69918cca603e052ac227b0fd5039d86187',
    marketplaces: {}
  },
  {
    id: 'gritty-city',
    title: 'Gritty City',
    year: 2025,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/cea8b128f0ab272b1b32d9cc8082020a319a25b1c5520b8dfbef08304270a355',
    marketplaces: {}
  },
  {
    id: 'tweakers',
    title: 'Tweakers',
    year: 2025,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/4805896460f89ffb0f7cbd0e79cd0600b03ec018797766e8dbb0de2000656109',
    marketplaces: {}
  },
  {
    id: 'pepe-parrots',
    title: 'Pepe Parrots',
    year: 2025,
    chain: 'ethereum',
    supply: 10,
    image: 'https://media.raster.art/10e93d29029e97028ee15bbfd7976cd0fb422f315a2cd2674a5adfec459e5c36',
    marketplaces: {}
  },
  {
    id: 'sartoshis-island',
    title: 'Sartoshis Island',
    year: 2024,
    chain: 'ethereum',
    supply: 57,
    image: 'https://media.raster.art/041b0ce2e08bb0a00e1477ffdc5c4dae0afba8eb32b55e27d88f18ee3954f725',
    marketplaces: {}
  },
  {
    id: 'banana-zone',
    title: 'Banana Zone',
    year: 2024,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/aa201e57b2ea596956640756529e7edb100ba9b1cf6e9c60535b56d159a0a640',
    marketplaces: {}
  },
  {
    id: 'addicted',
    title: 'addicted',
    year: 2024,
    chain: 'ethereum',
    supply: 2,
    image: 'https://media.raster.art/2a92edd5fd75365a5fff3a7d003c8d98aeef9e00fcc3810bf5b31eb6371a150e',
    marketplaces: {}
  },
  {
    id: 'forward-motions',
    title: 'Forward Motions',
    year: 2023,
    chain: 'ethereum',
    supply: 4,
    image: 'https://media.raster.art/a6ce9e4e4d3e6f22dedd688d91114214e1a21b13c9e461f21be889504a0e70be',
    marketplaces: {}
  },
  {
    id: 'drone',
    title: 'DRONE',
    year: 2023,
    chain: 'ethereum',
    supply: 3,
    image: 'https://media.raster.art/ae4b47e555c2038b461d0f53739e13f8d1a25d9b692a7022d7c118fa358671b1',
    marketplaces: {}
  },
  {
    id: 'fomo-pill',
    title: 'FOMO Pill',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/1321f09aecb4e0a9e74321dcf188b786e587043d3113c3e884dd5de15721cd71',
    marketplaces: {}
  },
  {
    id: 'thinking-time',
    title: 'Thinking Time',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/f4be7e7947dbf89c2e8f3226e418d04bc48267fe73f4729f72cfffae8a5bc7b3',
    marketplaces: {}
  },
  {
    id: 'strange-encounters',
    title: 'Strange Encounters',
    year: 2023,
    chain: 'ethereum',
    supply: 25,
    image: 'https://media.raster.art/919bc9c915c402e085e01b7fcacdc97f7cfedb3a29edeadc5f762473a3582d52',
    marketplaces: {}
  },
  {
    id: 'escape-from-the-glitch',
    title: 'Escape from the Glitch',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/e36bf9eee1ca86d46fab7dc7b8549f33d4dbb703b65841bb354b8cdae936670f',
    marketplaces: {}
  },
  {
    id: 'x-symbol',
    title: '\u{1D54F}',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/2e9d343b3cf47eb01e2cfba6e0de24f1129b588e2d83016f61a5449cd3b4d2f3',
    marketplaces: {}
  },
  {
    id: 'undead-ed',
    title: 'Undead Ed',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/638403a9c8a9be0c90a8a72969f593ff16fbafdb857895b832980ac3281e5022',
    marketplaces: {}
  },
  {
    id: 'kamikaze',
    title: 'Kamikaze',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/d1e417f1346becb9ee483ec234e868f2a00c84e5732439f568a2f74f2042e197',
    marketplaces: {}
  },
  {
    id: 'save-as',
    title: 'Save As',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/34a02cb3a1e0ba4c311604acda8deb7af9ac535248179047b8be3d433bdc400d',
    marketplaces: {}
  },
  {
    id: 'alchemy-eth',
    title: 'Alchemy',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/ae14796b376db7cb9e5ee7b891306f27f53d7031cfdb3b41d07d5bf3d078d32b',
    marketplaces: {}
  },
  {
    id: 'solemn',
    title: 'Solemn',
    year: 2023,
    chain: 'ethereum',
    supply: 6,
    image: 'https://media.raster.art/0c887d95c8cca8fbe47ae062d34213b0d4631ad8c3a52b733a1871f79dd8e3c9',
    marketplaces: {}
  },
  {
    id: 'nightlight',
    title: 'Nightlight',
    year: 2023,
    chain: 'ethereum',
    supply: 4,
    image: 'https://media.raster.art/865fa00f37c3f4823c4e50499d66119fc70f4c0bec0054c5e87a11fe8cda50a4',
    marketplaces: {}
  },
  {
    id: 'wronguns',
    title: 'Wronguns',
    year: 2023,
    chain: 'ethereum',
    supply: 4,
    image: 'https://media.raster.art/0c887d95c8cca8fbe47ae062d34213b0d4631ad8c3a52b733a1871f79dd8e3c9',
    marketplaces: {}
  },
  {
    id: 'the-pulse',
    title: 'The Pulse',
    year: 2023,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/4bd4429351e64a2bd840e81c23eb24a79df4dc38f7a8127f8f58d087ca043913',
    marketplaces: {}
  },
  {
    id: 'reflections',
    title: 'Reflections',
    year: 2022,
    chain: 'ethereum',
    supply: 7,
    image: 'https://media.raster.art/e8732457d30fd1d081908424f6d058908c7fd3f5394695874071ad00dcdc9ef9',
    marketplaces: {}
  },
  {
    id: 'safumelt',
    title: 'Safumelt',
    year: 2022,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/61d47d47983a46770220be1c508272201d726eed3d5a350cdfc048ac358da2e4',
    marketplaces: {}
  },
  {
    id: 'wormhole',
    title: 'Wormhole',
    year: 2022,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/b1a1e6cc72b2b03d79f18c3b36e7a4931b52d15124b21c7137fd226810f9e0a2',
    marketplaces: {}
  },
  {
    id: 'abduction',
    title: 'Abduction',
    year: 2022,
    chain: 'ethereum',
    supply: 5,
    image: 'https://media.raster.art/296330fbaafbf411c407ef7356321280846e7928788b234552e9e98a11c72c97',
    marketplaces: {}
  },
  {
    id: 'strange-punks',
    title: 'Strange Punks',
    year: 2022,
    chain: 'ethereum',
    supply: 11,
    image: 'https://media.raster.art/cd05dac04400e143975036fd618398e16d22f20f21d091d82972ede7fd67e5a2',
    marketplaces: {}
  },
  {
    id: 'strangersnft',
    title: 'StrangersNFT',
    year: 2022,
    chain: 'ethereum',
    supply: 297,
    image: 'https://media.raster.art/5898675732fec2c356fa3bbf191b9d1dc019edd7e286bb7eeb9b30171934d8a1',
    marketplaces: {}
  },
  {
    id: 'the-art-of-darkness',
    title: 'The Art of Darkness',
    year: 2022,
    chain: 'ethereum',
    supply: 25,
    image: 'https://media.raster.art/a7f00d80da091ebb6376912a878def149116fb1566a4e8bf9a16edafd4827d3b',
    marketplaces: {}
  },
  {
    id: 'flipboard',
    title: 'Flipboard',
    year: 2022,
    chain: 'ethereum',
    supply: 31,
    image: 'https://media.raster.art/0a2a88cb0276cf888ecf908bad05cb3c84e5b0c627a06be86e048a31929ba6e7',
    marketplaces: {}
  },
  {
    id: 'january',
    title: 'January',
    year: 2022,
    chain: 'ethereum',
    supply: 28,
    image: 'https://media.raster.art/3e8e4afca16efb54842704fdf05903a7414905badc8c42dd867ca8196c80d7e5',
    marketplaces: {}
  },
  {
    id: 'club-strange',
    title: 'Club Strange',
    year: 2022,
    chain: 'ethereum',
    supply: 5,
    image: 'https://media.raster.art/4a9620739c88ebada722ae500eaec24aad159ee3eb8bbc110e4ff0733a93bf98',
    marketplaces: {}
  },
  {
    id: 'rekt-at-the-mansion',
    title: 'Rekt @ The Mansion',
    year: 2022,
    chain: 'ethereum',
    supply: 12,
    image: 'https://media.raster.art/d42c0c0db9b41d62fe1ea19a899b6aee0387ab671fc513d5e97282707bc6efb6',
    marketplaces: {}
  },
  {
    id: 'deceptors',
    title: 'Deceptors',
    year: 2022,
    chain: 'ethereum',
    supply: 1,
    image: 'https://media.raster.art/46c9cc97d268de3ac82de343a02f6338203c053084dde19143c60eb1cc45e124',
    marketplaces: {}
  },
  {
    id: 'gatekeepers',
    title: 'Gatekeepers',
    year: 2022,
    chain: 'ethereum',
    supply: 3,
    image: 'https://media.raster.art/c34ac8b7e43c84fdb4eaceae6a94a3eabc4ec744968c9c8b56e98f8b0b06dc42',
    marketplaces: {}
  },
  {
    id: 'fck-knows',
    title: 'Fck Knows',
    year: 2022,
    chain: 'ethereum',
    supply: 6,
    image: 'https://media.raster.art/efbe2a01f8fd0522dcadd06fd5a12a351661851b6ba3bd6ed2019ebf08122515',
    marketplaces: {}
  },
  {
    id: 'everyday-strange',
    title: 'Everyday Strange',
    year: 2022,
    chain: 'ethereum',
    supply: 365,
    image: 'https://media.raster.art/b3bab985fd82e73b13f35ace4fe0bde06a9d6f4e28481318c6994ec13843a148',
    marketplaces: {}
  },
  {
    id: 'when-your-strange',
    title: 'When your Strange',
    year: 2021,
    chain: 'ethereum',
    supply: 17,
    image: 'https://media.raster.art/679c3d821fe0e1f1365a18579ef7dc614b69c3b0a3c18666ff303b04507a0715',
    marketplaces: {}
  },
  {
    id: 'stranger-days',
    title: 'Stranger Days by Solemn',
    year: 2021,
    chain: 'ethereum',
    supply: 96,
    image: 'https://media.raster.art/f968451115edcc8963ac4c1284fdb4d7c653fd8c8babff623e5f434f4c611d03',
    marketplaces: {}
  },
  {
    id: 'honorary-strangers-club',
    title: 'Honorary Strangers Club',
    year: 2021,
    chain: 'ethereum',
    supply: 2,
    image: 'https://media.raster.art/29da7bc1b78277f226ccfa30fee1f2e44e7a6d86f8d2c749beab654ab5eae3f7',
    marketplaces: {}
  },
  {
    id: 'strange-occurances',
    title: 'Strange Occurances',
    year: 2021,
    chain: 'ethereum',
    supply: 6,
    image: 'https://media.raster.art/a491c050c4a93955ba99645ec408d6bacd7bb1c929e895eef5eb1cacf3b3359a',
    marketplaces: {}
  },
  {
    id: 'editions-by-solemn',
    title: 'Editions by Solemn',
    year: 2021,
    chain: 'ethereum',
    supply: 8,
    image: 'https://media.raster.art/1bbdce09740386c01df5018fc0b5b8f86653af3b76e773f8df3b9a9d470e3f10',
    marketplaces: {}
  },
  {
    id: 'ether-creeps',
    title: 'ETHER CREEPS',
    year: 2021,
    chain: 'ethereum',
    supply: 2,
    image: 'https://media.raster.art/f020cc675c7e44b622d7f9a8bc9eb791e4c2e83edf82d8af26a19805050cb46d',
    marketplaces: {}
  },

  // ============================================
  // TEZOS COLLECTIONS
  // ============================================
  {
    id: 'trader',
    title: 'Trader',
    year: 2023,
    chain: 'tezos',
    supply: 30,
    image: 'https://media.raster.art/144af5a54a18d4bf24ccce1b0929db59a9a7706b9c00b3ab19ee08d2da32b5c5',
    marketplaces: {
      objkt: 'https://objkt.com/collections/trader'
    }
  },
  {
    id: 'alchemy-tez',
    title: 'Alchemy',
    year: 2023,
    chain: 'tezos',
    supply: 19,
    image: 'https://media.raster.art/36640f007abed0378fcc157986d9ea83cec0583c70519e3e488bf50efb614cde',
    marketplaces: {
      objkt: 'https://objkt.com/collections/alchemy'
    }
  },
  {
    id: 'parrot-party',
    title: 'Parrot Party',
    year: 2022,
    chain: 'tezos',
    supply: 50,
    image: 'https://media.raster.art/7331311a9ed7806ab439b0cda82444eac71931f42c8e0b3f4c1392b4ab138e57',
    marketplaces: {
      objkt: 'https://objkt.com/collections/parrot-party'
    }
  },
  {
    id: 'warehouse-001',
    title: 'Warehouse 001',
    year: 2022,
    chain: 'tezos',
    supply: 15,
    image: 'https://media.raster.art/a39563b0bc287f7d2542d82f780bb54376f566d10549bd3950746180adcd6516',
    marketplaces: {
      objkt: 'https://objkt.com/collections/warehouse-001'
    }
  },
  {
    id: 'the-creeps',
    title: 'The Creeps',
    year: 2022,
    chain: 'tezos',
    supply: 6,
    image: 'https://media.raster.art/db5e41bb54ed799faabe81ae806870ef1bcb01f02f519a261dcc0de6f7d53aaa',
    marketplaces: {
      objkt: 'https://objkt.com/collections/the-creeps'
    }
  },
  {
    id: 'hustler',
    title: 'Hustler',
    year: 2022,
    chain: 'tezos',
    supply: 15,
    image: 'https://media.raster.art/19c8a1b7b4efbd73e545a22a5b106234bfebd6a01170e0f1816f56d1235a3505',
    marketplaces: {
      objkt: 'https://objkt.com/collections/hustler'
    }
  },
  {
    id: 'birtday-boi',
    title: 'Birtday Boi',
    year: 2022,
    chain: 'tezos',
    supply: 100,
    image: 'https://media.raster.art/804c31630e7577597b00b1bd9fc22e4712c57ae7c8a345c013f083a370ecff41',
    marketplaces: {
      objkt: 'https://objkt.com/collections/birtday-boi'
    }
  },
  {
    id: 'beady-eyes',
    title: 'Beady Eyes',
    year: 2022,
    chain: 'tezos',
    supply: 25,
    image: 'https://media.raster.art/ddbce992d3ecc5393904077205e55c5d045c0f96d525d37257181a623e8494fd',
    marketplaces: {
      objkt: 'https://objkt.com/collections/beady-eyes'
    }
  },
  {
    id: 'death-watch',
    title: 'Death Watch',
    year: 2022,
    chain: 'tezos',
    supply: 6,
    image: 'https://media.raster.art/98dac89a3e81ed329de1ab0371a971bacba6522e28715afc01c3bd2487d5e618',
    marketplaces: {
      objkt: 'https://objkt.com/collections/death-watch'
    }
  },
  {
    id: 'cretin',
    title: 'Cretin',
    year: 2022,
    chain: 'tezos',
    supply: 25,
    image: 'https://media.raster.art/8c6a218114a8e8024718b44d7985aa99d4110caa4d7277e212179525a8be771a',
    marketplaces: {
      objkt: 'https://objkt.com/collections/cretin'
    }
  },
  {
    id: 'there-you-go-bruh',
    title: 'There you go, bruh',
    year: 2022,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/f8f111f56391917bda0e6e49e5d51905eb32040c4fb524e4ddf92467e52c0c35',
    marketplaces: {}
  },
  {
    id: 'giz-a-light-fam',
    title: 'Giz a light, fam',
    year: 2022,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/bdbc51dfff99ea832f7eeb11dd1fcd969202a4774f8d6197baa436be642837a8',
    marketplaces: {}
  },
  {
    id: 'life-scan',
    title: 'Life Scan',
    year: 2022,
    chain: 'tezos',
    supply: 50,
    image: 'https://media.raster.art/c18bf3f73130d7f2ab3277226e1fcc5bb84abe51150b406ef6318204b866924c',
    marketplaces: {
      objkt: 'https://objkt.com/collections/life-scan'
    }
  },
  {
    id: 'the-lone-stranger',
    title: 'The Lone Stranger',
    year: 2022,
    chain: 'tezos',
    supply: 16,
    image: 'https://media.raster.art/c4f1289703e1096fd751fc2508a96e5a8c70d12d6a6639c7380a421701192784',
    marketplaces: {
      objkt: 'https://objkt.com/collections/the-lone-stranger'
    }
  },
  {
    id: 'burn-em-all',
    title: 'Burn Em All',
    year: 2022,
    chain: 'tezos',
    supply: 15,
    image: 'https://media.raster.art/94d04c5442d96ab78ddb332078c82fed1f934709d39d7abe322edeb9f4e220c8',
    marketplaces: {
      objkt: 'https://objkt.com/collections/burn-em-all'
    }
  },
  {
    id: 'stranger-danger',
    title: 'Stranger Danger',
    year: 2021,
    chain: 'tezos',
    supply: 22,
    image: 'https://media.raster.art/f226d33b5496c1f62029485c913a8d7ab39ced9e6923e39b82ee227e52ddf74d',
    marketplaces: {
      objkt: 'https://objkt.com/collections/stranger-danger'
    }
  },
  {
    id: 'happy-monday-guy',
    title: 'Happy Monday Guy',
    year: 2021,
    chain: 'tezos',
    supply: 3,
    image: 'https://media.raster.art/03b67679859a1e0822d1e0f1b8be1d85549e3b8ccd39efdf004226f2ffba8813',
    marketplaces: {}
  },
  {
    id: 'innocence',
    title: 'Innocence',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/9dcb99dbf449e3127d6a02e97a25df24dbb34aa2637848d666a72117e9dffaca',
    marketplaces: {}
  },
  {
    id: 'art-king',
    title: 'Art King',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/ddc3acff865e92ad50145e92222b19efa1f9c4a9bb32fcc72bbfadfac0cd03ac',
    marketplaces: {}
  },
  {
    id: 'me-and-i',
    title: 'Me and I',
    year: 2021,
    chain: 'tezos',
    supply: 15,
    image: 'https://media.raster.art/d72ba387af9aa2075ed774851424a2083916e927df209cd718eaeef14d7aba9c',
    marketplaces: {
      objkt: 'https://objkt.com/collections/me-and-i'
    }
  },
  {
    id: 'fuk-u-punks',
    title: 'Fuk u PuNks',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/12e76119da210ebbe57b5f8d73b867461a61cd258b70c5c78a854a4f111c9032',
    marketplaces: {}
  },
  {
    id: 'officer-soma',
    title: 'Officer Soma',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/e1aa8ac60f777ffec80be7a696203e8782e99faae51f4f28ea24a5c117eb6798',
    marketplaces: {}
  },
  {
    id: 'the-visit',
    title: 'The Visit',
    year: 2021,
    chain: 'tezos',
    supply: 2,
    image: 'https://media.raster.art/20c369dae13a371db3dde6eefca9a4a9d39a046756f4de65617bf147892d1ac8',
    marketplaces: {}
  },
  {
    id: 'good-pepe-morning',
    title: 'Good Pepe Morning',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/d4eccf2276f20c7fa6dde3a5dfafab646189e856ded5175c691e40a3c52d2734',
    marketplaces: {}
  },
  {
    id: 'the-firm',
    title: 'The Firm',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/41c90f3d34f0f60d5c4c4c891840a32397efdf1b1b155cfd07f51811c80fc158',
    marketplaces: {}
  },
  {
    id: 'shy-guy',
    title: 'Shy Guy',
    year: 2021,
    chain: 'tezos',
    supply: 10,
    image: 'https://media.raster.art/b5a792a758c3c242a60b5bba1cff485aec69b6170b412dc6d685d2e4e4605456',
    marketplaces: {
      objkt: 'https://objkt.com/collections/shy-guy'
    }
  },
  {
    id: 'burn-em',
    title: 'Burn Em',
    year: 2021,
    chain: 'tezos',
    supply: 10,
    image: 'https://media.raster.art/98d7460d40a9301ed261b270a90ff8dd258033132a49cbedc01c16a8d0e93fac',
    marketplaces: {
      objkt: 'https://objkt.com/collections/burn-em'
    }
  },
  {
    id: 'paranoia',
    title: 'Paranoia',
    year: 2021,
    chain: 'tezos',
    supply: 7,
    image: 'https://media.raster.art/5dd339eccdfa37973eebea6a8c18adc813977109915787f13952c20c835fafbd',
    marketplaces: {
      objkt: 'https://objkt.com/collections/paranoia'
    }
  },
  {
    id: '7-year-glitch',
    title: '7 Year Glitch',
    year: 2021,
    chain: 'tezos',
    supply: 5,
    image: 'https://media.raster.art/6508448430a780790221610b76db5e60c3c7086b6f5900ca71011512cc07e07d',
    marketplaces: {
      objkt: 'https://objkt.com/collections/7-year-glitch'
    }
  },
  {
    id: 'kitchen-party',
    title: 'Kitchen Party',
    year: 2021,
    chain: 'tezos',
    supply: 20,
    image: 'https://media.raster.art/d84cdd42c112cd0813ae9f4791f505cb3dc272c2d57727a960255203137ce60e',
    marketplaces: {
      objkt: 'https://objkt.com/collections/kitchen-party'
    }
  },
  {
    id: 'only-the-vain',
    title: 'Only the Vain',
    year: 2021,
    chain: 'tezos',
    supply: 9,
    image: 'https://media.raster.art/80d0a62d0e3767282cfd3ce5861ce0bad8abdfb88f45277c3f985361d0736c37',
    marketplaces: {}
  },
  {
    id: 'the-echo-chamber',
    title: 'The Echo Chamber',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/2293b6a739582243e64d87906c8fad06987d6856729954ba4934902f6757fa76',
    marketplaces: {}
  },
  {
    id: 'good-mornings',
    title: 'Good Mornings',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/8e7725bdbb9f130e44bd4cf1803b48b27f4b9976b56bd87e9cd32a72dfa59f94',
    marketplaces: {}
  },
  {
    id: 'full-metal-fomo',
    title: 'Full Metal Fomo',
    year: 2021,
    chain: 'tezos',
    supply: 30,
    image: 'https://media.raster.art/951cca04a855f39c7751fef650156c63e859ad664879e5ab2167cc55f3b5a623',
    marketplaces: {
      objkt: 'https://objkt.com/collections/full-metal-fomo'
    }
  },
  {
    id: 'inbox',
    title: 'Inbox',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/529c359eb0a4fdae7cfa2ca303c46e30651faae5c3660afab6e636fcca596dd9',
    marketplaces: {
      objkt: 'https://objkt.com/collections/inbox'
    }
  },
  {
    id: 'over-friendly',
    title: 'Over Friendly',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/9ec9e1de0e3bb04012e463e1920834acebd96d69f2304a3106116911bda9621d',
    marketplaces: {}
  },
  {
    id: 'ursulas-secret',
    title: "Ursula's Secret",
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/4a9adf09091a2dd15c2c586b0d66c5da2d689f95ff613a4543412c5d3c8803a5',
    marketplaces: {}
  },
  {
    id: 'the-invitation',
    title: 'The Invitation',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/494ca69c28751d61b4f4cb23cf80132f3e1f3868103fb2be1b63901ccccee745',
    marketplaces: {}
  },
  {
    id: 'show-n-tell',
    title: 'Show n Tell',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/fb26f628f325a89588fd5dfc57a099d01da82544aa8b543942cfd703dd1246be',
    marketplaces: {}
  },
  {
    id: 'about-last-night',
    title: 'About Last Night',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/c688e09d03593b80cae368b00ba87e1a88adbdc2ea9f877961a99d4ce6708890',
    marketplaces: {}
  },
  {
    id: 'the-wanting',
    title: 'The Wanting',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/c47a495a8a796857fc3d21f2d25e197a1ac9a0187d04323c78820c298148d337',
    marketplaces: {}
  },
  {
    id: 'blue-derango',
    title: 'Blue Derango',
    year: 2021,
    chain: 'tezos',
    supply: 5,
    image: 'https://media.raster.art/df9f498ff36f8f062ed84e8a89663ae571434e100f9812038a7397ddddd88ec2',
    marketplaces: {
      objkt: 'https://objkt.com/collections/blue-derango'
    }
  },
  {
    id: 'green-derango',
    title: 'Green Derango',
    year: 2021,
    chain: 'tezos',
    supply: 5,
    image: 'https://media.raster.art/2a495e4ff040df2ce1095b04a74d25070703323c83cd9676c68e2c9de2706937',
    marketplaces: {
      objkt: 'https://objkt.com/collections/green-derango'
    }
  },
  {
    id: 'loose-change',
    title: 'Loose Change',
    year: 2021,
    chain: 'tezos',
    supply: 1,
    image: 'https://media.raster.art/f9fbc9b5a7051e8daa741952902b8eb1442029a653d8c0fcbafbbf7ba7b72c7b',
    marketplaces: {}
  }
];
