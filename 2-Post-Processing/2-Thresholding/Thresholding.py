import arcpy
from arcpy.sa import *
import os  # Import the os module

# Set the workspace directory
arcpy.env.workspace = r"C:\Users\tarig\Desktop\Thresholding"

# List of rasters and their corresponding thresholds
rasters = {
    "normalized_Al-Gineina_Planet_Dissimilarity.tif": 0.020,
    "normalized_Al-Gineina_Planet_Homogeneity.tif": 0.176,
    "normalized_S2_Dissimilarity_Difference_Map_Algenina.tif": 0.039,
    "normalized_S2_Homogeneity_Difference_Map_Algenina.tif": 0.21
}

# Output directory
output_dir = r"C:\Users\tarig\Desktop\Thresholding\Results"

# Loop through each raster and apply reclassification
for raster_name, threshold in rasters.items():
    # Define the full path to the input raster
    raster_path = os.path.join(arcpy.env.workspace, raster_name)
    
    # Reclassify raster: values <= threshold to 0, > threshold to 1
    reclassified_raster = Reclassify(raster_path, "Value", RemapRange([[0, threshold, 0], [threshold, 1, 1]]))
    
    # Define the output path
    output_raster = os.path.join(output_dir, f"binarised_{raster_name}")
    
    # Save the reclassified raster
    reclassified_raster.save(output_raster)

    print(f"Binarised raster saved: {output_raster}")

print("Reclassification and binarization completed for all rasters.")
