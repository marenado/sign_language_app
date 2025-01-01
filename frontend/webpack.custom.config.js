const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  // Entry point of the application
  entry: "./src/index.js",

  // Output directory and file for the build
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true, // Clean the output directory before building
  },

  // Development server configuration
  devServer: {
    static: path.resolve(__dirname, "dist"),
    port: 3000, // Development server port
    open: true, // Automatically open the app in the browser
    hot: true, // Enable Hot Module Replacement
  },

  // Mode configuration
  mode: "development", // Can be set to 'production' or 'development'

  // Module rules for handling different file types
  module: {
    rules: [
      {
        test: /\.js$/, // Transform JavaScript files
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react", // Transform React JSX
            ],
            plugins: [
              "@babel/plugin-proposal-nullish-coalescing-operator",
              "@babel/plugin-proposal-optional-chaining",
            ],
          },
        },
      },
      {
        test: /\.css$/, // Process CSS files
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/, // Handle images
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/, // Handle fonts
        type: "asset/resource",
      },
    ],
  },

  // Plugins for additional functionality
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html", // Template for generating HTML
    }),
  ],

  // Resolve module imports
  resolve: {
    extensions: [".js", ".jsx"], // Resolve these file types
  },
};
