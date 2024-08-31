// Define the new Area of Interest (AOI) for Algeneina
var aoi = geometry;

// Pre-event images for averaging
var preEventImages = ee.ImageCollection.fromImages([
  image, image2, image3, image4
]);

// Post-event images for averaging
var postEventImages = ee.ImageCollection.fromImages([
  image5, image6, image7, image8, image9, image10
]);

// Select the appropriate bands (NIR, Red, Green, Blue) for homogeneity calculation
var selectedBands = ['b4', 'b3', 'b2', 'b1']; // NIR, Red, Green

// Function to mask vegetation only, applied to processed composites for homogeneity analysis
function maskVegetation(image) {
  var ndvi = image.normalizedDifference(['b4', 'b3']);  // NIR and Red bands for NDVI
  var vegetationMask = ndvi.lt(0.25);
  return image.updateMask(vegetationMask).divide(10000);
}

// Function to calculate combined homogeneity for all specified bands
function calculateCombinedHomogeneity(image) {
  var bands = ['b4', 'b3', 'b2', 'b1'];  // NIR, Red, Green
  var homogeneityImages = bands.map(function(band) {
    var quantizedImage = image.select([band]).multiply(64).toInt();
    var glcm = quantizedImage.glcmTexture({size: 1, average: true});
    return glcm.select([band + '_idm']);
  });
  return ee.Image.cat(homogeneityImages).reduce(ee.Reducer.mean()).rename('combined_homogeneity');
}

// Function to calculate combined dissimilarity for all specified bands
function calculateCombinedDissimilarity(image) {
  var bands = ['b4', 'b3', 'b2', 'b1'];  // NIR, Red, Green
  var dissimilarityImages = bands.map(function(band) {
    var quantizedImage = image.select([band]).multiply(64).toInt();
    var glcm = quantizedImage.glcmTexture({size: 1, average: true});
    return glcm.select([band + '_diss']);
  });
  return ee.Image.cat(dissimilarityImages).reduce(ee.Reducer.mean()).rename('combined_dissimilarity');
}

// Function to calculate combined contrast for all specified bands
function calculateCombinedContrast(image) {
  var bands = ['b4', 'b3', 'b2', 'b1'];  // NIR, Red, Green
  var contrastImages = bands.map(function(band) {
    var quantizedImage = image.select([band]).multiply(64).toInt();
    var glcm = quantizedImage.glcmTexture({size: 1, average: true});
    return glcm.select([band + '_contrast']);
  });
  return ee.Image.cat(contrastImages).reduce(ee.Reducer.mean()).rename('combined_contrast');
}

// Function to process images: apply vegetation mask and calculate combined homogeneity, dissimilarity, and contrast
function processImages(imageCollection, calculateMetricFunction) {
  var processedCollection = imageCollection.map(maskVegetation);
  var meanImage = processedCollection.mean();
  return calculateMetricFunction(meanImage);
}

// Process pre-event and post-event images for homogeneity
var preEventCombinedHomogeneity = processImages(preEventImages, calculateCombinedHomogeneity);
var postEventCombinedHomogeneity = processImages(postEventImages, calculateCombinedHomogeneity);
var combinedHomogeneityDiff = preEventCombinedHomogeneity.subtract(postEventCombinedHomogeneity).abs();

// Process pre-event and post-event images for dissimilarity
var preEventCombinedDissimilarity = processImages(preEventImages, calculateCombinedDissimilarity);
var postEventCombinedDissimilarity = processImages(postEventImages, calculateCombinedDissimilarity);
var combinedDissimilarityDiff = preEventCombinedDissimilarity.subtract(postEventCombinedDissimilarity).abs();

// Process pre-event and post-event images for contrast
var preEventCombinedContrast = processImages(preEventImages, calculateCombinedContrast);
var postEventCombinedContrast = processImages(postEventImages, calculateCombinedContrast);
var combinedContrastDiff = preEventCombinedContrast.subtract(postEventCombinedContrast).abs();

// Visualization parameters for PlanetScope imagery
var visParams = {bands: ['b3', 'b2', 'b1'], min: 0, max: 4000};  // RGB visualization

// Center the map and visualize the images and combined homogeneity, dissimilarity, and contrast differences
Map.centerObject(aoi, 11);
Map.addLayer(preEventImages.mean().select(['b3', 'b2', 'b1']).clip(aoi), visParams, 'Pre-Event Image (Averaged)');  // RGB visualization
Map.addLayer(postEventImages.mean().select(['b3', 'b2', 'b1']).clip(aoi), visParams, 'Post-Event Image (Averaged)');  // RGB visualization
Map.addLayer(combinedHomogeneityDiff.clip(aoi), {min: 0, max: 0.25, palette: ['blue', 'white', 'red']}, 'Combined Enhanced Homogeneity Difference');
Map.addLayer(combinedDissimilarityDiff.clip(aoi), {min: 0, max: 0.5, palette: ['blue', 'white', 'red']}, 'Combined Enhanced Dissimilarity Difference');
Map.addLayer(combinedContrastDiff.clip(aoi), {min: 0, max: 0.5, palette: ['blue', 'white', 'red']}, 'Combined Enhanced Contrast Difference');

// **Generate Histograms for the Difference Images with Threshold Lines**

function createHistogramWithThreshold(image, region, scale, title, threshold, color) {
  var histogram = ui.Chart.image.histogram({
    image: image,
    region: region,
    scale: scale,
    maxBuckets: 50
  }).setOptions({
    title: title,
    hAxis: {title: title + ' Value'},
    vAxis: {title: 'Count'},
    series: {0: {color: color}},
    legend: {position: 'none'}
  });

  var thresholdLine = {
    type: 'line',
    color: 'black',
    lineWidth: 2,
    value: threshold
  };

  return histogram.setOptions({
    annotations: {
      stem: {
        color: 'black',
        length: 8
      }
    },
    series: {
      0: {
        lineWidth: 2,
        pointSize: 0,
        lineDashStyle: [2, 2]
      },
      1: thresholdLine
    }
  });
}

// Histogram of Homogeneity Difference with Threshold Line at 0.20
var homogeneityHist = createHistogramWithThreshold(combinedHomogeneityDiff, aoi, 30, 'Homogeneity Difference', 0.20, 'blue');
print(homogeneityHist);

// Histogram of Dissimilarity Difference with Threshold Line at 0.35
var dissimilarityHist = createHistogramWithThreshold(combinedDissimilarityDiff, aoi, 30, 'Dissimilarity Difference', 0.35, 'red');
print(dissimilarityHist);

// Histogram of Contrast Difference (No Threshold Line)
var contrastHist = ui.Chart.image.histogram({
  image: combinedContrastDiff,
  region: aoi,
  scale: 30,
  maxBuckets: 50
}).setOptions({
  title: 'Histogram of Contrast Difference',
  hAxis: {title: 'Contrast Difference'},
  vAxis: {title: 'Count'},
  series: {0: {color: 'green'}},
  legend: {position: 'none'}
});
print(contrastHist);

// Export the pre-event averaged image to Google Drive
Export.image.toDrive({
  image: preEventImages.mean().select(['b3', 'b2', 'b1']).clip(aoi),
  description: 'Al-Gineina_PreEvent_Averaged',
  scale: 3,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the post-event averaged image to Google Drive
Export.image.toDrive({
  image: postEventImages.mean().select(['b3', 'b2', 'b1']).clip(aoi),
  description: 'Al-Gineina_PostEvent_Averaged',
  scale: 3,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the combined homogeneity difference result
Export.image.toDrive({
  image: combinedHomogeneityDiff.clip(aoi),
  description: 'Al-Gineina_Planet_Homogeneity',
  scale: 3,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the combined dissimilarity difference result
Export.image.toDrive({
  image: combinedDissimilarityDiff.clip(aoi),
  description: 'Al-Gineina_Planet_Dissimilarity',
  scale: 3,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

// Export the combined contrast difference result
Export.image.toDrive({
  image: combinedContrastDiff.clip(aoi),
  description: 'Al-Gineina_Planet_Contrast',
  scale: 3,
  region: aoi,
  fileFormat: 'GeoTIFF',
  folder: 'EarthEngineExports'
});

