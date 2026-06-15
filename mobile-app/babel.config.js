module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Reanimated plugin harus selalu di paling akhir
      "react-native-reanimated/plugin",
    ],
  };
};
