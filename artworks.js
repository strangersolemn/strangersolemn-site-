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
    id: 'sky-slasher',
    title: 'Sky Slasher',
    year: 2024,
    chain: 'ordinals',
    supply: 29,
    // Using first inscription as representative image
    representativeId: 'c3a522c317525230daaa6ce3e5d9d572fa5ba5f06851207e3bf29cbecacea706i0',
    image: 'https://ordinals.com/content/c3a522c317525230daaa6ce3e5d9d572fa5ba5f06851207e3bf29cbecacea706i0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    },
    // All inscription IDs (for reference/future use)
    inscriptionIds: [
      'c3a522c317525230daaa6ce3e5d9d572fa5ba5f06851207e3bf29cbecacea706i0',
      '8430344aa54a30c2932df9df80fb8d8ff2bd24128878ebe738dc749927c04fbci0',
      '61f9c27fa3dd2433f5c547ba83a9f0bebe970d4f3be4f7371bacb0fc7e0360cbi0',
      '322cd5cf4a08acaeeba47f07bee7c61280a0b1245036a68848353c3d911c9af2i0',
      '9f590e73c6797f656f6c702306681697047e35ac5543a2312fc04bcf32956ea3i0',
      '8e859a4f7c95d56f3deb938a69d2e23123204668a08d8181b9a5d0c3a0b18be7i0',
      '9a4c4952c7d3ee82c135fd7666af584a2484bff157cb38f42a584cfe237481e2i0',
      'b65b1e449250e12c6bca57d7f828ce3b42598821e60dfeb94bc74ac9286f4128i0',
      '7cda361c4882e60b995dffe6a54a5c61db11513070dd9c090fc1b0583f72cd9bi0',
      '39a7bc361fd9a2c00c12efa7f3a307a122c870f8f3fd373ffcc08272f7cd0c09i0',
      'ac4c9233599ca4d46a8d665bf93d6474dbee7c458118bacd8bc1ba2654581979i0',
      '4db80e68e21378cc707a7f17cbf21b5ecbc1d76186a7d0827d1e7ff06abe7b18i0',
      '932d51ec155879396068c9b8eddcebb8e7c88324fd64f4bb4977b65d9e020aeci0',
      '71dcf8ff7cde447f2a0c218bd5f8755fb245f2c0ec364a4a35a696d0e2d05e50i0',
      'efd496a2ccebdbd8f4e5f090aaddecaddaeef00bd85a38078f5b1496194b8ef8i0',
      '083e6842b39d0d2ad43a826cce8387b81c3ea3ecae89c7ef39717147d95d49aei0',
      'f5de82055c061fbd435049765109701418de2f3a64aa3e49ee534e7221817edbi0',
      'b72b997e05e23735a6a68615255c05d6e501ccf59364f2249e84d71f928803e5i0',
      'f75024c2560780e3a949126080fe2dd9ec1a748e892f12a9d45dd76256ab7531i0',
      '7ed8e93d7bc362de417465e4fba5c335387c1fd07eb12ad527859098d703c72ei0',
      'b6e3a24a7c0109f6285780f88bed22e035ffb969e1281c7451fc8a9724caa057i0',
      'beddf545ff9bd81441b8e1ddab8e8985af4e0d1f025ef0cda1057c99c8f0eaabi0',
      '3de61a41cf3eb90e2321cde7932517d816a5a3795f0c58eab312721e780639d1i0',
      '167664f3fae00aef0433a2f474c2d365d557fbb7698a7a49dc89b4f23408d382i0',
      '2e6a7aa0f92652b1733b0b97aa47e79572f146e3d7f590a7722c42c326facc88i0',
      '55eb16f2150cb0242b3037fcb4f472d29d16e714410ff10985a375dd458602bdi0',
      '4e55bcfb7cea445e80cd230ecc8f287f24c5db981bef67003e3eef7f69b613a6i0',
      'b650290c941270d0bd4250c37e8aeeae578e3c043a0a6e693757eebfbcca2b5ci0',
      '7ed803fff7fbed0493a4b403c98476864d763ce1b01fb56afffa8a88ca16e596i0'
    ]
  },
  {
    id: 'pepe-mcparrot',
    title: "Pepe Mc'Parrot",
    year: 2024,
    chain: 'ordinals',
    supply: 21,
    representativeId: '3133ec253494d81c57e04e49e8daaa540f203f0668d3eac59830949adbf74039i0',
    image: 'https://ordinals.com/content/3133ec253494d81c57e04e49e8daaa540f203f0668d3eac59830949adbf74039i0',
    marketplaces: {
      magicEden: 'https://magiceden.io/ordinals/marketplace/bpe',
      gamma: 'https://gamma.io/ordinals/collections/bpe'
    },
    inscriptionIds: [
      '3133ec253494d81c57e04e49e8daaa540f203f0668d3eac59830949adbf74039i0',
      '06d89addd9721d7ee60e3bcad1b9d0e37e30fca327c0a1c3801dfca3c3e94e7fi0',
      '73d664709bea4eb9b2a0f62ed5573b0c17d96a86b95bbb46cd6ec60a7ee3b1b3i0',
      '3b3b407a6d6fa84532caf7e6cd001018e047fc4889fb33e324cae1ea4399b3f5i0',
      '1b8574c30d50a319547373ce0e01e0d86682951275ccb36999135e0bba00b52ei0',
      '5c3d38d0ccc1a064f55eb196a2f2782459af0b526847814c9b07b18e5c5f76eci0',
      '7bf017f1122762f1dcf42eb46ce02ba82d03303d9b32fe09b1922a814f4660e7i0',
      '41e598985ff6a2d083a687e1b3680b4c274fff79c91fb9b59653f7cfc1543a19i0',
      '5d56936652eb51f3d48f96b4cbf7891560f32b1d51599dde6245a4f805c524cei0',
      'abd95f90b4bb73a4c60c2c57c3321e50413617ca0ff0df2fd625ad419e4bccf1i0',
      '2ce1f11c9ac16aaad2ea6f7f7614066668fd95a6a5c7d6f038cebd1d0b3c6e8di0',
      '1a67cc7af7402cb438a60833a10553230b85ff813b30fd9b015edb8f6fffef82i0',
      '416682f083d5929047af581acef64fde7de48f5f20cb60695a992f0779c5c64bi0',
      '1fb838dc7a6701b01a9df436503aba6466551895d661347444047dfcc808a73di0',
      '53b2b520510a5070bc3aa4b418b072550c0a1451954dac2518bcdc55159ae145i0',
      '5540e3722d49a21b39a7b0ef60dfb5a6c4e0642ce42b5fd8310d61abd50b912fi0',
      '41689f8800196571554ab09d376d514e5a2ea0538d660b1aede2c87ef1be8204i0',
      'e73cef3b93a63952f8946e5f57e967a3e6df166d0c11e7d5bd89d76e89949a4ai0',
      '187fcaba5955b3c0b39699766eab0ae5f3efb169bd9a669a522f9fd2d933c108i0',
      'c208ed1e0be1e5e6b0024b71aae35c16979fd93d07ec0e70ca2fe51cd03f5581i0',
      '6a5d4a90474963eba9e5b09ca4035acdf61dc5e686968dcdafb59dd1bff8cf49i0'
    ]
  }
];
