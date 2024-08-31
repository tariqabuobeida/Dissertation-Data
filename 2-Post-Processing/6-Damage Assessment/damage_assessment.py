import arcpy
import os

# Define paths
output_dir = " M:\Dissertation Data\Post-Processing\Damage Assessment"
raster = "PS_Dissimilarity_Thresholded.tif"
polygon_output = f"{output_dir}/{raster.split('.')[0]}_polygon.shp"
intersect_output = f"{output_dir}/AlGineina_buildings_damaged.shp"
intersect_idp_output = f"{output_dir}/IDP_Camps_Damaged_Buildings.shp"

# Step 1: Convert the raster to a polygon (isolating damaged areas)
arcpy.RasterToPolygon_conversion(
    in_raster=raster,
    out_polygon_features=polygon_output,
    simplify="NO_SIMPLIFY",
    raster_field="VALUE"
)

# Step 2: Remove polygons where the gridcode is 0 (non-damaged areas)
arcpy.management.MakeFeatureLayer(polygon_output, "polygon_layer")
arcpy.management.SelectLayerByAttribute("polygon_layer", "NEW_SELECTION", '"gridcode" = 0')
arcpy.management.DeleteFeatures("polygon_layer")
print(f"Processed {raster}, resulting polygons saved at {polygon_output}")

# Step 3: Intersect the isolated damaged polygons with the building footprints
arcpy.analysis.Intersect(
    in_features=[polygon_output, "AlGineina_buildings_footprints.shp"],
    out_feature_class=intersect_output,
    join_attributes="ALL",
    cluster_tolerance="-1 Unknown",
    output_type="INPUT"
)

# Step 4: Add a 'damage' field to the intersected building footprints
arcpy.management.AddField(intersect_output, "damage", "SHORT")

# Step 5: Update the 'damage' field to mark the intersected buildings as damaged
with arcpy.da.UpdateCursor(intersect_output, ["damage"]) as cursor:
    for row in cursor:
        row[0] = 1
        cursor.updateRow(row)

# Step 6: Save the damaged buildings to a separate shapefile
arcpy.management.CopyFeatures(intersect_output, f"{output_dir}/Damaged_Buildings_Footprints.shp")
print(f"Damaged buildings footprints saved at {output_dir}/Damaged_Buildings_Footprints.shp")

# Step 7: Intersect footprints with IDP camps and count damaged buildings
arcpy.analysis.Intersect(
    in_features=[f"{output_dir}/Damaged_Buildings_Footprints.shp", "IDP_camps.shp"],
    out_feature_class=intersect_idp_output,
    join_attributes="ALL",
    cluster_tolerance="-1 Unknown",
    output_type="INPUT"
)

# Step 8: Count damaged buildings within each IDP camp
idp_camp_damage = {}
with arcpy.da.SearchCursor(intersect_idp_output, ["Name", "damage"]) as cursor:
    for row in cursor:
        if row[1] == 1:
            if row[0] not in idp_camp_damage:
                idp_camp_damage[row[0]] = 1
            else:
                idp_camp_damage[row[0]] += 1

# Step 9: Print results and save to CSV
csv_output = f"{output_dir}/IDP_Camp_Damage_Assessment.csv"
with open(csv_output, 'w') as csv_file:
    csv_file.write("IDP_Camp, Damaged_Buildings\n")
    for camp, damage_count in idp_camp_damage.items():
        csv_file.write(f"{camp}, {damage_count}\n")
        print(f"{camp}: {damage_count} damaged buildings")

