import arcpy
import os

# Define the input directory and output directory
work_dir = r"M\"
output_dir = os.path.join(work_dir, "results")

# Ensure the output directory exists
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Path to the AOI shapefile
aoi_shapefile = os.path.join(work_dir, "AOI.shp")

# List of rasters to clip and normalize
rasters = [
    "Al-Gineina_Planet_Dissimilarity.tif",
    "Al-Gineina_Planet_Homogeneity.tif",
    "S2_Dissimilarity_Difference_Map_Algenina.tif",
    "S2_Homogeneity_Difference_Map_Algenina.tif"
]

# Loop through each raster
for raster_name in rasters:
    # Define the full path to the input raster
    raster_path = os.path.join(work_dir, raster_name)
    
    # Define the path for the clipped raster
    clipped_raster = os.path.join(work_dir, f"clipped_{raster_name}")
    
    # Clip the raster to the AOI
    arcpy.management.Clip(raster_path, "#", clipped_raster, aoi_shapefile, "#", "ClippingGeometry", "NO_MAINTAIN_EXTENT")
    
    # Get the minimum and maximum values of the clipped raster
    min_result = arcpy.GetRasterProperties_management(clipped_raster, "MINIMUM")
    max_result = arcpy.GetRasterProperties_management(clipped_raster, "MAXIMUM")
    raster_min = float(min_result.getOutput(0))
    raster_max = float(max_result.getOutput(0))
    
    # Define the expression for normalization
    # (Raster - Min) / (Max - Min)
    normalized_raster = arcpy.sa.Raster(clipped_raster)
    normalized_raster = (normalized_raster - raster_min) / (raster_max - raster_min)
    
    # Define the full path to the output raster
    output_raster = os.path.join(output_dir, f"normalized_{raster_name}")
    
    # Save the normalized raster
    normalized_raster.save(output_raster)

    print(f"Clipped and normalized raster saved: {output_raster}")

print("Clipping and normalization completed for all rasters.")
