module.exports = function (api) {
  api.cache(true);
  
  const plugins = [];
  
  // 在生产环境移除console调用以优化性能
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  // 必须放在最后
  plugins.push('react-native-reanimated/plugin');
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
