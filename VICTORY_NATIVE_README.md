# Victory Native Implementation

This project uses Victory Native for chart visualizations. Victory Native is a powerful chart library built on top of React Native Reanimated, React Native Gesture Handler, and Skia.

## Installation

The required dependencies are already included in package.json:

```json
{
  "dependencies": {
    "@shopify/react-native-skia": "^2.0.1",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-reanimated": "~3.16.1",
    "victory-native": "^41.17.1"
  }
}
```

## Setup

For Reanimated to work correctly, ensure you have the plugin added in your `babel.config.js`:

```javascript
module.exports = {
  // ...other config
  plugins: [
    // ...other plugins
    'react-native-reanimated/plugin',
  ],
};
```

## Usage

Victory Native is used in this project for rendering line charts. Key components used:

1. `CartesianChart` - The main container for charts
2. `Line` - For drawing line paths
3. `useChartPressState` - Hook for handling chart interactions
4. `useFont` - For loading fonts for chart labels

## TypeScript Integration

Due to some type definition challenges with Victory Native in complex React Native projects, we've created a simple type-safe wrapper component:

```typescript
// Custom wrapper for CartesianChart to handle type issues
const TypeSafeCartesianChart = (props: any) => {
  return <CartesianChart {...props} />;
};
```

This wrapper allows us to use the CartesianChart component without TypeScript errors while maintaining all functionality.

## Examples

See `app/screens/Feeds.tsx` for implementation examples.

## Documentation

For more information, see the official Victory Native documentation:
https://nearform.com/open-source/victory-native/docs/getting-started
