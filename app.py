from flask import Flask, render_template, request, jsonify
import pandas as pd
import re

app = Flask(__name__)

# Load CSV once at startup
df = pd.read_csv("nutritiondataset.csv")

# Helper functions
def height_to_meters(ft_in):
    """Convert height in ft.in (e.g., 5.7 -> 5 feet 7 inches) to meters"""
    feet = int(ft_in)
    inches = round((ft_in - feet) * 10)  # decimal part as inches
    total_inches = feet * 12 + inches
    return total_inches * 0.0254

def calculate_bmi(weight, height_m):
    if height_m <= 0:
        return 0
    return round(weight / (height_m ** 2), 1)

def classify_bmi(bmi):
    if bmi < 18.5:
        return "Slim"
    elif 18.5 <= bmi < 25:
        return "Fit"
    else:
        return "Obese"

def extract_numeric(value_str):
    match = re.search(r"[\d.]+", str(value_str))
    return float(match.group()) if match else 0.0

def calculate_macros(weight, bmi_category):
    if bmi_category == "Slim":
        protein = round(weight * 2.5)
        carbs = round(weight * 6.0)
        fibre = round(weight * 0.1)
    elif bmi_category == "Fit":
        protein = round(weight * 1.8)
        carbs = round(weight * 4.0)
        fibre = round(weight * 0.5)
    else:  # Obese
        protein = round(weight * 1.5)
        carbs = round(weight * 2.0)
        fibre = round(weight * 1.5)
    return {"Protein": protein, "Carbs": carbs, "Fibre": fibre}

def generate_meal_plan(selected_foods, macros_needed):
    plan = {}
    for nutrient in ['Protein','Carbs','Fibre']:
        foods = df[df['Nutrition Type']==nutrient]
        sel = selected_foods.get(nutrient)
        if sel and len(sel) > 0:
            foods = foods[foods['Food Name'].isin(sel)]
        nutrient_needed = macros_needed[nutrient]
        plan_list = []

        for _, row in foods.iterrows():
            food = row['Food Name']
            value = extract_numeric(row['Nutrition Value'])
            if value <= 0:
                qty = 0
            else:
                qty = round(nutrient_needed / value * 100, 1)

            if nutrient == "Fibre":
                if qty < 10:
                    portions = 3
                elif 10 <= qty <= 20:
                    portions = 2
                else:
                    portions = 1
                plan_list.append(f"{food}: {portions} per meal")
            else:
                plan_list.append(f"{food}: {qty}g")
        plan[nutrient] = plan_list
    return plan

# Routes
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/step1", methods=["POST"])
def step1():
    data = request.form
    weight = int(data.get("weight"))
    height_ft_in = float(data.get("height"))

    height_m = height_to_meters(height_ft_in)
    bmi = calculate_bmi(weight, height_m)
    classification = classify_bmi(bmi)

    # Return BMI + classification + weight + height for Step 3
    return jsonify({
        "bmi": bmi,
        "classification": classification,
        "weight": weight,
        "height": height_ft_in
    })

@app.route("/step2", methods=["POST"])
def step2():
    budget = request.form.get("budget")
    protein = df[(df['Nutrition Type']=='Protein') & (df['Budget'].str.lower()==budget.lower())]['Food Name'].tolist()
    carbs = df[(df['Nutrition Type']=='Carbs') & (df['Budget'].str.lower()==budget.lower())]['Food Name'].tolist()
    fibre = df[(df['Nutrition Type']=='Fibre') & (df['Budget'].str.lower()==budget.lower())]['Food Name'].tolist()
    return jsonify({"Protein": protein, "Carbs": carbs, "Fibre": fibre})

@app.route("/step3", methods=["POST"])
def step3():
    data = request.get_json()
    selected_foods = {
        "Protein": data.get("Protein", []),
        "Carbs": data.get("Carbs", []),
        "Fibre": data.get("Fibre", [])
    }
    weight = int(data.get("weight"))
    height_ft_in = float(data.get("height"))

    height_m = height_to_meters(height_ft_in)
    bmi = calculate_bmi(weight, height_m)
    bmi_category = classify_bmi(bmi)
    macros_needed = calculate_macros(weight, bmi_category)
    meal_plan = generate_meal_plan(selected_foods, macros_needed)

    return jsonify({
        "bmi": bmi,
        "bmi_category": bmi_category,
        "macros_needed": macros_needed,
        "meal_plan": meal_plan
    })

if __name__ == "__main__":
    app.run(debug=True)