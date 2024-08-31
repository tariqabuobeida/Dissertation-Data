// Define the new Area of Interest (AOI) for Algeneina
var aoi = geometry;

// Visualization parameters for Sentinel-2 imagery
var visParams = {bands: ['B4', 'B3', 'B2'], min: 0, max: 8000};

// Loading image collections without any masking for direct visualization
var preEventCollection = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate('2023-03-01', '2023-03-31')
  .filterBounds(aoi)
  .mosaic();

var postEventCollection = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate('2024-03-01', '2024-03-31')
  .filterBounds(aoi)
  .mosaic();

// Function to mask clouds and vegetation only, applied to processed composites for homogeneity analysis
function maskS2cloudsVegetation(image) {
  var scl = image.select('SCL');
  var ndvi = image.normalizedDifference(['B8', 'B4']);
  var cloudShadowMask = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
  var vegetationMask = ndvi.lt(0.2);
  return image.updateMask(cloudShadowMask.and(vegetationMask)).divide(10000);
}

// Function to calculate NDVI
function calculateNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// Function to calculate NDWI
function calculateNDWI(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  return image.addBands(ndwi);
}

// Function to calculate combined homogeneity for all 10m resolution bands
function calculateCombinedHomogeneity(image) {
  var bands = ['B2', 'B3', 'B4', 'B8'];
  var homogeneityImages = bands.map(function(band) {
    var quantizedImage = image.select([band]).multiply(64).toInt();
    var glcm = quantizedImage.glcmTexture({size: 1, average: true});
    return glcm.select([band + '_idm']);
  });
  return ee.Image.cat(homogeneityImages).reduce(ee.Reducer.mean()).rename('combined_homogeneity');
}

// Function to calculate combined dissimilarity for all 10m resolution bands
function calculateCombinedDissimilarity(image) {
  var bands = ['B2', 'B3', 'B4', 'B8'];
  var dissimilarityImages = bands.map(function(band) {
    var quantizedImage = image.select([band]).multiply(64).toInt();
    var glcm = quantizedImage.glcmTexture({size: 1, average: true});
    return glcm.select([band + '_diss']);
  });
  return ee.Image.cat(dissimilarityImages).reduce(ee.Reducer.mean()).rename('combined_dissimilarity');
}

// Apply cloud and vegetation mask, and calculate NDVI and NDWI
var preEventProcessed = maskS2cloudsVegetation(preEventCollection);
var postEventProcessed = maskS2cloudsVegetation(postEventCollection);

preEventProcessed = calculateNDVI(preEventProcessed);
postEventProcessed = calculateNDVI(postEventProcessed);

preEventProcessed = calculateNDWI(preEventProcessed);
postEventProcessed = calculateNDWI(postEventProcessed);

// Calculate combined homogeneity and dissimilarity
var preEventCombinedHomogeneity = calculateCombinedHomogeneity(preEventProcessed);
var postEventCombinedHomogeneity = calculateCombinedHomogeneity(postEventProcessed);
var combinedHomogeneityDiff = preEventCombinedHomogeneity.subtract(postEventCombinedHomogeneity).abs();

var preEventCombinedDissimilarity = calculateCombinedDissimilarity(preEventProcessed);
var postEventCombinedDissimilarity = calculateCombinedDissimilarity(postEventProcessed);
var combinedDissimilarityDiff = preEventCombinedDissimilarity.subtract(postEventCombinedDissimilarity).abs();

// Center the map and visualize the mosaicked images, NDVI, NDWI, combined homogeneity, and dissimilarity differences
Map.centerObject(aoi, 11);
Map.addLayer(preEventCollection.clip(aoi), visParams, 'Pre-Event Mosaic');
Map.addLayer(postEventCollection.clip(aoi), visParams, 'Post-Event Mosaic');

// Visualization parameters for NDVI and NDWI
var ndviVisParams = {min: 0, max: 1, palette: ['white', 'green']};
var ndwiVisParams = {min: 0, max: 1, palette: ['blue', 'white', 'brown']};

// Add NDVI and NDWI layers
Map.addLayer(preEventProcessed.select('NDVI').clip(aoi), ndviVisParams, 'Pre-Event NDVI');
Map.addLayer(postEventProcessed.select('NDVI').clip(aoi), ndviVisParams, 'Post-Event NDVI');
Map.addLayer(preEventProcessed.select('NDWI').clip(aoi), ndwiVisParams, 'Pre-Event NDWI');
Map.addLayer(postEventProcessed.select('NDWI').clip(aoi), ndwiVisParams, 'Post-Event NDWI');

// Add Homogeneity and Dissimilarity difference layers
Map.addLayer(combinedHomogeneityDiff.clip(aoi), {min: 0, max: 0.25, palette: ['blue', 'white', 'red']}, 'Combined Enhanced Homogeneity Difference');
Map.addLayer(combinedDissimilarityDiff.clip(aoi), {min: 0, max: 0.5, palette: ['blue', 'white', 'red']}, 'Combined Enhanced Dissimilarity Difference');

// Generate Histograms for the Difference Images
function createHistogram(image, region, scale, title, color) {
  return ui.Chart.image.histogram({
    image: image,
    region: region,
    scale: scale,
    maxBuckets: 50
  }).setOptions({
    title: title,
    hAxis: {title: 'Value'},
    vAxis: {title: 'Count'},
    series: {0: {color: color}},
    legend: {position: 'none'}
  });
}

// Histogram of Combined Homogeneity Difference
var homogeneityHist = createHistogram(combinedHomogeneityDiff, aoi, 10, 'Combined Homogeneity Difference', 'blue');
print(homogeneityHist);

// Histogram of Combined Dissimilarity Difference
var dissimilarityHist = createHistogram(combinedDissimilarityDiff, aoi, 10, 'Combined Dissimilarity Difference', 'red');
print(dissimilarityHist);

// Export the combined homogeneity difference result
Export.image.toDrive({
  image: combinedHomogeneityDiff.clip(aoi),
  description: 'S2_Combined_Enhanced_Homogeneity_Difference_Map_Algenina',
  scale: 10,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the combined dissimilarity difference result
Export.image.toDrive({
  image: combinedDissimilarityDiff.clip(aoi),
  description: 'S2_Combined_Enhanced_Dissimilarity_Difference_Map_Algenina',
  scale: 10,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the pre-event processed image
Export.image.toDrive({
  image: preEventProcessed.clip(aoi),
  description: 'S2_PreEvent_Processed_Map_Algenina',
  scale: 10,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the post-event processed image
Export.image.toDrive({
  image: postEventProcessed.clip(aoi),
  description: 'S2_PostEvent_Processed_Map_Algenina',
  scale: 10,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});
