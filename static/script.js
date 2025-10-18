document.addEventListener("DOMContentLoaded", function() {

    // Step 1 elements
    const step1Form = document.getElementById("step1-form");
    const step1Submit = document.getElementById("step1-submit");
    const heightInput = document.getElementById("height");
    const weightInput = document.getElementById("weight");
    const genderInputs = document.getElementsByName("gender");

    // Step 2 elements
    const step2Form = document.getElementById("step2-form");
    const step2Submit = document.getElementById("step2-submit");
    const budgetInputs = document.getElementsByName("budget");

    // Step 3 elements
    const step3Form = document.getElementById("step3-form");
    const proteinContainer = document.getElementById("protein-container");
    const carbsContainer = document.getElementById("carbs-container");
    const fibreContainer = document.getElementById("fibre-container");

    // Result elements
    const resultDiv = document.getElementById("result");
    const bmiResultDiv = document.getElementById("bmi-result");
    const mealPlanDiv = document.getElementById("meal-plan");
    const heading = document.getElementById("heading");

    // Store user weight & height for Step 3
    let userWeight = 0;
    let userHeight = 0;

    // Clamp height on blur (user finished typing)
    heightInput.addEventListener("blur", function() {
        let val = parseFloat(this.value);
        if (isNaN(val)) return;
        if (val < 4) val = 4;
        if (val > 7.11) val = 7.11; // max 7.11
        this.value = val; // assign raw value
    });

    // Enable Step 1 submit only when all inputs filled
    function checkStep1Inputs() {
        let genderChecked = Array.from(genderInputs).some(r => r.checked);
        step1Submit.disabled = !(heightInput.value && weightInput.value && genderChecked);
    }

    heightInput.addEventListener("input", checkStep1Inputs);
    weightInput.addEventListener("input", checkStep1Inputs);
    genderInputs.forEach(r => r.addEventListener("change", checkStep1Inputs));

    // Step 1 submit
    step1Form.addEventListener("submit", function(e){
        e.preventDefault();
        const formData = new FormData(step1Form);
        fetch("/step1", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            bmiResultDiv.innerHTML =`BMI: ${data.bmi} | Classification: ${data.classification}`;

            // Store weight & height for Step 3
            userWeight = data.weight;
            userHeight = data.height;

            step1Form.style.display = "none";
            step2Form.style.display = "block";
            heading.innerText = "Select Your Budget Preferences";
        });
    });

    // Step 2 submit
    function checkStep2Inputs() {
        let budgetChecked = Array.from(budgetInputs).some(r => r.checked);
        step2Submit.disabled = !budgetChecked;
    }
    budgetInputs.forEach(r => r.addEventListener("change", checkStep2Inputs));

    step2Form.addEventListener("submit", function(e){
        e.preventDefault();
        let selectedBudget = Array.from(budgetInputs).find(r => r.checked).value;
        let formData = new FormData();
        formData.append("budget", selectedBudget);

        fetch("/step2", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            function populateMCQ(container, items) {
                container.innerHTML = "";
                items.forEach(item => {
                    let id = container.id + "-" + item.replace(/\s+/g,"-");
                    let wrapper = document.createElement("div");
                    wrapper.classList.add("checkbox-item");

                    let input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = id;
                    input.value = item;

                    let label = document.createElement("label");
                    label.htmlFor = id;
                    label.innerText = item;

                    wrapper.appendChild(input);
                    wrapper.appendChild(label);
                    container.appendChild(wrapper);
                });
            }

            populateMCQ(proteinContainer, data.Protein);
            populateMCQ(carbsContainer, data.Carbs);
            populateMCQ(fibreContainer, data.Fibre);

            step2Form.style.display = "none";
            step3Form.style.display = "block";
            heading.innerText = "Select What You Prefer to Eat";
        });
    });

    // Step 3 submit
    step3Form.addEventListener("submit", function(e){
        e.preventDefault();

        function getSelected(container) {
            return Array.from(container.querySelectorAll("input[type=checkbox]:checked"))
                        .map(chk => chk.value);
        }

        let selectedFoods = {
            Protein: getSelected(proteinContainer),
            Carbs: getSelected(carbsContainer),
            Fibre: getSelected(fibreContainer),
            weight: userWeight,
            height: userHeight
        };

        fetch("/step3", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selectedFoods)
        })
        .then(res => res.json())
        .then(data => {
            step3Form.style.display = "none";
            heading.innerText = "Your Meal Plan";
            resultDiv.style.display = "block";

            let html = `<p><strong>Macros Needed:</strong></p>
                        <ul>
                        <li>Protein: ${data.macros_needed.Protein}g</li>
                        <li>Carbs: ${data.macros_needed.Carbs}g</li>
                        <li>Fibre: ${data.macros_needed.Fibre}g</li>
                        </ul>`;

            html += `<p><strong>Suggested Foods:</strong></p><ul>`;
            for (let nutrient of ['Protein','Carbs','Fibre']) {
                html += `<li>${nutrient}:<ul>`;
                data.meal_plan[nutrient].forEach(item => {
                    html +=` <li>${item}</li>`;
                });
                html +=` </ul></li>`;
            }
            html += `</ul>`;
            mealPlanDiv.innerHTML = html;
        });
    });

});