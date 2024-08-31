import arcpy
import random

# Define workspace and input/output paths
arcpy.env.workspace = r" M:\Dissertation Data\Post-Processing\Random Gridding"
output_grid = r" M:\Dissertation Data\Post-Processing\Random Gridding\Output"
aoi = r" M:\Dissertation Data\Post-Processing\Random Gridding\AOI.shp"

# Create a fishnet of 20x20 meter cells within the AOI
arcpy.management.CreateFishnet(
    out_feature_class=output_grid,
    origin_coord="0 0",  # Starting point of the grid
    y_axis_coord="0 10",  # Y direction for the grid
    cell_width="20",  # Cell width
    cell_height="20",  # Cell height
    geometry_type="POLYGON",  # Output as polygons
    template=aoi,  # Clip to AOI boundaries
    labels="NO_LABELS"
)

# Add a field for random values
arcpy.management.AddField(output_grid, "RAND", "DOUBLE")

# Calculate random values for each cell
with arcpy.da.UpdateCursor(output_grid, ["RAND"]) as cursor:
    for row in cursor:
        row[0] = random.random()
        cursor.updateRow(row)

# Sort by random values in descending order
arcpy.management.Sort(output_grid, output_grid, [["RAND", "DESCENDING"]])

# Select the top 2,800 grid cells
selected_grid = r"C:\YourWorkspace\selected_grid.shp"
arcpy.management.SelectLayerByAttribute(output_grid, "NEW_SELECTION", "OBJECTID <= 2800")
arcpy.management.CopyFeatures(output_grid, selected_grid)

print("Random grid creation and selection completed.")
