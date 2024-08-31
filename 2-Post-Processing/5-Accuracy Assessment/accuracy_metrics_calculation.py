import arcpy
from arcpy.sa import *
import csv

# Set up your environment and inputs
arcpy.env.workspace = r"C:\Tarig\Edinburgh\Masters Courses\Dissertation\Accuracy assemssment\Results\validation"
arcpy.env.overwriteOutput = True

# Input shapefile
validation_shapefile = r"C:\Tarig\Edinburgh\Masters Courses\Dissertation\Accuracy assemssment\Results\validation\comp_grid_sel.shp"

# List of rasters to analyze
rasters = [
    ("S2_hom_15.tif", "S2_Hom"),
    ("s2_dis_p53.tif", "S2_Diss"),
    ("Phomgen_20.tif", "PS_Hom"),
    ("Diss035_cleaned.tif", "PS_Diss")
]

# Prepare to collect statistics for each model
results = []

for raster, model_field in rasters:
    print(f"\nProcessing {raster}...")

    # Add a field to store the model prediction
    arcpy.AddField_management(validation_shapefile, model_field, "SHORT")

    # Perform Zonal Statistics as Table
    zonal_table = f"in_memory/zonal_table_{model_field}"
    ZonalStatisticsAsTable(validation_shapefile, "FID", raster, zonal_table, "DATA", "MAXIMUM")

    # Ensure that the join does not affect other fields
    arcpy.management.DeleteField(validation_shapefile, ["MAX"])

    # Join the zonal statistics table back to the shapefile
    arcpy.JoinField_management(validation_shapefile, "FID", zonal_table, "FID", ["MAX"])

    # Update the model field based on the maximum value in the zonal statistics
    with arcpy.da.UpdateCursor(validation_shapefile, ["MAX", model_field]) as cursor:
        for row in cursor:
            # If the maximum value is 1, then at least one pixel in the grid cell was damaged
            if row[0] == 1:
                row[1] = 1  # Model predicts damage
            else:
                row[1] = 0  # No damage predicted by the model
            cursor.updateRow(row)

    # Clean up by removing the in-memory table
    arcpy.Delete_management(zonal_table)

    # Initialize counters for accuracy assessment
    true_positive = 0
    false_positive = 0
    false_negative = 0
    true_negative = 0

    # Perform the accuracy assessment
    with arcpy.da.SearchCursor(validation_shapefile, ["Damage", model_field]) as cursor:
        for row in cursor:
            true_damage = row[0]
            model_damage = row[1]

            if true_damage == 1 and model_damage == 1:
                true_positive += 1
            elif true_damage == 0 and model_damage == 1:
                false_positive += 1
            elif true_damage == 1 and model_damage == 0:
                false_negative += 1
            elif true_damage == 0 and model_damage == 0:
                true_negative += 1

    # Calculate accuracy metrics
    total = true_positive + false_positive + false_negative + true_negative
    overall_accuracy = (true_positive + true_negative) / total
    precision = true_positive / (true_positive + false_positive) if (true_positive + false_positive) > 0 else None
    recall = true_positive / (true_positive + false_negative) if (true_positive + false_negative) > 0 else None
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision is not None and recall is not None and (precision + recall) > 0) else None
    specificity = true_negative / (true_negative + false_positive) if (true_negative + false_positive) > 0 else None
    omission_error = false_negative / (true_positive + false_negative) if (true_positive + false_negative) > 0 else None
    commission_error = false_positive / (true_positive + false_positive) if (true_positive + false_positive) > 0 else None

    # Calculate Expected Accuracy (p_e) for Kappa
    p_e = (((true_positive + false_positive) / total) * ((true_positive + false_negative) / total) +
           ((true_negative + false_positive) / total) * ((true_negative + false_negative) / total))

    # Calculate Kappa Coefficient
    kappa = (overall_accuracy - p_e) / (1 - p_e) if p_e < 1 else None

    # Append results to the list
    results.append({
        "Model": model_field,
        "True_Positive": true_positive,
        "False_Positive": false_positive,
        "False_Negative": false_negative,
        "True_Negative": true_negative,
        "Overall_Accuracy": overall_accuracy,
        "Precision": precision,
        "Recall": recall,
        "F1_Score": f1_score,
        "Specificity": specificity,
        "Omission_Error": omission_error,
        "Commission_Error": commission_error,
        "Kappa": kappa
    })

    # Print the results on screen
    print(f"Model: {model_field}")
    print(f"  True Positives: {true_positive}")
    print(f"  False Positives: {false_positive}")
    print(f"  False Negatives: {false_negative}")
    print(f"  True Negatives: {true_negative}")
    print(f"  Overall Accuracy: {overall_accuracy:.2%}")
    if precision is not None:
        print(f"  Precision: {precision:.2%}")
    else:
        print("  Precision: Not applicable")
    if recall is not None:
        print(f"  Recall (Sensitivity): {recall:.2%}")
    else:
        print("  Recall: Not applicable")
    if f1_score is not None:
        print(f"  F1 Score: {f1_score:.2%}")
    else:
        print("  F1 Score: Not applicable")
    if specificity is not None:
        print(f"  Specificity: {specificity:.2%}")
    else:
        print("  Specificity: Not applicable")
    if omission_error is not None:
        print(f"  Omission Error Rate: {omission_error:.2%}")
    else:
        print("  Omission Error Rate: Not applicable")
    if commission_error is not None:
        print(f"  Commission Error Rate: {commission_error:.2%}")
    else:
        print("  Commission Error Rate: Not applicable")
    if kappa is not None:
        print(f"  Kappa Coefficient: {kappa:.2f}")
    else:
        print("  Kappa Coefficient: Not applicable")

# Export the results to a CSV file
output_csv = r"C:\Tarig\Edinburgh\Masters Courses\Dissertation\Accuracy assemssment\Results\validation\damage_assessment_results.csv"
with open(output_csv, mode='w', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=["Model", "True_Positive", "False_Positive", "False_Negative", "True_Negative", "Overall_Accuracy", "Precision", "Recall", "F1_Score", "Specificity", "Omission_Error", "Commission_Error", "Kappa"])
    writer.writeheader()
    for result in results:
        writer.writerow(result)

print(f"\nResults saved to {output_csv}")
