import json
import math

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Geometry & Materials
        t1 = float(body.get('slabThickness', 140))
        l = float(body.get('screwLength', 160))
        d = float(body.get('screwDiameter', 8))
        rho_k = float(body.get('woodDensity', 420))
        Vd = float(body.get('shearLoad', 25.0))
        screw_count = int(body.get('screwCount', 4))
        
       
        connection_width = float(body.get('connectionWidth', 300))  # B
        connection_length = float(body.get('connectionLength', 400)) # L
        
        # 1. Eurocode 5 Analytical Calculations (Johansen Yield)
        fh_k = 0.082 * (1 - 0.01 * d) * rho_k
        fu_k = 800  
        My_Rk = 0.3 * fu_k * (d ** 2.6)
        t2 = l - t1
        
        F_vRk_1 = fh_k * t1 * d
        F_vRk_2 = fh_k * t2 * d
        F_vRk_3 = 1.15 * math.sqrt(2 * My_Rk * fh_k * d)
        
        single_characteristic_capacity = min(F_vRk_1, F_vRk_2, F_vRk_3) / 1000.0
        
        k_mod = 0.9
        gamma_M = 1.3
        single_design_capacity = (single_characteristic_capacity * k_mod) / gamma_M
        
        # Group effect (Effective number of screws)
        n_ef = screw_count
        total_design_capacity = single_design_capacity * n_ef
        
        # 🆕 2. Eurocode 5 Spacing and Geometric Verification
        # (Minimum Requirements)
        min_a1 = 5 * d     # Spacing parallel to grain
        min_a2 = 5 * d     # Spacing perpendicular to grain
        min_a3t = 12 * d   # Loaded end distance
        min_a4 = 4 * d     # Edge distance
        
       
        rows = 2
        cols = math.ceil(screw_count / rows)
        
        required_width = (2 * min_a4) + ((rows - 1) * min_a2)
        required_length = (2 * min_a3t) + ((cols - 1) * min_a1)
        
        geometry_status = "PASS"
        geom_error_msg = ""
        if connection_width < required_width or connection_length < required_length:
            geometry_status = "FAIL"
            geom_error_msg = f"Geometry Violation! Space too tight. Need min {required_width}x{required_length}mm area."

        # 3. Final Structural Limit State Verification
        structural_status = "SAFE" if total_design_capacity >= Vd else "UNSAFE"
        
        
        final_status = "SAFE" if (structural_status == "SAFE" and geometry_status == "PASS") else "UNSAFE/FAIL"
        if geometry_status == "FAIL":
            final_status = "GEOMETRY_FAIL"

        utilization = (Vd / total_design_capacity) * 100 if total_design_capacity > 0 else 0
        
        response_data = {
            "embedmentStrength_MPa": round(fh_k, 2),
            "singleDesignCapacity_kN": round(single_design_capacity, 2),
            "totalDesignCapacity_kN": round(total_design_capacity, 2), 
            "utilization_percent": round(utilization, 1),
            "status": final_status,
            "geometryStatus": geometry_status,
            "requiredGeometry": f"{round(required_width)}x{round(required_length)}mm",
            "errorMessage": geom_error_msg,
            "screwsUsed": screw_count
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": str(e)})
        }
    






