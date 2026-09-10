This is. a local copy of https://github.com/frontiersi/mapbox-gl-esri-sources

We use this in preference to the npm package for better compatabilty with newer version of maplibre-gl. 

The npm package appears to be lacking the check/call to `setTiles` that is supposed to be in v0.0.7 but is not present in the published package.

The original source code was published under the [Apache-2.0](https://choosealicense.com/licenses/apache-2.0/) license