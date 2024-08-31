import rasterio
import numpy as np
import scipy

# Load the raster
with rasterio.open('Phomgen_20.tif') as src:
    raster = src.read(1)
    profile = src.profile
from scipy.ndimage import label

# Identify connected components of value 2
structure = np.array([[1,1,1],
                      [1,1,1],
                      [1,1,1]])  # This defines the connectivity for the components

labeled_array, num_features = label(raster == 1, structure=structure)

# Remove isolated pixels (connected components with only one pixel)
for i in range(1, num_features + 1):
    if np.sum(labeled_array == i) == 1:
        raster[labeled_array == i] = 0
with rasterio.open('cleaned_raster.tif', 'w', **profile) as dst:
    dst.write(raster, 1)
