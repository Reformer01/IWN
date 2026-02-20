document.addEventListener('DOMContentLoaded', function () {
    // --- State ---
    let currentStep = 1;
    const totalSteps = 4;

    // --- Elements ---
    const form = document.getElementById('jobAppForm');
    const steps = document.querySelectorAll('.step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const indicators = document.querySelectorAll('.step-indicator .circle');

    // --- Params ---
    // Pre-fill Job Title if in URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobTitleParam = urlParams.get('job');
    if (jobTitleParam) {
        document.getElementById('jobTitle').value = decodeURIComponent(jobTitleParam);
    }

    // --- Navigation Logic ---
    function showStep(step) {
        // Hide all steps
        steps.forEach(s => s.style.display = 'none');
        steps.forEach(s => s.classList.remove('active'));

        // Show current step
        const currentStepEl = document.querySelector(`.step-${step}`);
        if (currentStepEl) {
            currentStepEl.style.display = 'block';
            setTimeout(() => currentStepEl.classList.add('active'), 10); // Fade in
        }

        // Update Buttons
        prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
        nextBtn.style.display = step === totalSteps ? 'none' : 'inline-block';
        submitBtn.style.display = step === totalSteps ? 'inline-block' : 'none';

        // Update Indicators
        indicators.forEach((ind, index) => {
            if (index + 1 === step) {
                ind.classList.add('active'); // Current
                ind.classList.remove('completed');
            } else if (index + 1 < step) {
                ind.classList.add('completed');
                ind.classList.remove('active');
            } else {
                ind.classList.remove('active', 'completed');
            }
        });

        // Scroll to top of form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function validateStep(step) {
        const currentStepEl = document.querySelector(`.step-${step}`);
        const inputs = currentStepEl.querySelectorAll('input[required], textarea[required], select[required]');
        let valid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                valid = false;
                input.classList.add('border-red-500', 'ring-1', 'ring-red-500');
            } else {
                input.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
            }
        });

        if (!valid) {
            alert('Please fill in all required fields.');
        }
        return valid;
    }

    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            currentStep++;
            showStep(currentStep);
            if (currentStep === 4) {
                generateReview();
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        currentStep--;
        showStep(currentStep);
    });

    // --- Dynamic Fields Logic ---
    let expCount = 0;
    let eduCount = 0;
    let certCount = 0;

    // Add Experience
    document.getElementById('add-experience').addEventListener('click', () => {
        expCount++;
        const container = document.getElementById('experience-list');
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative';
        div.innerHTML = `
            <button type="button" class="absolute top-2 right-2 text-slate-400 hover:text-red-500 material-symbols-outlined" onclick="this.parentElement.remove()">close</button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="experience[${expCount}][company]" placeholder="Company Name" class="w-full px-4 py-3 rounded-xl border border-slate-300">
                <input type="text" name="experience[${expCount}][role]" placeholder="Job Title" class="w-full px-4 py-3 rounded-xl border border-slate-300">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-slate-500 uppercase font-bold">Start Date</label>
                    <input type="date" name="experience[${expCount}][start]" class="w-full px-4 py-3 rounded-xl border border-slate-300">
                </div>
                <div>
                    <label class="text-xs text-slate-500 uppercase font-bold">End Date</label>
                    <input type="date" name="experience[${expCount}][end]" class="w-full px-4 py-3 rounded-xl border border-slate-300">
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Add Education
    document.getElementById('add-education').addEventListener('click', () => {
        eduCount++;
        const container = document.getElementById('education-list');
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative';
        div.innerHTML = `
            <button type="button" class="absolute top-2 right-2 text-slate-400 hover:text-red-500 material-symbols-outlined" onclick="this.parentElement.remove()">close</button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="education[${eduCount}][school]" placeholder="School/Institution" class="w-full px-4 py-3 rounded-xl border border-slate-300">
                <input type="text" name="education[${eduCount}][degree]" placeholder="Degree/Qualification" class="w-full px-4 py-3 rounded-xl border border-slate-300">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="education[${eduCount}][year]" placeholder="Year of Graduation" class="w-full px-4 py-3 rounded-xl border border-slate-300">
            </div>
        `;
        container.appendChild(div);
    });

    // Add Certificate
    document.getElementById('add-certificate').addEventListener('click', () => {
        certCount++;
        const container = document.getElementById('certificate-list');
        const div = document.createElement('div');
        div.className = 'p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative';
        div.innerHTML = `
            <button type="button" class="absolute top-2 right-2 text-slate-400 hover:text-red-500 material-symbols-outlined" onclick="this.parentElement.remove()">close</button>
            <input type="text" name="certificates[${certCount}][name]" placeholder="Certificate Name" class="w-full px-4 py-3 rounded-xl border border-slate-300">
            <input type="text" name="certificates[${certCount}][issuer]" placeholder="Issuing Organization" class="w-full px-4 py-3 rounded-xl border border-slate-300">
        `;
        container.appendChild(div);
    });


    // --- Review Step Data Generation ---
    function generateReview() {
        // Collect data
        const formData = new FormData(form);
        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = ''; // Clear previous

        // Helper to add item
        const addItem = (label, value) => {
            if (value) {
                const li = document.createElement('li');
                li.className = 'flex justify-between py-2 border-b border-slate-100 last:border-0';
                li.innerHTML = `<span class="font-semibold text-slate-600">${label}</span> <span class="text-slate-900 font-medium">${value}</span>`;
                reviewList.appendChild(li);
            }
        };

        addItem('Full Name', formData.get('full_name'));
        addItem('Email', formData.get('email'));
        addItem('Phone', formData.get('phone'));
        addItem('Job Title', formData.get('job_title'));
        addItem('Start Date', formData.get('start_date'));

        // Files
        const cv = formData.get('cv');
        if (cv && cv.name) addItem('CV', cv.name);

        const cover = formData.get('cover_letter');
        if (cover && cover.name) addItem('Cover Letter', cover.name);

        // Counts
        const expItems = document.getElementById('experience-list').children.length;
        if (expItems > 0) addItem('Experience Entries', expItems);

        const eduItems = document.getElementById('education-list').children.length;
        if (eduItems > 0) addItem('Education Entries', eduItems);
    }

    // Initialize
    showStep(currentStep);
});
