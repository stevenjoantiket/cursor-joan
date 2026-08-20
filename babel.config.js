module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@ds': './design-system',
            '@app': './src',
          },
        },
      ],
    ],
  };
};
